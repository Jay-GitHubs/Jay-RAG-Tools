use crate::config::ProcessingConfig;
use crate::error::{CoreError, CoreResult};
use crate::metadata::{ImageMetadata, ImageType};
use crate::pdf::{ExtractedImage, PdfEngine};
use crate::progress::ProgressReporter;
use crate::prompts::get_prompts;
use crate::provider::VisionProvider;

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::Semaphore;
use tokio::task::JoinSet;

/// Truncate a string to at most `max_bytes` bytes, ensuring the cut
/// lands on a valid UTF-8 char boundary (safe for Thai multi-byte text).
fn truncate_str(s: &str, max_bytes: usize) -> &str {
    if s.len() <= max_bytes {
        return s;
    }
    let mut end = max_bytes;
    while end > 0 && !s.is_char_boundary(end) {
        end -= 1;
    }
    &s[..end]
}

/// Clean up raw pdfium text for better RAG quality.
///
/// Joins broken lines, normalizes whitespace, and preserves paragraph boundaries.
fn cleanup_extracted_text(text: &str) -> String {
    if text.is_empty() {
        return String::new();
    }

    let raw_lines: Vec<&str> = text.split('\n').collect();
    let mut paragraphs: Vec<String> = Vec::new();
    let mut current_para = String::new();

    for line in &raw_lines {
        let trimmed = line.trim();

        // Empty line = paragraph boundary
        if trimmed.is_empty() {
            if !current_para.is_empty() {
                paragraphs.push(current_para.clone());
                current_para.clear();
            }
            continue;
        }

        // Normalize internal whitespace (collapse runs of 2+ spaces to single space)
        // But skip lines that look like tables (3+ columns separated by whitespace)
        let normalized = if looks_like_table_line(trimmed) {
            trimmed.to_string()
        } else {
            trimmed.split_whitespace().collect::<Vec<_>>().join(" ")
        };

        // Decide whether to join with previous line or start a new line
        if current_para.is_empty() {
            current_para = normalized;
        } else if should_break_before(&normalized) || should_break_after(&current_para) {
            // Keep the break — start a new line within the paragraph
            current_para.push('\n');
            current_para.push_str(&normalized);
        } else {
            // Join with previous line
            current_para.push(' ');
            current_para.push_str(&normalized);
        }
    }

    if !current_para.is_empty() {
        paragraphs.push(current_para);
    }

    paragraphs.join("\n\n")
}

/// Check if a line looks like it's part of a table (has 3+ whitespace-separated columns).
fn looks_like_table_line(line: &str) -> bool {
    // Count segments separated by 2+ spaces
    let segments: Vec<&str> = line.split("  ").filter(|s| !s.trim().is_empty()).collect();
    segments.len() >= 3
}

/// Check if a new line should NOT be joined to the previous one.
fn should_break_before(line: &str) -> bool {
    let first_char = line.chars().next().unwrap_or(' ');
    // Bullet points, numbered lists, markdown headers
    line.starts_with("- ")
        || line.starts_with("* ")
        || line.starts_with("• ")
        || line.starts_with("# ")
        || line.starts_with("> ")
        || (first_char.is_ascii_digit() && line.contains(". "))
}

/// Check if the current paragraph line signals the end of a logical unit.
fn should_break_after(line: &str) -> bool {
    if line.is_empty() {
        return false;
    }
    let last_char = line.chars().last().unwrap_or(' ');
    // Sentence-ending punctuation (including Thai markers)
    matches!(last_char, '.' | '!' | '?' | ':' | 'ๆ' | '।')
        || line.ends_with("ครับ")
        || line.ends_with("ค่ะ")
        || line.ends_with("นะคะ")
        || line.ends_with("นะครับ")
}

/// Detect repeated text across pages (headers/footers) and strip it.
fn strip_headers_footers(page_texts: &mut [(u32, String)]) {
    if page_texts.len() < 3 {
        return;
    }

    let total = page_texts.len();
    let threshold = (total as f64 * 0.6).ceil() as usize;

    // Collect first 3 and last 3 lines of each page
    let mut first_lines: HashMap<String, usize> = HashMap::new();
    let mut last_lines: HashMap<String, usize> = HashMap::new();

    for (_, text) in page_texts.iter() {
        let lines: Vec<&str> = text.lines().collect();

        // First 3 lines (potential headers)
        for line in lines.iter().take(3) {
            let trimmed = line.trim().to_string();
            if !trimmed.is_empty() && trimmed.len() < 200 {
                *first_lines.entry(trimmed).or_insert(0) += 1;
            }
        }

        // Last 3 lines (potential footers)
        for line in lines.iter().rev().take(3) {
            let trimmed = line.trim().to_string();
            if !trimmed.is_empty() && trimmed.len() < 200 {
                *last_lines.entry(trimmed).or_insert(0) += 1;
            }
        }
    }

    // Identify headers and footers (appear in >60% of pages)
    let headers: Vec<String> = first_lines
        .into_iter()
        .filter(|(_, count)| *count >= threshold)
        .map(|(line, _)| line)
        .collect();

    let footers: Vec<String> = last_lines
        .into_iter()
        .filter(|(_, count)| *count >= threshold)
        .map(|(line, _)| line)
        .collect();

    if headers.is_empty() && footers.is_empty() {
        return;
    }

    tracing::info!(
        "Detected {} header(s) and {} footer(s) to strip",
        headers.len(),
        footers.len()
    );

    // Strip them from all pages
    for (_, text) in page_texts.iter_mut() {
        let lines: Vec<&str> = text.lines().collect();
        let filtered: Vec<&str> = lines
            .into_iter()
            .filter(|line| {
                let trimmed = line.trim();
                !headers.iter().any(|h| h == trimmed) && !footers.iter().any(|f| f == trimmed)
            })
            .collect();
        *text = filtered.join("\n").trim().to_string();
    }
}

/// Result of processing a single PDF.
pub struct ProcessingResult {
    /// Path to the output enriched Markdown file.
    pub markdown_path: PathBuf,
    /// Path to the output image metadata JSON file.
    pub metadata_path: PathBuf,
    /// Number of images processed.
    pub image_count: u32,
}

/// Result of processing a single page (returned from async page processing).
struct PageResult {
    page_num: u32,
    content: String,
    metadata: Vec<ImageMetadata>,
}

/// Data extracted synchronously from a PDF page before async LLM calls.
enum PageData {
    /// Strategy A: Image-heavy page rendered as full image (hybrid: also includes pdfium text).
    FullPage {
        img_b64: String,
        img_bytes: Vec<u8>,
        img_filename: String,
        coverage: f64,
        pdfium_text: String,
    },
    /// Strategy B: Mixed page with text and individual images.
    Mixed {
        text: String,
        images: Vec<ExtractedImage>,
        table_candidate: bool,
        table_img: Option<(String, Vec<u8>, String)>,
    },
}

/// Extract all data from a page synchronously (no await points).
fn extract_page_data(
    doc: &pdfium_render::prelude::PdfDocument<'_>,
    page_num: u32,
    doc_stem: &str,
    config: &ProcessingConfig,
) -> CoreResult<PageData> {
    let page = doc.pages().get(page_num as u16).map_err(|e| {
        CoreError::Pdf(format!("Failed to get page {}: {e}", page_num + 1))
    })?;

    let coverage = PdfEngine::get_image_coverage(&page);
    // Strategy A: Image-heavy page (hybrid: also extract text)
    if coverage >= config.page_as_image_threshold {
        let (img_b64, img_bytes) = PdfEngine::render_page_as_image(&page, config.image_dpi)?;
        let img_filename = format!("{doc_stem}_page_{:03}_full.png", page_num + 1);
        let text = PdfEngine::extract_page_text(&page);
        let text = cleanup_extracted_text(&text);

        Ok(PageData::FullPage {
            img_b64,
            img_bytes,
            img_filename,
            coverage,
            pdfium_text: text,
        })
    }
    // Strategy B: Mixed page
    else {
        let text = PdfEngine::extract_page_text(&page);
        let text = cleanup_extracted_text(&text);
        let images = PdfEngine::extract_page_images(&page, config.min_image_size)?;

        // Table detection (check if text looks tabular)
        let table_candidate = config.table_extraction && crate::table::looks_like_table(&text);
        let table_img = if table_candidate {
            let (b64, bytes) = PdfEngine::render_page_as_image(&page, config.image_dpi)?;
            let filename = format!("{doc_stem}_page_{:03}_table.png", page_num + 1);
            Some((b64, bytes, filename))
        } else {
            None
        };

        Ok(PageData::Mixed {
            text,
            images,
            table_candidate,
            table_img,
        })
    }
}

/// Process a single page asynchronously with LLM calls.
///
/// Returns a `PageResult` with content and metadata (no shared mutable state).
async fn process_page_async(
    page_data: PageData,
    page_num: u32,
    provider: Arc<dyn VisionProvider>,
    images_dir: PathBuf,
    doc_stem: String,
    config: ProcessingConfig,
    reporter: Arc<dyn ProgressReporter>,
) -> CoreResult<PageResult> {
    let prompts = get_prompts(config.language);
    let page_label = format!("Page {}", page_num + 1);
    let mut lines = vec![format!("\n\n---\n## {page_label}\n")];
    let mut metadata = Vec::new();

    match page_data {
        PageData::FullPage {
            img_b64,
            img_bytes,
            img_filename,
            coverage,
            pdfium_text,
        } => {
            tracing::info!(
                "[Page {}] image-heavy ({:.0}%) — full page render (hybrid)",
                page_num + 1,
                coverage * 100.0
            );

            let img_path = images_dir.join(&img_filename);
            tokio::fs::create_dir_all(img_path.parent().unwrap()).await?;
            tokio::fs::write(&img_path, &img_bytes).await?;

            let description = match provider
                .ask(&img_b64, prompts.full_page, config.max_retries)
                .await
            {
                Ok(desc) => desc,
                Err(e) => {
                    reporter.on_error(page_num + 1, &format!("{e}"));
                    tracing::warn!("Full-page description failed on page {}: {e}", page_num + 1);
                    format!("[ไม่สามารถอธิบายภาพได้: {e}]")
                }
            };

            let image_ref = format!("{doc_stem}/{img_filename}");

            metadata.push(ImageMetadata {
                image_file: image_ref.clone(),
                page: page_num + 1,
                index: None,
                image_type: ImageType::FullPage,
                width: None,
                height: None,
                description: description.clone(),
                source_doc: doc_stem.clone(),
                provider: provider.provider_name().to_string(),
                model: provider.model_name().to_string(),
            });

            reporter.on_image_processed(
                page_num + 1,
                1,
                truncate_str(&description, 80),
            );

            // Strategy A hybrid: include pdfium text alongside LLM description
            if !pdfium_text.is_empty() {
                lines.push(pdfium_text);
                lines.push(String::new());
            }
            lines.push(format!("[IMAGE:{image_ref}]\n"));
            lines.push(description);
        }

        PageData::Mixed {
            text,
            images,
            table_candidate,
            table_img,
        } => {
            // When table detected, skip raw text — the LLM full-page extraction
            // will include both regular text and properly formatted tables
            if !table_candidate && !text.is_empty() {
                lines.push(text);
            }

            // Table extraction
            if table_candidate {
                if let Some((b64, bytes, filename)) = table_img {
                    tracing::info!(
                        "[Page {}] Table-like content detected — extracting",
                        page_num + 1
                    );

                    let img_path = images_dir.join(&filename);
                    tokio::fs::create_dir_all(img_path.parent().unwrap()).await?;
                    tokio::fs::write(&img_path, &bytes).await?;

                    let description = match provider
                        .ask(&b64, prompts.table_extraction, config.max_retries)
                        .await
                    {
                        Ok(desc) => desc,
                        Err(e) => {
                            reporter.on_error(page_num + 1, &format!("{e}"));
                            tracing::warn!(
                                "Table extraction failed on page {}: {e}",
                                page_num + 1
                            );
                            format!("[ไม่สามารถแปลงตารางได้: {e}]")
                        }
                    };

                    let image_ref = format!("{doc_stem}/{filename}");

                    metadata.push(ImageMetadata {
                        image_file: image_ref.clone(),
                        page: page_num + 1,
                        index: None,
                        image_type: ImageType::TableRegion,
                        width: None,
                        height: None,
                        description: description.clone(),
                        source_doc: doc_stem.clone(),
                        provider: provider.provider_name().to_string(),
                        model: provider.model_name().to_string(),
                    });

                    lines.push(format!("\n[IMAGE:{image_ref}]\n\n{description}\n"));
                }
            }

            // Extract individual images (concurrently)
            if !images.is_empty() {
                tracing::info!(
                    "[Page {}] {} image(s) — saving & describing concurrently",
                    page_num + 1,
                    images.len()
                );

                let img_semaphore = Arc::new(Semaphore::new(config.max_concurrent_images));
                let mut img_join_set = JoinSet::new();

                for img in images {
                    let permit = img_semaphore.clone().acquire_owned().await.unwrap();
                    let provider = provider.clone();
                    let prompt = prompts.single_image.to_string();
                    let images_dir = images_dir.clone();
                    let doc_stem = doc_stem.clone();
                    let max_retries = config.max_retries;
                    let page_num = page_num;
                    let reporter = reporter.clone();

                    img_join_set.spawn(async move {
                        let _permit = permit;

                        let img_filename = format!(
                            "{doc_stem}_page_{:03}_img{}.png",
                            page_num + 1,
                            img.index
                        );
                        let img_path = images_dir.join(&img_filename);

                        tokio::fs::create_dir_all(img_path.parent().unwrap()).await?;
                        tokio::fs::write(&img_path, &img.bytes).await?;

                        let description = match provider.ask(&img.base64, &prompt, max_retries).await
                        {
                            Ok(desc) => desc,
                            Err(e) => {
                                reporter.on_error(page_num + 1, &format!("{e}"));
                                tracing::warn!(
                                    "Image description failed on page {} img {}: {e}",
                                    page_num + 1,
                                    img.index
                                );
                                format!("[ไม่สามารถอธิบายภาพได้: {e}]")
                            }
                        };

                        let image_ref = format!("{doc_stem}/{img_filename}");

                        let meta = ImageMetadata {
                            image_file: image_ref.clone(),
                            page: page_num + 1,
                            index: Some(img.index),
                            image_type: ImageType::ExtractedImage,
                            width: Some(img.width),
                            height: Some(img.height),
                            description: description.clone(),
                            source_doc: doc_stem.clone(),
                            provider: provider.provider_name().to_string(),
                            model: provider.model_name().to_string(),
                        };

                        reporter.on_image_processed(
                            page_num + 1,
                            img.index,
                            truncate_str(&description, 80),
                        );

                        Ok::<_, CoreError>((img.index, image_ref, description, meta))
                    });
                }

                // Collect image results and sort by index
                let mut img_results = Vec::new();
                while let Some(result) = img_join_set.join_next().await {
                    match result {
                        Ok(Ok(img_result)) => img_results.push(img_result),
                        Ok(Err(e)) => {
                            tracing::error!("Image task error on page {}: {e}", page_num + 1);
                        }
                        Err(e) => {
                            tracing::error!("Image task panicked on page {}: {e}", page_num + 1);
                        }
                    }
                }

                // Sort by image index to maintain order
                img_results.sort_by_key(|(idx, _, _, _)| *idx);

                for (idx, image_ref, description, meta) in img_results {
                    metadata.push(meta);
                    lines.push(format!(
                        "\n[IMAGE:{image_ref}]\n**[ภาพที่ {idx}]:** {description}\n"
                    ));
                }
            }
        }
    }

    Ok(PageResult {
        page_num,
        content: lines.join("\n"),
        metadata,
    })
}

/// Process an entire PDF file.
///
/// All pdfium operations happen synchronously (in spawn_blocking),
/// then async LLM calls are made concurrently for each page's extracted data.
pub async fn process_pdf(
    pdf_path: &Path,
    output_dir: &Path,
    provider: Option<Arc<dyn VisionProvider>>,
    config: &ProcessingConfig,
    reporter: Arc<dyn ProgressReporter>,
    start_page: Option<u32>,
    end_page: Option<u32>,
) -> CoreResult<ProcessingResult> {
    let doc_stem = pdf_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("document")
        .to_string();

    // Text-only mode: extract text only, no images, no LLM calls
    if config.text_only {
        return process_pdf_text_only(
            pdf_path, output_dir, &doc_stem, config, reporter.as_ref(), start_page, end_page,
        )
        .await;
    }

    let provider = provider.ok_or_else(|| {
        CoreError::Config("Vision LLM provider required when text_only is false".into())
    })?;

    let images_dir = output_dir.join("images").join(&doc_stem);
    tokio::fs::create_dir_all(&images_dir).await?;

    // Extract all page data synchronously in a blocking task
    let pdf_path_owned = pdf_path.to_path_buf();
    let config_clone = config.clone();
    let doc_stem_clone = doc_stem.clone();

    let page_data_results: Vec<(u32, CoreResult<PageData>)> =
        tokio::task::spawn_blocking(move || {
            let engine = PdfEngine::new()?;
            let doc = engine.open_document(&pdf_path_owned)?;
            let total_pages = PdfEngine::page_count(&doc);

            let start = start_page.unwrap_or(0);
            let end = end_page.unwrap_or(total_pages).min(total_pages);

            tracing::info!(
                "Processing: {} | Pages: {}-{} (of {})",
                doc_stem_clone,
                start + 1,
                end,
                total_pages
            );

            let mut results = Vec::new();
            for page_num in start..end {
                let data = extract_page_data(&doc, page_num, &doc_stem_clone, &config_clone);
                results.push((page_num, data));
            }

            Ok::<_, CoreError>(results)
        })
        .await
        .map_err(|e| CoreError::Pdf(format!("Blocking task panicked: {e}")))?
        ?;

    let total_pages = page_data_results.len() as u32;
    reporter.on_pdf_start(&doc_stem, total_pages);

    let mut all_content = vec![
        format!("# {doc_stem}\n"),
        format!(
            "> Provider: `{}` | Model: `{}` | Pages: {total_pages}\n",
            provider.provider_name(),
            provider.model_name()
        ),
        format!("> Images: `images/{doc_stem}/`\n"),
    ];
    let mut metadata_catalog: Vec<ImageMetadata> = Vec::new();

    // Process pages concurrently with semaphore
    let page_semaphore = Arc::new(Semaphore::new(config.max_concurrent_pages));
    let mut join_set = JoinSet::new();

    for (page_num, page_data_result) in page_data_results {
        let permit = page_semaphore.clone().acquire_owned().await.unwrap();
        let images_dir = images_dir.clone();
        let doc_stem = doc_stem.clone();
        let config = config.clone();
        let provider = provider.clone();
        let reporter = reporter.clone();

        join_set.spawn(async move {
            let _permit = permit;
            reporter.on_page_start(page_num + 1, total_pages);

            let result = match page_data_result {
                Ok(page_data) => {
                    process_page_async(
                        page_data,
                        page_num,
                        provider,
                        images_dir,
                        doc_stem,
                        config,
                        reporter.clone(),
                    )
                    .await
                }
                Err(e) => Ok(PageResult {
                    page_num,
                    content: format!(
                        "\n\n---\n## Page {}\n[Error: {e}]\n",
                        page_num + 1
                    ),
                    metadata: vec![],
                }),
            };

            reporter.on_page_complete(page_num + 1, total_pages);
            result
        });
    }

    // Collect results
    let mut page_results: Vec<PageResult> = Vec::new();
    while let Some(result) = join_set.join_next().await {
        match result {
            Ok(Ok(page_result)) => page_results.push(page_result),
            Ok(Err(e)) => {
                tracing::error!("Page processing error: {e}");
                // We don't know the page_num here, but we log the error
            }
            Err(e) => {
                tracing::error!("Page task panicked: {e}");
            }
        }
    }

    // Sort by page number to maintain order
    page_results.sort_by_key(|r| r.page_num);

    // Assemble content and metadata
    for pr in &page_results {
        all_content.push(pr.content.clone());
        metadata_catalog.extend(pr.metadata.iter().cloned());
    }

    // Save outputs
    let md_path = output_dir.join(format!("{doc_stem}_enriched.md"));
    let meta_path = output_dir.join(format!("{doc_stem}_images_metadata.json"));

    let markdown_content = all_content.join("\n");
    tokio::fs::write(&md_path, &markdown_content).await?;

    let metadata_json = serde_json::to_string_pretty(&metadata_catalog)?;
    tokio::fs::write(&meta_path, &metadata_json).await?;

    let image_count = metadata_catalog.len() as u32;
    reporter.on_pdf_complete(&doc_stem, image_count);

    tracing::info!(
        "Markdown: {} ({:.1} KB)",
        md_path.display(),
        markdown_content.len() as f64 / 1024.0
    );
    tracing::info!("Metadata: {} ({} images)", meta_path.display(), image_count);

    Ok(ProcessingResult {
        markdown_path: md_path,
        metadata_path: meta_path,
        image_count,
    })
}

/// Text-only processing: extract text via pdfium only, no images, no LLM calls.
async fn process_pdf_text_only(
    pdf_path: &Path,
    output_dir: &Path,
    doc_stem: &str,
    config: &ProcessingConfig,
    reporter: &dyn ProgressReporter,
    start_page: Option<u32>,
    end_page: Option<u32>,
) -> CoreResult<ProcessingResult> {
    let pdf_path_owned = pdf_path.to_path_buf();
    let doc_stem_clone = doc_stem.to_string();

    let mut page_texts: Vec<(u32, String)> = tokio::task::spawn_blocking(move || {
        let engine = PdfEngine::new()?;
        let doc = engine.open_document(&pdf_path_owned)?;
        let total_pages = PdfEngine::page_count(&doc);

        let start = start_page.unwrap_or(0);
        let end = end_page.unwrap_or(total_pages).min(total_pages);

        tracing::info!(
            "Text-only processing: {} | Pages: {}-{} (of {})",
            doc_stem_clone,
            start + 1,
            end,
            total_pages
        );

        let mut results = Vec::new();
        for page_num in start..end {
            let page = doc.pages().get(page_num as u16).map_err(|e| {
                CoreError::Pdf(format!("Failed to get page {}: {e}", page_num + 1))
            })?;
            let text = PdfEngine::extract_page_text(&page);
            let text = cleanup_extracted_text(&text);
            results.push((page_num, text));
        }

        Ok::<_, CoreError>(results)
    })
    .await
    .map_err(|e| CoreError::Pdf(format!("Blocking task panicked: {e}")))?
    ?;

    // Strip repeated headers/footers
    strip_headers_footers(&mut page_texts);

    let total_pages = page_texts.len() as u32;
    reporter.on_pdf_start(doc_stem, total_pages);

    let lang_label = match config.language {
        crate::config::Language::Th => "th",
        crate::config::Language::En => "en",
    };

    let mut all_content = vec![
        format!("# {doc_stem}\n"),
        format!("> Mode: `text-only` | Language: `{lang_label}` | Pages: {total_pages}\n"),
    ];

    for (page_num, text) in &page_texts {
        reporter.on_page_start(page_num + 1, total_pages);

        let mut lines = vec![format!("\n\n---\n## Page {}\n", page_num + 1)];
        if !text.is_empty() {
            lines.push(text.clone());
        }
        all_content.push(lines.join("\n"));

        reporter.on_page_complete(page_num + 1, total_pages);
    }

    // Save outputs
    let md_path = output_dir.join(format!("{doc_stem}_enriched.md"));
    let meta_path = output_dir.join(format!("{doc_stem}_images_metadata.json"));

    let markdown_content = all_content.join("\n");
    tokio::fs::write(&md_path, &markdown_content).await?;

    // Empty metadata for text-only mode
    tokio::fs::write(&meta_path, "[]").await?;

    reporter.on_pdf_complete(doc_stem, 0);

    tracing::info!(
        "Text-only markdown: {} ({:.1} KB)",
        md_path.display(),
        markdown_content.len() as f64 / 1024.0
    );

    Ok(ProcessingResult {
        markdown_path: md_path,
        metadata_path: meta_path,
        image_count: 0,
    })
}

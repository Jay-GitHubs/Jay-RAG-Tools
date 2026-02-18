use crate::config::ProcessingConfig;
use crate::error::{CoreError, CoreResult};
use crate::metadata::{ImageMetadata, ImageType};
use crate::pdf::{ExtractedImage, PdfEngine};
use crate::progress::ProgressReporter;
use crate::prompts::get_prompts;
use crate::provider::VisionProvider;

use std::path::{Path, PathBuf};

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

/// Result of processing a single PDF.
pub struct ProcessingResult {
    /// Path to the output enriched Markdown file.
    pub markdown_path: PathBuf,
    /// Path to the output image metadata JSON file.
    pub metadata_path: PathBuf,
    /// Number of images processed.
    pub image_count: u32,
}

/// Data extracted synchronously from a PDF page before async LLM calls.
enum PageData {
    /// Strategy A: Image-heavy page rendered as full image.
    FullPage {
        img_b64: String,
        img_bytes: Vec<u8>,
        img_filename: String,
        coverage: f64,
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
    // Strategy A: Image-heavy page
    if coverage >= config.page_as_image_threshold {
        let (img_b64, img_bytes) = PdfEngine::render_page_as_image(&page, config.image_dpi)?;
        let img_filename = format!("{doc_stem}_page_{:03}_full.png", page_num + 1);

        Ok(PageData::FullPage {
            img_b64,
            img_bytes,
            img_filename,
            coverage,
        })
    }
    // Strategy B: Mixed page
    else {
        let text = PdfEngine::extract_page_text(&page);
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

/// Process a single page: first extract data synchronously, then make async LLM calls.
async fn process_page_async(
    page_data: PageData,
    page_num: u32,
    provider: &dyn VisionProvider,
    images_dir: &Path,
    doc_stem: &str,
    metadata_catalog: &mut Vec<ImageMetadata>,
    config: &ProcessingConfig,
    reporter: &dyn ProgressReporter,
) -> CoreResult<String> {
    let prompts = get_prompts(config.language);
    let page_label = format!("Page {}", page_num + 1);
    let mut lines = vec![format!("\n\n---\n## {page_label}\n")];

    match page_data {
        PageData::FullPage {
            img_b64,
            img_bytes,
            img_filename,
            coverage,
        } => {
            tracing::info!(
                "[Page {}] image-heavy ({:.0}%) — full page render",
                page_num + 1,
                coverage * 100.0
            );

            let img_path = images_dir.join(&img_filename);
            tokio::fs::create_dir_all(img_path.parent().unwrap()).await?;
            tokio::fs::write(&img_path, &img_bytes).await?;

            let description = provider
                .ask(&img_b64, prompts.full_page, config.max_retries)
                .await?;

            metadata_catalog.push(ImageMetadata {
                image_file: img_filename.clone(),
                page: page_num + 1,
                index: None,
                image_type: ImageType::FullPage,
                width: None,
                height: None,
                description: description.clone(),
                source_doc: doc_stem.to_string(),
                provider: provider.provider_name().to_string(),
                model: provider.model_name().to_string(),
            });

            reporter.on_image_processed(
                page_num + 1,
                1,
                truncate_str(&description, 80),
            );

            lines.push(format!("[IMAGE:{img_filename}]\n"));
            lines.push(description);
        }

        PageData::Mixed {
            text,
            images,
            table_candidate,
            table_img,
        } => {
            if !text.is_empty() {
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

                    let description = provider
                        .ask(&b64, prompts.table_extraction, config.max_retries)
                        .await?;

                    metadata_catalog.push(ImageMetadata {
                        image_file: filename.clone(),
                        page: page_num + 1,
                        index: None,
                        image_type: ImageType::TableRegion,
                        width: None,
                        height: None,
                        description: description.clone(),
                        source_doc: doc_stem.to_string(),
                        provider: provider.provider_name().to_string(),
                        model: provider.model_name().to_string(),
                    });

                    lines.push(format!("\n[IMAGE:{filename}]\n\n{description}\n"));
                }
            }

            // Extract individual images
            if !images.is_empty() {
                tracing::info!(
                    "[Page {}] {} image(s) — saving & describing",
                    page_num + 1,
                    images.len()
                );
            }

            for img in &images {
                let img_filename = format!(
                    "{doc_stem}_page_{:03}_img{}.png",
                    page_num + 1,
                    img.index
                );
                let img_path = images_dir.join(&img_filename);

                tokio::fs::create_dir_all(img_path.parent().unwrap()).await?;
                tokio::fs::write(&img_path, &img.bytes).await?;

                let description = provider
                    .ask(&img.base64, prompts.single_image, config.max_retries)
                    .await?;

                metadata_catalog.push(ImageMetadata {
                    image_file: img_filename.clone(),
                    page: page_num + 1,
                    index: Some(img.index),
                    image_type: ImageType::ExtractedImage,
                    width: Some(img.width),
                    height: Some(img.height),
                    description: description.clone(),
                    source_doc: doc_stem.to_string(),
                    provider: provider.provider_name().to_string(),
                    model: provider.model_name().to_string(),
                });

                reporter.on_image_processed(
                    page_num + 1,
                    img.index,
                    truncate_str(&description, 80),
                );

                lines.push(format!(
                    "\n[IMAGE:{img_filename}]\n**[ภาพที่ {}]:** {description}\n",
                    img.index
                ));
            }
        }
    }

    Ok(lines.join("\n"))
}

/// Process an entire PDF file.
///
/// All pdfium operations happen synchronously (in spawn_blocking if needed),
/// then async LLM calls are made for each page's extracted data.
pub async fn process_pdf(
    pdf_path: &Path,
    output_dir: &Path,
    provider: &dyn VisionProvider,
    config: &ProcessingConfig,
    reporter: &dyn ProgressReporter,
    start_page: Option<u32>,
    end_page: Option<u32>,
) -> CoreResult<ProcessingResult> {
    let doc_stem = pdf_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("document")
        .to_string();

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

    // Now process each page's extracted data with async LLM calls
    for (page_num, page_data_result) in page_data_results {
        reporter.on_page_start(page_num + 1, total_pages);

        match page_data_result {
            Ok(page_data) => {
                match process_page_async(
                    page_data,
                    page_num,
                    provider,
                    &images_dir,
                    &doc_stem,
                    &mut metadata_catalog,
                    config,
                    reporter,
                )
                .await
                {
                    Ok(content) => all_content.push(content),
                    Err(e) => {
                        let err_msg = format!("{e}");
                        reporter.on_error(page_num + 1, &err_msg);
                        tracing::error!("Error on page {}: {}", page_num + 1, err_msg);
                        all_content.push(format!(
                            "\n\n---\n## Page {}\n[Error: {err_msg}]\n",
                            page_num + 1
                        ));
                    }
                }
            }
            Err(e) => {
                let err_msg = format!("{e}");
                reporter.on_error(page_num + 1, &err_msg);
                all_content.push(format!(
                    "\n\n---\n## Page {}\n[Error: {err_msg}]\n",
                    page_num + 1
                ));
            }
        }

        reporter.on_page_complete(page_num + 1, total_pages);
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

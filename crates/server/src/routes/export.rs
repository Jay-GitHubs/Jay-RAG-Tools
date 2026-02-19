use axum::extract::{Path, Query, State};
use axum::http::header;
use axum::response::Response;
use serde::Deserialize;
use std::io::{Cursor, Write};
use std::sync::Arc;
use uuid::Uuid;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

use crate::error::ApiError;
use crate::jobs::models::JobStatus;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct ExportParams {
    pub image_base_url: Option<String>,
}

/// Export all results for a completed job as a ZIP archive.
pub async fn export_zip(
    Path(job_id): Path<Uuid>,
    Query(params): Query<ExportParams>,
    State(state): State<Arc<AppState>>,
) -> Result<Response, ApiError> {
    let job = state
        .job_queue
        .get_job(&job_id)
        .await
        .ok_or_else(|| ApiError::NotFound(format!("Job {job_id} not found")))?;

    if job.status != JobStatus::Completed {
        return Err(ApiError::BadRequest(format!(
            "Job {job_id} is not completed (status: {:?})",
            job.status
        )));
    }

    let result = job
        .result
        .ok_or_else(|| ApiError::Internal("Job completed but no results found".to_string()))?;

    // Build the ZIP in memory
    let buf = Cursor::new(Vec::new());
    let mut zip = ZipWriter::new(buf);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Derive document stem from the markdown filename
    let md_path = std::path::Path::new(&result.markdown_path);
    let doc_stem = md_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");

    // Add markdown file (optionally converting image tags)
    if let Ok(md_bytes) = tokio::fs::read(&result.markdown_path).await {
        let md_content = String::from_utf8_lossy(&md_bytes);
        let final_md = match &params.image_base_url {
            Some(base_url) if !base_url.is_empty() => {
                convert_image_tags(&md_content, base_url)
            }
            _ => md_content.into_owned(),
        };
        let name = format!("{doc_stem}.md");
        zip.start_file(&name, options)
            .map_err(|e| ApiError::Internal(format!("ZIP error: {e}")))?;
        zip.write_all(final_md.as_bytes())
            .map_err(|e| ApiError::Internal(format!("ZIP write error: {e}")))?;
    }

    // Add metadata JSON
    if let Ok(meta_bytes) = tokio::fs::read(&result.metadata_path).await {
        let meta_path = std::path::Path::new(&result.metadata_path);
        let meta_name = meta_path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("metadata.json");
        zip.start_file(meta_name, options)
            .map_err(|e| ApiError::Internal(format!("ZIP error: {e}")))?;
        zip.write_all(&meta_bytes)
            .map_err(|e| ApiError::Internal(format!("ZIP write error: {e}")))?;
    }

    // Add all images from the images directory
    let images_dir = std::path::Path::new(&result.images_dir);
    if images_dir.is_dir() {
        let mut entries = tokio::fs::read_dir(images_dir)
            .await
            .map_err(|e| ApiError::Internal(format!("Failed to read images dir: {e}")))?;

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|e| ApiError::Internal(format!("Failed to read dir entry: {e}")))?
        {
            let path = entry.path();
            if path.is_file() {
                if let Ok(img_bytes) = tokio::fs::read(&path).await {
                    let file_name = path
                        .file_name()
                        .and_then(|s| s.to_str())
                        .unwrap_or("image.png");
                    let zip_name = format!("images/{file_name}");
                    zip.start_file(&zip_name, options)
                        .map_err(|e| ApiError::Internal(format!("ZIP error: {e}")))?;
                    zip.write_all(&img_bytes)
                        .map_err(|e| ApiError::Internal(format!("ZIP write error: {e}")))?;
                }
            }
        }
    }

    let cursor = zip
        .finish()
        .map_err(|e| ApiError::Internal(format!("ZIP finalize error: {e}")))?;
    let zip_bytes = cursor.into_inner();

    let short_id = &job_id.to_string()[..8];
    let filename = format!("{short_id}_results.zip");

    Ok(Response::builder()
        .header(header::CONTENT_TYPE, "application/zip")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{filename}\""),
        )
        .body(axum::body::Body::from(zip_bytes))
        .unwrap())
}

/// Convert `[IMAGE:path]` tags to HTML `<img>` tags, grouping consecutive
/// images into a flex container with responsive widths.
fn convert_image_tags(markdown: &str, base_url: &str) -> String {
    let base = base_url.trim_end_matches('/');
    let mut output = String::with_capacity(markdown.len());
    let lines: Vec<&str> = markdown.lines().collect();
    let mut i = 0;

    while i < lines.len() {
        if let Some(path) = extract_image_path(lines[i]) {
            // Collect consecutive image lines
            let mut paths = vec![path];
            let mut j = i + 1;
            while j < lines.len() {
                if let Some(p) = extract_image_path(lines[j]) {
                    paths.push(p);
                    j += 1;
                } else {
                    break;
                }
            }

            let count = paths.len();
            let img_style = match count {
                1 => "max-width:100%",
                2 => "max-width:calc(50% - 4px)",
                3 => "max-width:calc(33% - 6px)",
                _ => "max-width:calc(25% - 6px)",
            };

            if count > 1 {
                output.push_str("<div style=\"display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;\">\n");
            }
            for p in &paths {
                output.push_str(&format!(
                    "<img src=\"{base}/{p}\" style=\"{img_style};border-radius:8px;margin:8px 0;\">\n"
                ));
            }
            if count > 1 {
                output.push_str("</div>\n");
            }

            i = j;
        } else {
            output.push_str(lines[i]);
            output.push('\n');
            i += 1;
        }
    }

    // Remove trailing newline if the original didn't end with one
    if !markdown.ends_with('\n') && output.ends_with('\n') {
        output.pop();
    }

    output
}

/// Extract the path from an `[IMAGE:path]` tag, returning `None` if the line
/// doesn't match the pattern.
fn extract_image_path(line: &str) -> Option<&str> {
    let trimmed = line.trim();
    let rest = trimmed.strip_prefix("[IMAGE:")?;
    let path = rest.strip_suffix(']')?;
    if path.is_empty() {
        return None;
    }
    Some(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_single_image_conversion() {
        let md = "[IMAGE:page1_img1.png]\nSome text here.";
        let result = convert_image_tags(md, "http://example.com/imgs");
        assert!(result.contains(r#"src="http://example.com/imgs/page1_img1.png""#));
        assert!(result.contains("max-width:100%"));
        assert!(!result.contains("<div"));
        assert!(result.contains("Some text here."));
    }

    #[test]
    fn test_consecutive_images_grouped() {
        let md = "[IMAGE:a.png]\n[IMAGE:b.png]\nText after.";
        let result = convert_image_tags(md, "http://host/imgs/");
        assert!(result.contains("<div style=\"display:flex"));
        assert!(result.contains("calc(50% - 4px)"));
        assert!(result.contains("</div>"));
        assert!(result.contains("Text after."));
    }

    #[test]
    fn test_three_consecutive_images() {
        let md = "[IMAGE:a.png]\n[IMAGE:b.png]\n[IMAGE:c.png]";
        let result = convert_image_tags(md, "http://host");
        assert!(result.contains("calc(33% - 6px)"));
    }

    #[test]
    fn test_no_image_tags_unchanged() {
        let md = "Hello world\nNo images here.";
        let result = convert_image_tags(md, "http://host");
        assert_eq!(result, md);
    }

    #[test]
    fn test_trailing_slash_stripped() {
        let md = "[IMAGE:img.png]";
        let result = convert_image_tags(md, "http://host/path/");
        assert!(result.contains(r#"src="http://host/path/img.png""#));
    }

    #[test]
    fn test_empty_image_tag_ignored() {
        let md = "[IMAGE:]";
        let result = convert_image_tags(md, "http://host");
        assert_eq!(result, "[IMAGE:]");
    }
}

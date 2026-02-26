use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use uuid::Uuid;

use crate::error::ApiError;
use crate::jobs::models::JobStatus;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct DeleteImagesRequest {
    pub image_files: Vec<String>,
}

#[derive(Serialize)]
pub struct DeleteImagesResponse {
    pub deleted: Vec<String>,
    pub failed: Vec<String>,
    pub updated_markdown: Option<String>,
    pub image_count: u32,
}

/// Delete specified images from a completed job's results.
///
/// POST /api/results/{job_id}/images/delete
pub async fn delete_images(
    Path(job_id): Path<Uuid>,
    State(state): State<Arc<AppState>>,
    Json(request): Json<DeleteImagesRequest>,
) -> Result<Json<DeleteImagesResponse>, ApiError> {
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

    let mut result = job
        .result
        .ok_or_else(|| ApiError::Internal("Job completed but no results found".to_string()))?;

    if request.image_files.is_empty() {
        return Err(ApiError::BadRequest(
            "image_files must not be empty".to_string(),
        ));
    }

    let images_dir = PathBuf::from(&result.images_dir);
    let mut deleted = Vec::new();
    let mut failed = Vec::new();

    // 1. Delete image files from disk
    for image_file in &request.image_files {
        // Prevent path traversal (allow / for subdirectory structure like {job_id}/filename.png)
        if image_file.contains("..") || image_file.contains('\\') {
            failed.push(image_file.clone());
            continue;
        }

        let image_path = images_dir.join(image_file);
        match tokio::fs::remove_file(&image_path).await {
            Ok(()) => deleted.push(image_file.clone()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                // Already gone, still count as deleted
                deleted.push(image_file.clone());
            }
            Err(_) => failed.push(image_file.clone()),
        }
    }

    let deleted_set: std::collections::HashSet<&str> =
        deleted.iter().map(|s| s.as_str()).collect();

    // 2. Update metadata JSON — filter out deleted entries
    let metadata_path = PathBuf::from(&result.metadata_path);
    if let Ok(metadata_str) = tokio::fs::read_to_string(&metadata_path).await {
        if let Ok(mut metadata) = serde_json::from_str::<Vec<serde_json::Value>>(&metadata_str) {
            metadata.retain(|entry| {
                entry
                    .get("image_file")
                    .and_then(|v| v.as_str())
                    .map(|f| !deleted_set.contains(f))
                    .unwrap_or(true)
            });
            if let Ok(updated_json) = serde_json::to_string_pretty(&metadata) {
                let _ = tokio::fs::write(&metadata_path, updated_json).await;
            }
        }
    }

    // 3. Remove [IMAGE:filename] blocks from markdown
    let markdown_path = PathBuf::from(&result.markdown_path);
    let updated_markdown = if let Ok(markdown) = tokio::fs::read_to_string(&markdown_path).await {
        let cleaned = remove_image_blocks(&markdown, &deleted_set);
        let _ = tokio::fs::write(&markdown_path, &cleaned).await;
        Some(cleaned)
    } else {
        None
    };

    // 4. Update image_count in job result
    let new_count = result.image_count.saturating_sub(deleted.len() as u32);
    result.image_count = new_count;
    state.job_queue.update_result(&job_id, result).await;

    Ok(Json(DeleteImagesResponse {
        deleted,
        failed,
        updated_markdown,
        image_count: new_count,
    }))
}

/// Remove `[IMAGE:filename]` tags and their associated description lines from markdown.
///
/// The format in the markdown is typically:
/// ```text
/// [IMAGE:filename.png]
/// Description text here
/// ```
/// or sometimes just `[IMAGE:filename.png]` on its own line.
fn remove_image_blocks(markdown: &str, deleted_files: &std::collections::HashSet<&str>) -> String {
    let lines: Vec<&str> = markdown.lines().collect();
    let mut result = Vec::new();
    let mut i = 0;

    while i < lines.len() {
        let line = lines[i];
        let trimmed = line.trim();

        // Check if this line contains an [IMAGE:filename] tag for a deleted file
        if let Some(filename) = extract_image_ref(trimmed) {
            if deleted_files.contains(filename) {
                // Skip this line and the next non-empty line (description)
                i += 1;
                // Skip the description line(s) that follow
                while i < lines.len() && !lines[i].trim().is_empty() {
                    // Stop if we hit another [IMAGE:] tag or a markdown heading
                    let next_trimmed = lines[i].trim();
                    if next_trimmed.starts_with("[IMAGE:")
                        || next_trimmed.starts_with('#')
                        || next_trimmed.starts_with("---")
                    {
                        break;
                    }
                    i += 1;
                }
                // Also skip trailing blank line after the block
                if i < lines.len() && lines[i].trim().is_empty() {
                    i += 1;
                }
                continue;
            }
        }

        result.push(line);
        i += 1;
    }

    result.join("\n")
}

/// Extract filename from an `[IMAGE:filename.png]` tag.
fn extract_image_ref(line: &str) -> Option<&str> {
    let start = line.find("[IMAGE:")?;
    let after = &line[start + 7..];
    let end = after.find(']')?;
    Some(&after[..end])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_remove_image_blocks() {
        let markdown = "\
# Page 1

[IMAGE:photo1.png]
This is a photo of something

[IMAGE:photo2.png]
Another description here

Some regular text

[IMAGE:photo3.png]
Third image description
";
        let deleted: std::collections::HashSet<&str> =
            ["photo1.png", "photo3.png"].into_iter().collect();

        let result = remove_image_blocks(markdown, &deleted);
        assert!(!result.contains("photo1.png"));
        assert!(result.contains("photo2.png"));
        assert!(result.contains("Another description here"));
        assert!(!result.contains("photo3.png"));
        assert!(result.contains("Some regular text"));
    }

    #[test]
    fn test_extract_image_ref() {
        assert_eq!(extract_image_ref("[IMAGE:test.png]"), Some("test.png"));
        assert_eq!(
            extract_image_ref("[IMAGE:dir/file.png]"),
            Some("dir/file.png")
        );
        assert_eq!(extract_image_ref("no image here"), None);
    }
}

use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::deploy;
use crate::error::ApiError;
use crate::jobs::models::JobStatus;
use crate::routes::export::convert_image_tags;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct DeployRequest {
    pub image_base_url: String,
    pub image_target: Option<ImageTarget>,
    pub markdown_target: Option<MarkdownTarget>,
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ImageTarget {
    LocalFolder { path: String },
    S3 {
        bucket: String,
        prefix: String,
        region: Option<String>,
    },
    Scp {
        host: String,
        port: Option<u16>,
        username: String,
        private_key_path: Option<String>,
        remote_path: String,
    },
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum MarkdownTarget {
    LocalFolder { path: String },
    Flowise {
        base_url: String,
        api_key: String,
        store_id: String,
    },
}

#[derive(Serialize)]
pub struct DeployResponse {
    pub success: bool,
    pub image_result: Option<DeployStepResult>,
    pub markdown_result: Option<DeployStepResult>,
    pub errors: Vec<String>,
}

#[derive(Serialize)]
pub struct DeployStepResult {
    pub target_type: String,
    pub detail: String,
}

/// Deploy images and/or markdown to target destinations.
pub async fn deploy_handler(
    Path(job_id): Path<Uuid>,
    State(state): State<Arc<AppState>>,
    Json(req): Json<DeployRequest>,
) -> Result<Json<DeployResponse>, ApiError> {
    // Validate job exists and is completed
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

    let mut errors = Vec::new();
    let mut image_result = None;
    let mut markdown_result = None;

    // Deploy images if target specified
    if let Some(ref image_target) = req.image_target {
        let images_dir = std::path::Path::new(&result.images_dir);
        match deploy::images::deploy_images(image_target, images_dir).await {
            Ok(detail) => {
                image_result = Some(DeployStepResult {
                    target_type: image_target_type(image_target),
                    detail,
                });
            }
            Err(e) => errors.push(format!("Image deploy failed: {e}")),
        }
    }

    // Convert markdown with image base URL
    let md_content = tokio::fs::read_to_string(&result.markdown_path)
        .await
        .map_err(|e| ApiError::Internal(format!("Failed to read markdown: {e}")))?;
    let converted_md = convert_image_tags(&md_content, &req.image_base_url);

    // Deploy markdown if target specified
    if let Some(ref md_target) = req.markdown_target {
        let md_path = std::path::Path::new(&result.markdown_path);
        let doc_stem = md_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output");

        match deploy::markdown::deploy_markdown(md_target, &converted_md, doc_stem).await {
            Ok(detail) => {
                markdown_result = Some(DeployStepResult {
                    target_type: md_target_type(md_target),
                    detail,
                });
            }
            Err(e) => errors.push(format!("Markdown deploy failed: {e}")),
        }
    }

    let success = errors.is_empty();
    Ok(Json(DeployResponse {
        success,
        image_result,
        markdown_result,
        errors,
    }))
}

fn image_target_type(target: &ImageTarget) -> String {
    match target {
        ImageTarget::LocalFolder { .. } => "local_folder".to_string(),
        ImageTarget::S3 { .. } => "s3".to_string(),
        ImageTarget::Scp { .. } => "scp".to_string(),
    }
}

fn md_target_type(target: &MarkdownTarget) -> String {
    match target {
        MarkdownTarget::LocalFolder { .. } => "local_folder".to_string(),
        MarkdownTarget::Flowise { .. } => "flowise".to_string(),
    }
}

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
pub struct SaveMarkdownRequest {
    pub markdown: String,
}

#[derive(Serialize)]
pub struct SaveMarkdownResponse {
    pub success: bool,
    pub bytes_written: usize,
}

/// Save edited markdown back to the job's result file.
///
/// POST /api/results/{job_id}/markdown
pub async fn save_markdown(
    Path(job_id): Path<Uuid>,
    State(state): State<Arc<AppState>>,
    Json(request): Json<SaveMarkdownRequest>,
) -> Result<Json<SaveMarkdownResponse>, ApiError> {
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

    let markdown_path = PathBuf::from(&result.markdown_path);

    if !markdown_path.exists() {
        return Err(ApiError::NotFound(
            "Markdown file no longer available".to_string(),
        ));
    }

    let bytes = request.markdown.as_bytes().len();
    tokio::fs::write(&markdown_path, &request.markdown).await?;

    Ok(Json(SaveMarkdownResponse {
        success: true,
        bytes_written: bytes,
    }))
}

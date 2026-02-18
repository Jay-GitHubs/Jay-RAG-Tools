use axum::extract::{Path, State};
use axum::Json;
use serde::Serialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::error::ApiError;
use crate::jobs::models::JobStatus;
use crate::state::AppState;

#[derive(Serialize)]
pub struct ResultsResponse {
    pub job_id: Uuid,
    pub markdown: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub image_count: u32,
}

/// Get results for a completed job.
pub async fn get_results(
    Path(job_id): Path<Uuid>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<ResultsResponse>, ApiError> {
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

    // Read the output files
    let markdown = tokio::fs::read_to_string(&result.markdown_path)
        .await
        .ok();

    let metadata: Option<serde_json::Value> = tokio::fs::read_to_string(&result.metadata_path)
        .await
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok());

    Ok(Json(ResultsResponse {
        job_id,
        markdown,
        metadata,
        image_count: result.image_count,
    }))
}

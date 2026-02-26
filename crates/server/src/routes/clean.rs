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
pub struct CleanRequest {
    pub remove_pages: Vec<u32>,
}

#[derive(Serialize)]
pub struct CleanResponse {
    pub cleaned_markdown: String,
    pub pages_removed: Vec<u32>,
}

/// Remove specified pages from a job's markdown output.
///
/// POST /api/results/{job_id}/clean
pub async fn clean_results(
    Path(job_id): Path<Uuid>,
    State(state): State<Arc<AppState>>,
    Json(request): Json<CleanRequest>,
) -> Result<Json<CleanResponse>, ApiError> {
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

    if request.remove_pages.is_empty() {
        return Err(ApiError::BadRequest(
            "remove_pages must not be empty".to_string(),
        ));
    }

    let markdown_path = PathBuf::from(&result.markdown_path);

    let (_cleaned_path, cleaned_content) =
        jay_rag_core::clean_markdown(&markdown_path, &request.remove_pages).await?;

    // Update trash JSON file to remove cleaned pages
    if let Some(ref trash_path) = result.trash_path {
        if let Ok(trash_json) = tokio::fs::read_to_string(trash_path).await {
            if let Ok(mut trash_items) =
                serde_json::from_str::<Vec<serde_json::Value>>(&trash_json)
            {
                let remove_set: std::collections::HashSet<u32> =
                    request.remove_pages.iter().copied().collect();
                trash_items.retain(|item| {
                    item.get("page")
                        .and_then(|p| p.as_u64())
                        .map(|p| !remove_set.contains(&(p as u32)))
                        .unwrap_or(true)
                });
                if let Ok(updated_json) = serde_json::to_string_pretty(&trash_items) {
                    let _ = tokio::fs::write(trash_path, updated_json).await;
                }
            }
        }
    }

    Ok(Json(CleanResponse {
        cleaned_markdown: cleaned_content,
        pages_removed: request.remove_pages,
    }))
}

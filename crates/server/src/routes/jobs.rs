use axum::extract::{Path, State};
use axum::Json;
use serde::Serialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::error::ApiError;
use crate::jobs::models::Job;
use crate::state::AppState;

#[derive(Serialize)]
pub struct JobListResponse {
    pub jobs: Vec<Job>,
}

#[derive(Serialize)]
pub struct DeleteResponse {
    pub message: String,
}

/// List all jobs.
pub async fn list_jobs(
    State(state): State<Arc<AppState>>,
) -> Json<JobListResponse> {
    let jobs = state.job_queue.list_jobs().await;
    Json(JobListResponse { jobs })
}

/// Get a single job by ID.
pub async fn get_job(
    Path(id): Path<Uuid>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<Job>, ApiError> {
    state
        .job_queue
        .get_job(&id)
        .await
        .map(Json)
        .ok_or_else(|| ApiError::NotFound(format!("Job {id} not found")))
}

/// Delete/cancel a job.
pub async fn delete_job(
    Path(id): Path<Uuid>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<DeleteResponse>, ApiError> {
    if state.job_queue.delete_job(&id).await {
        Ok(Json(DeleteResponse {
            message: format!("Job {id} deleted"),
        }))
    } else {
        Err(ApiError::NotFound(format!("Job {id} not found")))
    }
}

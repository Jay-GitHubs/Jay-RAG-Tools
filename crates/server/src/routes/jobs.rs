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

/// Delete/cancel a job and clean up associated files.
pub async fn delete_job(
    Path(id): Path<Uuid>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<DeleteResponse>, ApiError> {
    // Retrieve job before deletion so we can clean up files
    let job = state
        .job_queue
        .get_job(&id)
        .await
        .ok_or_else(|| ApiError::NotFound(format!("Job {id} not found")))?;

    // Clean up uploaded PDF
    let pdf_path = state.upload_dir.join(format!("{id}.pdf"));
    let _ = tokio::fs::remove_file(&pdf_path).await;

    // Clean up output files if the job produced results
    if let Some(result) = &job.result {
        let _ = tokio::fs::remove_file(&result.markdown_path).await;
        let _ = tokio::fs::remove_file(&result.metadata_path).await;

        // Delete images directory: derive doc stem from filename
        let doc_stem = job.filename.strip_suffix(".pdf").unwrap_or(&job.filename);
        let images_dir = state.output_dir.join("images").join(doc_stem);
        let _ = tokio::fs::remove_dir_all(&images_dir).await;
    }

    // Delete the DB row
    if state.job_queue.delete_job(&id).await {
        Ok(Json(DeleteResponse {
            message: format!("Job {id} deleted"),
        }))
    } else {
        Err(ApiError::NotFound(format!("Job {id} not found")))
    }
}

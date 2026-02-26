use axum::extract::{Path, State};
use axum::Json;
use serde::Serialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::error::ApiError;
use crate::jobs::models::{Job, JobProgress, JobStatus};
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

/// Cancel a pending or processing job.
pub async fn cancel_job(
    Path(id): Path<Uuid>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<DeleteResponse>, ApiError> {
    let job = state
        .job_queue
        .get_job(&id)
        .await
        .ok_or_else(|| ApiError::NotFound(format!("Job {id} not found")))?;

    if job.status != JobStatus::Pending && job.status != JobStatus::Processing {
        return Err(ApiError::BadRequest(format!(
            "Job {id} is {:?} and cannot be cancelled",
            job.status
        )));
    }

    // Abort the spawned task if it exists
    if let Some(handle) = state.task_handles.lock().await.remove(&id) {
        handle.abort();
    }

    // Update DB status
    state.job_queue.set_cancelled(&id).await;

    // Notify WebSocket clients
    state
        .job_queue
        .update_progress(
            &id,
            JobProgress {
                current_page: 0,
                total_pages: 0,
                images_processed: 0,
                phase: "cancelled".to_string(),
                message: "Job cancelled by user".to_string(),
            },
        )
        .await;

    // Clean up partial output files
    let pdf_path = state.upload_dir.join(format!("{id}.pdf"));
    let _ = tokio::fs::remove_file(&pdf_path).await;

    let doc_stem = job.filename.strip_suffix(".pdf").unwrap_or(&job.filename);
    let images_dir = state.output_dir.join("images").join(doc_stem);
    let _ = tokio::fs::remove_dir_all(&images_dir).await;

    let md_path = state.output_dir.join(format!("{doc_stem}.md"));
    let _ = tokio::fs::remove_file(&md_path).await;

    let meta_path = state.output_dir.join(format!("{doc_stem}_metadata.json"));
    let _ = tokio::fs::remove_file(&meta_path).await;

    tracing::info!("Job {id} cancelled by user");

    Ok(Json(DeleteResponse {
        message: format!("Job {id} cancelled"),
    }))
}

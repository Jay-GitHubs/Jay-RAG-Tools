use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::header;
use axum::response::Response;
use std::sync::Arc;
use tokio_util::io::ReaderStream;
use uuid::Uuid;

use crate::error::ApiError;
use crate::state::AppState;

/// Serve the original uploaded PDF file.
///
/// GET /api/pdf/{job_id}
pub async fn serve_pdf(
    Path(job_id): Path<Uuid>,
    State(state): State<Arc<AppState>>,
) -> Result<Response, ApiError> {
    // Verify the job exists
    let _job = state
        .job_queue
        .get_job(&job_id)
        .await
        .ok_or_else(|| ApiError::NotFound(format!("Job {job_id} not found")))?;

    let pdf_path = state.upload_dir.join(format!("{job_id}.pdf"));

    if !pdf_path.exists() {
        return Err(ApiError::NotFound(
            "Original PDF file no longer available".to_string(),
        ));
    }

    let file = tokio::fs::File::open(&pdf_path).await?;
    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    Ok(Response::builder()
        .header(header::CONTENT_TYPE, "application/pdf")
        .header(header::CONTENT_DISPOSITION, "inline")
        .body(body)
        .unwrap())
}

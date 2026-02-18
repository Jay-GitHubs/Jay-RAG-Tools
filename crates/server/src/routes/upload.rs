use axum::extract::{Multipart, State};
use axum::Json;
use serde::Serialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::error::ApiError;
use crate::jobs::models::{Job, JobConfig};
use crate::jobs::runner;
use crate::state::AppState;
use jay_rag_core::provider;

#[derive(Serialize)]
pub struct UploadResponse {
    pub job_id: Uuid,
    pub message: String,
}

pub async fn upload_pdf(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, ApiError> {
    let mut pdf_data: Option<(String, Vec<u8>)> = None;
    let mut config_json: Option<String> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "file" => {
                let filename = field
                    .file_name()
                    .unwrap_or("upload.pdf")
                    .to_string();
                let data = field
                    .bytes()
                    .await
                    .map_err(|e| ApiError::BadRequest(format!("Failed to read file: {e}")))?;
                pdf_data = Some((filename, data.to_vec()));
            }
            "config" => {
                let text = field
                    .text()
                    .await
                    .map_err(|e| ApiError::BadRequest(format!("Failed to read config: {e}")))?;
                config_json = Some(text);
            }
            _ => {}
        }
    }

    let (filename, data) = pdf_data.ok_or_else(|| ApiError::BadRequest("No PDF file provided".to_string()))?;

    let config: JobConfig = match config_json {
        Some(json) => serde_json::from_str(&json)
            .map_err(|e| ApiError::BadRequest(format!("Invalid config JSON: {e}")))?,
        None => JobConfig {
            provider: "ollama".to_string(),
            model: None,
            language: "th".to_string(),
            start_page: None,
            end_page: None,
            table_extraction: false,
            storage: "local".to_string(),
            s3_bucket: None,
            s3_prefix: None,
            storage_path: None,
        },
    };

    // Resolve model
    let model = config
        .model
        .clone()
        .unwrap_or_else(|| provider::default_model(&config.provider).to_string());

    // Save uploaded PDF to temp directory
    let job = Job::new(filename.clone(), config.clone());
    let job_id = job.id;

    tokio::fs::create_dir_all(&state.upload_dir).await?;
    let pdf_path = state.upload_dir.join(format!("{job_id}.pdf"));
    tokio::fs::write(&pdf_path, &data).await?;

    // Add job to queue
    state.job_queue.add_job(job).await;

    // Spawn background processing task
    let output_dir = state.output_dir.clone();
    let queue = state.job_queue.clone();
    let provider_name = config.provider.clone();
    let language = config.language.clone();
    let start_page = config.start_page;
    let end_page = config.end_page;
    let table_extraction = config.table_extraction;

    tokio::spawn(async move {
        runner::run_job(
            job_id,
            pdf_path,
            output_dir,
            queue,
            provider_name,
            model,
            language,
            start_page,
            end_page,
            table_extraction,
        )
        .await;
    });

    Ok(Json(UploadResponse {
        job_id,
        message: format!("Job created for '{filename}'"),
    }))
}

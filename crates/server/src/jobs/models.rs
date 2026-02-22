use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Status of a processing job.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum JobStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

/// Configuration for a processing job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobConfig {
    pub provider: String,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default = "default_language")]
    pub language: String,
    #[serde(default)]
    pub start_page: Option<u32>,
    #[serde(default)]
    pub end_page: Option<u32>,
    #[serde(default)]
    pub table_extraction: bool,
    #[serde(default)]
    pub text_only: bool,
    #[serde(default = "default_storage")]
    pub storage: String,
    #[serde(default)]
    pub s3_bucket: Option<String>,
    #[serde(default)]
    pub s3_prefix: Option<String>,
    #[serde(default)]
    pub storage_path: Option<String>,
    #[serde(default = "default_quality")]
    pub quality: String,
}

fn default_language() -> String {
    "th".to_string()
}

fn default_storage() -> String {
    "local".to_string()
}

fn default_quality() -> String {
    "standard".to_string()
}

/// Progress update for a job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobProgress {
    pub current_page: u32,
    pub total_pages: u32,
    pub images_processed: u32,
    pub phase: String,
    pub message: String,
}

/// Result of a completed job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobResult {
    pub markdown_path: String,
    pub metadata_path: String,
    pub image_count: u32,
    pub images_dir: String,
    #[serde(default)]
    pub trash_path: Option<String>,
    #[serde(default)]
    pub trash_count: u32,
}

/// A processing job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub id: Uuid,
    pub filename: String,
    pub status: JobStatus,
    pub config: JobConfig,
    pub progress: Option<JobProgress>,
    pub result: Option<JobResult>,
    pub error: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Job {
    pub fn new(filename: String, config: JobConfig) -> Self {
        let now = iso_now();
        Self {
            id: Uuid::new_v4(),
            filename,
            status: JobStatus::Pending,
            config,
            progress: None,
            result: None,
            error: None,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

/// ISO 8601 UTC timestamp, e.g. `2026-02-19T01:12:24Z`.
pub fn iso_now() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

use chrono::NaiveDateTime;
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
    Cancelled,
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
    #[serde(default)]
    pub dpi: Option<u32>,
    #[serde(default = "default_true")]
    pub notify: bool,
    #[serde(default)]
    pub enhance: bool,
}

fn default_true() -> bool {
    true
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
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub duration_seconds: Option<f64>,
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
            started_at: None,
            completed_at: None,
            duration_seconds: None,
        }
    }
}

/// Compute duration in seconds between two ISO timestamps.
pub fn compute_duration_seconds(start: &str, end: &str) -> Option<f64> {
    let fmt = "%Y-%m-%dT%H:%M:%SZ";
    let s = NaiveDateTime::parse_from_str(start, fmt).ok()?;
    let e = NaiveDateTime::parse_from_str(end, fmt).ok()?;
    let dur = e.signed_duration_since(s);
    Some(dur.num_milliseconds() as f64 / 1000.0)
}

/// ISO 8601 UTC timestamp, e.g. `2026-02-19T01:12:24Z`.
pub fn iso_now() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

/// Global notification settings (singleton).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub line_enabled: bool,
    /// LINE Messaging API channel access token.
    #[serde(default, alias = "line_token")]
    pub line_channel_token: String,
    /// LINE user ID or group ID to push messages to.
    #[serde(default)]
    pub line_user_id: String,
    #[serde(default)]
    pub email_enabled: bool,
    #[serde(default)]
    pub smtp_host: String,
    #[serde(default = "default_smtp_port")]
    pub smtp_port: u16,
    #[serde(default)]
    pub smtp_username: String,
    #[serde(default)]
    pub smtp_password: String,
    #[serde(default)]
    pub email_from: String,
    #[serde(default)]
    pub email_to: String,
    #[serde(default = "default_true")]
    pub notify_on_complete: bool,
    #[serde(default = "default_true")]
    pub notify_on_failure: bool,
}

fn default_smtp_port() -> u16 {
    587
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            line_enabled: false,
            line_channel_token: String::new(),
            line_user_id: String::new(),
            email_enabled: false,
            smtp_host: String::new(),
            smtp_port: 587,
            smtp_username: String::new(),
            smtp_password: String::new(),
            email_from: String::new(),
            email_to: String::new(),
            notify_on_complete: true,
            notify_on_failure: true,
        }
    }
}

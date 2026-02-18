use super::models::{Job, JobConfig, JobProgress, JobResult, JobStatus};
use rusqlite::{params, Connection};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use tokio::sync::{broadcast, Mutex};
use uuid::Uuid;

/// SQLite-backed job queue with broadcast channels for progress updates.
#[derive(Clone)]
pub struct JobQueue {
    db: Arc<std::sync::Mutex<Connection>>,
    /// Per-job broadcast senders for live progress events (in-memory only).
    progress_senders: Arc<Mutex<HashMap<Uuid, broadcast::Sender<JobProgress>>>>,
}

impl JobQueue {
    /// Create a new JobQueue backed by SQLite at `db_path`.
    pub fn new(db_path: &Path) -> Result<Self, rusqlite::Error> {
        let conn = Connection::open(db_path)?;

        // Enable WAL mode for better concurrent read performance
        conn.pragma_update(None, "journal_mode", "WAL")?;

        // Create the jobs table
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS jobs (
                id         TEXT PRIMARY KEY,
                filename   TEXT NOT NULL,
                status     TEXT NOT NULL DEFAULT 'pending',
                config     TEXT NOT NULL,
                progress   TEXT,
                result     TEXT,
                error      TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );",
        )?;

        // Mark any stale 'processing' or 'pending' jobs as failed on restart
        let now = now_timestamp();
        conn.execute(
            "UPDATE jobs SET status = 'failed', error = 'Interrupted by server restart', updated_at = ?1
             WHERE status IN ('processing', 'pending')",
            params![now],
        )?;

        tracing::info!("Job database opened at {}", db_path.display());

        Ok(Self {
            db: Arc::new(std::sync::Mutex::new(conn)),
            progress_senders: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    /// Add a new job to the queue.
    pub async fn add_job(&self, job: Job) -> Uuid {
        let id = job.id;
        let config_json =
            serde_json::to_string(&job.config).expect("JobConfig serialization failed");

        {
            let db = self.db.lock().expect("db lock poisoned");
            db.execute(
                "INSERT INTO jobs (id, filename, status, config, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    id.to_string(),
                    job.filename,
                    status_to_str(&job.status),
                    config_json,
                    job.created_at,
                    job.updated_at,
                ],
            )
            .expect("Failed to insert job");
        }

        let (tx, _) = broadcast::channel(64);
        self.progress_senders.lock().await.insert(id, tx);
        id
    }

    /// Get a job by ID.
    pub async fn get_job(&self, id: &Uuid) -> Option<Job> {
        let id_str = id.to_string();
        let db = self.db.lock().expect("db lock poisoned");
        db.query_row(
            "SELECT id, filename, status, config, progress, result, error, created_at, updated_at
             FROM jobs WHERE id = ?1",
            params![id_str],
            |row| row_to_job(row),
        )
        .ok()
    }

    /// List all jobs, newest first.
    pub async fn list_jobs(&self) -> Vec<Job> {
        let db = self.db.lock().expect("db lock poisoned");
        let mut stmt = db
            .prepare(
                "SELECT id, filename, status, config, progress, result, error, created_at, updated_at
                 FROM jobs ORDER BY created_at DESC",
            )
            .expect("Failed to prepare list_jobs query");

        stmt.query_map([], |row| row_to_job(row))
            .expect("Failed to query jobs")
            .filter_map(|r| r.ok())
            .collect()
    }

    /// Update a job's status.
    pub async fn update_status(&self, id: &Uuid, status: JobStatus) {
        let db = self.db.lock().expect("db lock poisoned");
        db.execute(
            "UPDATE jobs SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status_to_str(&status), now_timestamp(), id.to_string()],
        )
        .ok();
    }

    /// Update a job's progress and broadcast to listeners.
    pub async fn update_progress(&self, id: &Uuid, progress: JobProgress) {
        let progress_json =
            serde_json::to_string(&progress).expect("JobProgress serialization failed");

        {
            let db = self.db.lock().expect("db lock poisoned");
            db.execute(
                "UPDATE jobs SET progress = ?1, updated_at = ?2 WHERE id = ?3",
                params![progress_json, now_timestamp(), id.to_string()],
            )
            .ok();
        }

        if let Some(tx) = self.progress_senders.lock().await.get(id) {
            let _ = tx.send(progress);
        }
    }

    /// Set a job as completed with results.
    pub async fn set_completed(&self, id: &Uuid, result: JobResult) {
        let result_json =
            serde_json::to_string(&result).expect("JobResult serialization failed");

        let db = self.db.lock().expect("db lock poisoned");
        db.execute(
            "UPDATE jobs SET status = 'completed', result = ?1, updated_at = ?2 WHERE id = ?3",
            params![result_json, now_timestamp(), id.to_string()],
        )
        .ok();
    }

    /// Set a job as failed with an error message.
    pub async fn set_failed(&self, id: &Uuid, error: String) {
        let db = self.db.lock().expect("db lock poisoned");
        db.execute(
            "UPDATE jobs SET status = 'failed', error = ?1, updated_at = ?2 WHERE id = ?3",
            params![error, now_timestamp(), id.to_string()],
        )
        .ok();
    }

    /// Delete a job.
    pub async fn delete_job(&self, id: &Uuid) -> bool {
        let removed = {
            let db = self.db.lock().expect("db lock poisoned");
            db.execute("DELETE FROM jobs WHERE id = ?1", params![id.to_string()])
                .map(|n| n > 0)
                .unwrap_or(false)
        };
        self.progress_senders.lock().await.remove(id);
        removed
    }

    /// Subscribe to progress updates for a job.
    pub async fn subscribe_progress(
        &self,
        id: &Uuid,
    ) -> Option<broadcast::Receiver<JobProgress>> {
        self.progress_senders
            .lock()
            .await
            .get(id)
            .map(|tx| tx.subscribe())
    }
}

/// Convert a rusqlite Row into a Job.
fn row_to_job(row: &rusqlite::Row) -> rusqlite::Result<Job> {
    let id_str: String = row.get(0)?;
    let filename: String = row.get(1)?;
    let status_str: String = row.get(2)?;
    let config_json: String = row.get(3)?;
    let progress_json: Option<String> = row.get(4)?;
    let result_json: Option<String> = row.get(5)?;
    let error: Option<String> = row.get(6)?;
    let created_at: String = row.get(7)?;
    let updated_at: String = row.get(8)?;

    Ok(Job {
        id: Uuid::parse_str(&id_str).unwrap_or_else(|_| Uuid::nil()),
        filename,
        status: parse_status(&status_str),
        config: serde_json::from_str(&config_json).unwrap_or_else(|_| default_config()),
        progress: progress_json.and_then(|j| serde_json::from_str(&j).ok()),
        result: result_json.and_then(|j| serde_json::from_str(&j).ok()),
        error,
        created_at,
        updated_at,
    })
}

fn status_to_str(status: &JobStatus) -> &'static str {
    match status {
        JobStatus::Pending => "pending",
        JobStatus::Processing => "processing",
        JobStatus::Completed => "completed",
        JobStatus::Failed => "failed",
    }
}

fn parse_status(s: &str) -> JobStatus {
    match s {
        "pending" => JobStatus::Pending,
        "processing" => JobStatus::Processing,
        "completed" => JobStatus::Completed,
        "failed" => JobStatus::Failed,
        _ => JobStatus::Failed,
    }
}

fn now_timestamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}Z", now.as_secs())
}

/// Fallback config when deserialization fails (should not happen in practice).
fn default_config() -> JobConfig {
    JobConfig {
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
    }
}

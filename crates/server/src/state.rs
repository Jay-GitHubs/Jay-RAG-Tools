use crate::jobs::queue::JobQueue;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::task::JoinHandle;
use uuid::Uuid;

/// Shared application state.
#[derive(Clone)]
pub struct AppState {
    /// SQLite-backed job queue.
    pub job_queue: JobQueue,
    /// Directory for uploaded PDFs (temporary storage).
    pub upload_dir: PathBuf,
    /// Default output directory for processed files.
    pub output_dir: PathBuf,
    /// Handles for in-flight processing tasks, keyed by job ID.
    pub task_handles: Arc<tokio::sync::Mutex<HashMap<Uuid, JoinHandle<()>>>>,
}

impl AppState {
    pub fn new(upload_dir: PathBuf, output_dir: PathBuf) -> Arc<Self> {
        let db_path = output_dir.join("jay-rag.db");
        let job_queue = JobQueue::new(&db_path).expect("Failed to initialize job database");

        Arc::new(Self {
            job_queue,
            upload_dir,
            output_dir,
            task_handles: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
        })
    }
}

use crate::jobs::queue::JobQueue;
use std::path::PathBuf;
use std::sync::Arc;

/// Shared application state.
#[derive(Clone)]
pub struct AppState {
    /// SQLite-backed job queue.
    pub job_queue: JobQueue,
    /// Directory for uploaded PDFs (temporary storage).
    pub upload_dir: PathBuf,
    /// Default output directory for processed files.
    pub output_dir: PathBuf,
}

impl AppState {
    pub fn new(upload_dir: PathBuf, output_dir: PathBuf) -> Arc<Self> {
        let db_path = output_dir.join("jay-rag.db");
        let job_queue = JobQueue::new(&db_path).expect("Failed to initialize job database");

        Arc::new(Self {
            job_queue,
            upload_dir,
            output_dir,
        })
    }
}

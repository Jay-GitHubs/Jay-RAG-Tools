use crate::jobs::queue::JobQueue;
use std::path::PathBuf;
use std::sync::Arc;

/// Shared application state.
#[derive(Clone)]
pub struct AppState {
    /// In-memory job queue.
    pub job_queue: JobQueue,
    /// Directory for uploaded PDFs (temporary storage).
    pub upload_dir: PathBuf,
    /// Default output directory for processed files.
    pub output_dir: PathBuf,
}

impl AppState {
    pub fn new(upload_dir: PathBuf, output_dir: PathBuf) -> Arc<Self> {
        Arc::new(Self {
            job_queue: JobQueue::new(),
            upload_dir,
            output_dir,
        })
    }
}

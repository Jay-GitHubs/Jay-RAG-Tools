use super::models::{Job, JobProgress, JobStatus};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, Mutex};
use uuid::Uuid;

/// In-memory job queue with broadcast channels for progress updates.
#[derive(Clone)]
pub struct JobQueue {
    jobs: Arc<Mutex<HashMap<Uuid, Job>>>,
    /// Per-job broadcast senders for progress events.
    progress_senders: Arc<Mutex<HashMap<Uuid, broadcast::Sender<JobProgress>>>>,
}

impl JobQueue {
    pub fn new() -> Self {
        Self {
            jobs: Arc::new(Mutex::new(HashMap::new())),
            progress_senders: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Add a new job to the queue.
    pub async fn add_job(&self, job: Job) -> Uuid {
        let id = job.id;
        let (tx, _) = broadcast::channel(64);
        self.jobs.lock().await.insert(id, job);
        self.progress_senders.lock().await.insert(id, tx);
        id
    }

    /// Get a job by ID.
    pub async fn get_job(&self, id: &Uuid) -> Option<Job> {
        self.jobs.lock().await.get(id).cloned()
    }

    /// List all jobs.
    pub async fn list_jobs(&self) -> Vec<Job> {
        let jobs = self.jobs.lock().await;
        let mut list: Vec<Job> = jobs.values().cloned().collect();
        list.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        list
    }

    /// Update a job's status.
    pub async fn update_status(&self, id: &Uuid, status: JobStatus) {
        if let Some(job) = self.jobs.lock().await.get_mut(id) {
            job.status = status;
        }
    }

    /// Update a job's progress and broadcast to listeners.
    pub async fn update_progress(&self, id: &Uuid, progress: JobProgress) {
        if let Some(job) = self.jobs.lock().await.get_mut(id) {
            job.progress = Some(progress.clone());
        }
        if let Some(tx) = self.progress_senders.lock().await.get(id) {
            let _ = tx.send(progress);
        }
    }

    /// Set a job as completed with results.
    pub async fn set_completed(
        &self,
        id: &Uuid,
        result: super::models::JobResult,
    ) {
        if let Some(job) = self.jobs.lock().await.get_mut(id) {
            job.status = JobStatus::Completed;
            job.result = Some(result);
        }
    }

    /// Set a job as failed with an error message.
    pub async fn set_failed(&self, id: &Uuid, error: String) {
        if let Some(job) = self.jobs.lock().await.get_mut(id) {
            job.status = JobStatus::Failed;
            job.error = Some(error);
        }
    }

    /// Delete a job.
    pub async fn delete_job(&self, id: &Uuid) -> bool {
        let removed = self.jobs.lock().await.remove(id).is_some();
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

impl Default for JobQueue {
    fn default() -> Self {
        Self::new()
    }
}

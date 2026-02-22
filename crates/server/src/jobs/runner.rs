use super::models::{JobProgress, JobResult, JobStatus};
use super::queue::JobQueue;
use jay_rag_core::config::{Language, ProcessingConfig};
use jay_rag_core::progress::ProgressReporter;
use jay_rag_core::provider;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

/// Progress reporter that broadcasts updates via the job queue.
struct WebSocketReporter {
    job_id: Uuid,
    queue: JobQueue,
    images_processed: Arc<Mutex<u32>>,
}

impl ProgressReporter for WebSocketReporter {
    fn on_pdf_start(&self, filename: &str, total_pages: u32) {
        let queue = self.queue.clone();
        let id = self.job_id;
        let msg = format!("Starting: {filename}");
        let progress = JobProgress {
            current_page: 0,
            total_pages,
            images_processed: 0,
            phase: "starting".to_string(),
            message: msg,
        };
        tokio::spawn(async move {
            queue.update_progress(&id, progress).await;
        });
    }

    fn on_page_start(&self, page_num: u32, total_pages: u32) {
        let queue = self.queue.clone();
        let id = self.job_id;
        let imgs = *self.images_processed.lock().unwrap();
        let progress = JobProgress {
            current_page: page_num,
            total_pages,
            images_processed: imgs,
            phase: "processing".to_string(),
            message: format!("Processing page {page_num}/{total_pages}"),
        };
        tokio::spawn(async move {
            queue.update_progress(&id, progress).await;
        });
    }

    fn on_page_complete(&self, page_num: u32, total_pages: u32) {
        let queue = self.queue.clone();
        let id = self.job_id;
        let imgs = *self.images_processed.lock().unwrap();
        let progress = JobProgress {
            current_page: page_num,
            total_pages,
            images_processed: imgs,
            phase: "processing".to_string(),
            message: format!("Completed page {page_num}/{total_pages}"),
        };
        tokio::spawn(async move {
            queue.update_progress(&id, progress).await;
        });
    }

    fn on_image_processed(&self, _page_num: u32, _image_index: u32, _desc: &str) {
        let mut count = self.images_processed.lock().unwrap();
        *count += 1;
    }

    fn on_pdf_complete(&self, filename: &str, total_images: u32) {
        let queue = self.queue.clone();
        let id = self.job_id;
        let msg = format!("Complete: {filename} ({total_images} images)");
        let progress = JobProgress {
            current_page: 0,
            total_pages: 0,
            images_processed: total_images,
            phase: "complete".to_string(),
            message: msg,
        };
        tokio::spawn(async move {
            queue.update_progress(&id, progress).await;
        });
    }

    fn on_error(&self, page_num: u32, error: &str) {
        let queue = self.queue.clone();
        let id = self.job_id;
        let imgs = *self.images_processed.lock().unwrap();
        let progress = JobProgress {
            current_page: page_num,
            total_pages: 0,
            images_processed: imgs,
            phase: "error".to_string(),
            message: format!("Error on page {page_num}: {error}"),
        };
        tokio::spawn(async move {
            queue.update_progress(&id, progress).await;
        });
    }
}

/// Run a processing job in the background.
pub async fn run_job(
    job_id: Uuid,
    pdf_path: PathBuf,
    output_dir: PathBuf,
    queue: JobQueue,
    provider_name: String,
    model: String,
    language: String,
    start_page: Option<u32>,
    end_page: Option<u32>,
    table_extraction: bool,
    text_only: bool,
) {
    queue
        .update_status(&job_id, JobStatus::Processing)
        .await;

    let lang = language.parse::<Language>().unwrap_or_default();

    let config = ProcessingConfig {
        language: lang,
        table_extraction: if text_only { false } else { table_extraction },
        text_only,
        ..Default::default()
    };

    let vision_provider: Option<Box<dyn jay_rag_core::VisionProvider>> = if text_only {
        None
    } else {
        match provider::create_provider(&provider_name, &model) {
            Ok(p) => Some(p),
            Err(e) => {
                queue.set_failed(&job_id, e.to_string()).await;
                return;
            }
        }
    };

    let reporter = WebSocketReporter {
        job_id,
        queue: queue.clone(),
        images_processed: Arc::new(Mutex::new(0)),
    };

    match jay_rag_core::process_pdf(
        &pdf_path,
        &output_dir,
        vision_provider.as_deref(),
        &config,
        &reporter,
        start_page,
        end_page,
    )
    .await
    {
        Ok(result) => {
            let job_result = JobResult {
                markdown_path: result.markdown_path.to_string_lossy().to_string(),
                metadata_path: result.metadata_path.to_string_lossy().to_string(),
                image_count: result.image_count,
                images_dir: output_dir
                    .join("images")
                    .to_string_lossy()
                    .to_string(),
            };
            queue.set_completed(&job_id, job_result).await;
        }
        Err(e) => {
            queue.set_failed(&job_id, e.to_string()).await;
        }
    }
}

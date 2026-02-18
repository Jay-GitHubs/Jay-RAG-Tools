/// Trait for reporting processing progress.
///
/// Implementations can target CLI (indicatif), WebSocket, or any other channel.
pub trait ProgressReporter: Send + Sync {
    /// Called when processing of a PDF starts.
    fn on_pdf_start(&self, filename: &str, total_pages: u32);

    /// Called when processing of a page begins.
    fn on_page_start(&self, page_num: u32, total_pages: u32);

    /// Called when a page has been fully processed.
    fn on_page_complete(&self, page_num: u32, total_pages: u32);

    /// Called when an individual image has been processed.
    fn on_image_processed(&self, page_num: u32, image_index: u32, description_preview: &str);

    /// Called when processing of a PDF completes.
    fn on_pdf_complete(&self, filename: &str, total_images: u32);

    /// Called on non-fatal errors.
    fn on_error(&self, page_num: u32, error: &str);
}

/// A no-op progress reporter that discards all events.
pub struct SilentReporter;

impl ProgressReporter for SilentReporter {
    fn on_pdf_start(&self, _filename: &str, _total_pages: u32) {}
    fn on_page_start(&self, _page_num: u32, _total_pages: u32) {}
    fn on_page_complete(&self, _page_num: u32, _total_pages: u32) {}
    fn on_image_processed(&self, _page_num: u32, _image_index: u32, _desc: &str) {}
    fn on_pdf_complete(&self, _filename: &str, _total_images: u32) {}
    fn on_error(&self, _page_num: u32, _error: &str) {}
}

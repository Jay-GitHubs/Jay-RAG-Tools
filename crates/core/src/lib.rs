pub mod config;
pub mod error;
pub mod metadata;
pub mod pdf;
pub mod processor;
pub mod progress;
pub mod prompts;
pub mod provider;
pub mod table;

pub use config::ProcessingConfig;
pub use error::{CoreError, CoreResult};
pub use metadata::ImageMetadata;
pub use processor::process_pdf;
pub use progress::ProgressReporter;
pub use provider::VisionProvider;

pub mod config;
pub mod error;
pub mod metadata;
pub mod pdf;
pub mod processor;
pub mod progress;
pub mod prompts;
pub mod provider;
pub mod table;
pub mod trash;

pub use config::{ProcessingConfig, Quality};
pub use error::{CoreError, CoreResult};
pub use metadata::ImageMetadata;
pub use processor::{clean_markdown, process_pdf};
pub use progress::ProgressReporter;
pub use provider::VisionProvider;
pub use trash::{TrashDetection, TrashType};

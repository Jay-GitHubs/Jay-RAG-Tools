use thiserror::Error;

/// Result type alias using [`CoreError`].
pub type CoreResult<T> = Result<T, CoreError>;

/// Errors that can occur during PDF processing.
#[derive(Debug, Error)]
pub enum CoreError {
    #[error("PDF error: {0}")]
    Pdf(String),

    #[error("Image error: {0}")]
    Image(String),

    #[error("Provider error: {0}")]
    Provider(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("Config error: {0}")]
    Config(String),

    #[error("Pdfium error: {0}")]
    Pdfium(String),
}

use serde::{Deserialize, Serialize};

/// Type of image extracted from PDF.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ImageType {
    /// Entire page rendered as image (Strategy A).
    FullPage,
    /// Individual image extracted from page (Strategy B).
    ExtractedImage,
    /// Table region detected and extracted.
    TableRegion,
}

/// Metadata for a single extracted/rendered image.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
    /// Filename of the saved image.
    pub image_file: String,

    /// 1-indexed page number.
    pub page: u32,

    /// Image index on the page (for extracted images).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub index: Option<u32>,

    /// How this image was produced.
    #[serde(rename = "type")]
    pub image_type: ImageType,

    /// Image width in pixels (for extracted images).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<u32>,

    /// Image height in pixels (for extracted images).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<u32>,

    /// Vision LLM description of the image.
    pub description: String,

    /// Source PDF filename (without extension).
    pub source_doc: String,

    /// Provider name used for description.
    pub provider: String,

    /// Model name used for description.
    pub model: String,
}

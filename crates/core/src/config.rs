use serde::{Deserialize, Serialize};

/// Language for prompts and output.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    /// Thai (default)
    Th,
    /// English
    En,
}

impl Default for Language {
    fn default() -> Self {
        Self::Th
    }
}

impl std::fmt::Display for Language {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Th => write!(f, "th"),
            Self::En => write!(f, "en"),
        }
    }
}

impl std::str::FromStr for Language {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "th" => Ok(Self::Th),
            "en" => Ok(Self::En),
            other => Err(format!("Unknown language: {other}. Use: th | en")),
        }
    }
}

/// Configuration for PDF processing.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingConfig {
    /// DPI for rendering pages as images (default: 150).
    pub image_dpi: u32,

    /// Skip images smaller than this dimension in pixels (default: 100).
    pub min_image_size: u32,

    /// Pages where images cover more than this fraction trigger full-page render (default: 0.5).
    pub page_as_image_threshold: f64,

    /// Document language for prompts.
    pub language: Language,

    /// Maximum retry attempts for LLM calls (default: 3).
    pub max_retries: u32,

    /// Delay between retries in milliseconds (default: 2000).
    pub retry_delay_ms: u64,

    /// Enable table extraction (default: true).
    pub table_extraction: bool,

    /// Text-only mode: extract text only, skip images and LLM calls (default: false).
    #[serde(default)]
    pub text_only: bool,

    /// Max pages processed concurrently (default: 4).
    #[serde(default = "default_concurrent_pages")]
    pub max_concurrent_pages: usize,

    /// Max images described concurrently within a single page (default: 5).
    #[serde(default = "default_concurrent_images")]
    pub max_concurrent_images: usize,

    /// Enable trash detection (default: true).
    #[serde(default = "default_true")]
    pub detect_trash: bool,
}

fn default_concurrent_pages() -> usize {
    4
}

fn default_concurrent_images() -> usize {
    5
}

fn default_true() -> bool {
    true
}

impl Default for ProcessingConfig {
    fn default() -> Self {
        Self {
            image_dpi: 150,
            min_image_size: 100,
            page_as_image_threshold: 0.5,
            language: Language::default(),
            max_retries: 3,
            retry_delay_ms: 2000,
            table_extraction: true,
            text_only: false,
            max_concurrent_pages: default_concurrent_pages(),
            max_concurrent_images: default_concurrent_images(),
            detect_trash: true,
        }
    }
}

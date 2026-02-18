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
        }
    }
}

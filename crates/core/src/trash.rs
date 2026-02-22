use serde::{Deserialize, Serialize};

/// Type of detected low-value content.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TrashType {
    TableOfContents,
    Boilerplate,
    BlankPage,
    HeaderFooter,
}

impl std::fmt::Display for TrashType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::TableOfContents => write!(f, "Table of Contents"),
            Self::Boilerplate => write!(f, "Boilerplate"),
            Self::BlankPage => write!(f, "Blank page"),
            Self::HeaderFooter => write!(f, "Header/Footer"),
        }
    }
}

/// A detected trash item on a specific page.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashDetection {
    /// 1-indexed page number.
    pub page: u32,
    /// Type of trash detected.
    pub trash_type: TrashType,
    /// Confidence score (0.0–1.0).
    pub confidence: f64,
    /// Human-readable explanation.
    pub reason: String,
    /// First ~200 chars of the page content.
    pub preview: String,
}

/// Run all trash detectors on a set of page texts.
///
/// `page_texts` is a slice of `(page_num_0indexed, text)` pairs.
/// Returns detections with 1-indexed page numbers.
pub fn detect_trash(page_texts: &[(u32, String)]) -> Vec<TrashDetection> {
    let mut detections = Vec::new();
    for (page_num, text) in page_texts {
        let page_1indexed = page_num + 1;
        if let Some(d) = detect_toc(page_1indexed, text) {
            detections.push(d);
        }
        if let Some(d) = detect_boilerplate(page_1indexed, text) {
            detections.push(d);
        }
        if let Some(d) = detect_blank(page_1indexed, text) {
            detections.push(d);
        }
    }
    detections
}

/// Create TrashDetection entries for headers/footers that were detected.
///
/// These are informational (the stripping already happened).
pub fn create_header_footer_detections(
    page_texts: &[(u32, String)],
    headers: &[String],
    footers: &[String],
) -> Vec<TrashDetection> {
    if headers.is_empty() && footers.is_empty() {
        return Vec::new();
    }

    // Create one summary detection for the whole document rather than per-page
    let mut parts = Vec::new();
    for h in headers {
        parts.push(format!("Header: \"{h}\""));
    }
    for f in footers {
        parts.push(format!("Footer: \"{f}\""));
    }
    let reason = format!(
        "Repeated text stripped from {} pages: {}",
        page_texts.len(),
        parts.join(", ")
    );
    let preview = parts.join("; ");
    let preview = truncate_preview(&preview);

    vec![TrashDetection {
        page: 0, // 0 = document-level
        trash_type: TrashType::HeaderFooter,
        confidence: 1.0,
        reason,
        preview,
    }]
}

/// Detect Table of Contents pages.
///
/// Looks for "สารบัญ" / "Table of Contents" heading or 5+ dot-leader lines.
fn detect_toc(page: u32, text: &str) -> Option<TrashDetection> {
    let lower = text.to_lowercase();

    // Thai TOC heading
    let has_heading = text.contains("สารบัญ")
        || lower.contains("table of contents")
        || lower.contains("contents");

    // Dot-leader pattern: text followed by dots and a page number
    let dot_leader_count = text
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            // Match patterns like "Chapter 1 ..... 5" or "บทที่ 1 ......... 12"
            (trimmed.contains("...") || trimmed.contains("…"))
                && trimmed
                    .chars()
                    .last()
                    .map(|c| c.is_ascii_digit())
                    .unwrap_or(false)
        })
        .count();

    if has_heading && dot_leader_count >= 3 {
        Some(TrashDetection {
            page,
            trash_type: TrashType::TableOfContents,
            confidence: 0.95,
            reason: format!(
                "TOC heading keyword found with {dot_leader_count} dot-leader lines"
            ),
            preview: truncate_preview(text),
        })
    } else if has_heading {
        Some(TrashDetection {
            page,
            trash_type: TrashType::TableOfContents,
            confidence: 0.90,
            reason: "TOC heading keyword found".to_string(),
            preview: truncate_preview(text),
        })
    } else if dot_leader_count >= 5 {
        Some(TrashDetection {
            page,
            trash_type: TrashType::TableOfContents,
            confidence: 0.70,
            reason: format!("{dot_leader_count} dot-leader lines detected (possible TOC)"),
            preview: truncate_preview(text),
        })
    } else {
        None
    }
}

/// Detect boilerplate/legal pages (copyright, disclaimer, etc.).
fn detect_boilerplate(page: u32, text: &str) -> Option<TrashDetection> {
    let lower = text.to_lowercase();

    let keywords = [
        "copyright",
        "ลิขสิทธิ์",
        "all rights reserved",
        "สงวนลิขสิทธิ์",
        "disclaimer",
        "ข้อจำกัดความรับผิดชอบ",
        "terms of use",
        "terms and conditions",
        "ข้อกำหนดและเงื่อนไข",
        "confidential",
        "ความลับ",
    ];

    let matched: Vec<&str> = keywords
        .iter()
        .filter(|kw| lower.contains(*kw) || text.contains(*kw))
        .copied()
        .collect();

    let match_count = matched.len();

    if match_count >= 2 {
        Some(TrashDetection {
            page,
            trash_type: TrashType::Boilerplate,
            confidence: 0.85,
            reason: format!(
                "Multiple boilerplate keywords: {}",
                matched.join(", ")
            ),
            preview: truncate_preview(text),
        })
    } else if match_count == 1 && text.len() < 500 {
        Some(TrashDetection {
            page,
            trash_type: TrashType::Boilerplate,
            confidence: 0.65,
            reason: format!(
                "Boilerplate keyword \"{}\" on short page ({} chars)",
                matched[0],
                text.len()
            ),
            preview: truncate_preview(text),
        })
    } else {
        None
    }
}

/// Detect blank or nearly-blank pages.
fn detect_blank(page: u32, text: &str) -> Option<TrashDetection> {
    let trimmed = text.trim();
    let lower = trimmed.to_lowercase();

    // Explicit blank page markers
    let has_marker = lower.contains("this page intentionally left blank")
        || trimmed.contains("หน้านี้ว่างโดยตั้งใจ")
        || lower.contains("intentionally blank");

    if has_marker {
        Some(TrashDetection {
            page,
            trash_type: TrashType::BlankPage,
            confidence: 0.95,
            reason: "Explicit blank page marker found".to_string(),
            preview: truncate_preview(trimmed),
        })
    } else if trimmed.len() < 50 {
        Some(TrashDetection {
            page,
            trash_type: TrashType::BlankPage,
            confidence: 0.80,
            reason: format!("Nearly blank page ({} chars)", trimmed.len()),
            preview: truncate_preview(trimmed),
        })
    } else {
        None
    }
}

/// Truncate text to at most 200 chars for preview, respecting char boundaries.
fn truncate_preview(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.len() <= 200 {
        return trimmed.to_string();
    }
    let mut end = 200;
    while end > 0 && !trimmed.is_char_boundary(end) {
        end -= 1;
    }
    format!("{}...", &trimmed[..end])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_blank_empty() {
        let result = detect_blank(1, "   ");
        assert!(result.is_some());
        let d = result.unwrap();
        assert_eq!(d.trash_type, TrashType::BlankPage);
        assert!(d.confidence >= 0.80);
    }

    #[test]
    fn test_detect_blank_marker() {
        let result = detect_blank(1, "This page intentionally left blank");
        assert!(result.is_some());
        assert_eq!(result.unwrap().confidence, 0.95);
    }

    #[test]
    fn test_detect_toc_heading() {
        let text = "สารบัญ\nบทที่ 1 ..... 5\nบทที่ 2 ..... 12\nบทที่ 3 ..... 20";
        let result = detect_toc(1, text);
        assert!(result.is_some());
        let d = result.unwrap();
        assert_eq!(d.trash_type, TrashType::TableOfContents);
        assert!(d.confidence >= 0.90);
    }

    #[test]
    fn test_detect_boilerplate_multiple_keywords() {
        let text = "Copyright 2024 Company. All rights reserved. สงวนลิขสิทธิ์";
        let result = detect_boilerplate(1, text);
        assert!(result.is_some());
        let d = result.unwrap();
        assert_eq!(d.trash_type, TrashType::Boilerplate);
        assert!(d.confidence >= 0.85);
    }

    #[test]
    fn test_detect_boilerplate_single_keyword_long_page() {
        let text = format!("Copyright 2024. {}", "x".repeat(600));
        let result = detect_boilerplate(1, &text);
        assert!(result.is_none()); // Long page with single keyword = no detection
    }

    #[test]
    fn test_no_false_positive_on_normal_text() {
        let text = "This is a normal paragraph about the product features. \
                     It describes how to install and configure the system.";
        assert!(detect_toc(1, text).is_none());
        assert!(detect_boilerplate(1, text).is_none());
        assert!(detect_blank(1, text).is_none());
    }

    #[test]
    fn test_detect_trash_combined() {
        let pages = vec![
            (0, "สารบัญ\nบทที่ 1 บทนำเบื้องต้น ..... 5\nบทที่ 2 การติดตั้ง ..... 12\nบทที่ 3 การใช้งาน ..... 20".to_string()),
            (1, "Normal content here with enough text to pass blank detection.".to_string()),
            (2, "  ".to_string()),
        ];
        let results = detect_trash(&pages);
        assert_eq!(results.len(), 2); // TOC + blank
    }

    #[test]
    fn test_header_footer_detections() {
        let pages = vec![
            (0, "content".to_string()),
            (1, "content".to_string()),
        ];
        let headers = vec!["Company Name".to_string()];
        let footers = vec![];
        let results = create_header_footer_detections(&pages, &headers, &footers);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].trash_type, TrashType::HeaderFooter);
        assert_eq!(results[0].page, 0); // document-level
    }
}

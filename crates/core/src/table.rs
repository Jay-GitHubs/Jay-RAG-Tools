/// Heuristic to detect if text content looks like a table.
///
/// Uses two detection methods:
/// 1. Multi-space columns: lines with 2+ groups of 2+ consecutive spaces
/// 2. Row consistency: consecutive lines with similar token counts (≥3 tokens),
///    which catches tables where pdfium collapses column gaps to single spaces
pub fn looks_like_table(text: &str) -> bool {
    let non_empty: Vec<&str> = text
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect();

    if non_empty.len() < 3 {
        return false;
    }

    // Method 1: Multi-space column detection (original)
    let tabular_lines = non_empty
        .iter()
        .filter(|line| {
            let mut space_groups = 0;
            let mut in_spaces = false;
            let mut space_count = 0;
            for ch in line.chars() {
                if ch == ' ' || ch == '\t' {
                    space_count += 1;
                    if space_count >= 2 && !in_spaces {
                        space_groups += 1;
                        in_spaces = true;
                    }
                } else {
                    space_count = 0;
                    in_spaces = false;
                }
            }
            space_groups >= 2
        })
        .count();

    if (tabular_lines as f64 / non_empty.len() as f64) >= 0.4 {
        return true;
    }

    // Method 2: Row consistency — consecutive lines with similar token counts.
    // pdfium often extracts table columns with single spaces, making multi-space
    // detection fail. Instead, check if 6+ consecutive lines each have ≥3
    // whitespace-separated tokens with counts varying by at most 2.
    // Threshold of 6 avoids false positives from bullet lists and TOC entries.
    let token_counts: Vec<usize> = non_empty
        .iter()
        .map(|line| line.split_whitespace().count())
        .collect();

    let mut best_run = 1;
    let mut current_run = 1;

    for i in 1..token_counts.len() {
        let prev = token_counts[i - 1];
        let curr = token_counts[i];
        if prev >= 3 && curr >= 3 && ((prev as isize) - (curr as isize)).abs() <= 2 {
            current_run += 1;
            best_run = best_run.max(current_run);
        } else {
            current_run = 1;
        }
    }

    best_run >= 6
}

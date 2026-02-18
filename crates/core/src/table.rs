/// Simple heuristic to detect if text content looks like a table.
///
/// Checks for patterns common in tabular data:
/// - Multiple lines with consistent column-like spacing
/// - Lines with multiple runs of 2+ spaces (column separators)
pub fn looks_like_table(text: &str) -> bool {
    let lines: Vec<&str> = text.lines().collect();
    if lines.len() < 3 {
        return false;
    }

    // Count lines that have multiple "columns" (2+ spaces between words)
    let tabular_lines = lines
        .iter()
        .filter(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                return false;
            }
            // Count groups of 2+ consecutive spaces
            let mut space_groups = 0;
            let mut in_spaces = false;
            let mut space_count = 0;
            for ch in trimmed.chars() {
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

    // If more than 40% of non-empty lines look tabular, it's likely a table
    let non_empty = lines.iter().filter(|l| !l.trim().is_empty()).count();
    if non_empty == 0 {
        return false;
    }

    (tabular_lines as f64 / non_empty as f64) >= 0.4
}

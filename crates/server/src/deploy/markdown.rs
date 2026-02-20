use std::path::Path;
use tracing::info;

use crate::deploy::flowise;
use crate::routes::deploy::MarkdownTarget;

/// Deploy converted markdown to the chosen target. Returns a summary string.
pub async fn deploy_markdown(
    target: &MarkdownTarget,
    markdown: &str,
    doc_stem: &str,
) -> Result<String, String> {
    match target {
        MarkdownTarget::LocalFolder { path } => {
            deploy_to_local(markdown, doc_stem, path).await
        }
        MarkdownTarget::Flowise {
            base_url,
            api_key,
            store_id,
        } => flowise::upsert_document(base_url, api_key, store_id, markdown).await,
    }
}

async fn deploy_to_local(markdown: &str, doc_stem: &str, dest_path: &str) -> Result<String, String> {
    let dest = Path::new(dest_path);
    tokio::fs::create_dir_all(dest)
        .await
        .map_err(|e| format!("Failed to create destination directory: {e}"))?;

    let filename = format!("{doc_stem}.md");
    let file_path = dest.join(&filename);
    tokio::fs::write(&file_path, markdown.as_bytes())
        .await
        .map_err(|e| format!("Failed to write markdown file: {e}"))?;

    info!("Deployed markdown to {}", file_path.display());
    Ok(format!("Markdown saved to {}", file_path.display()))
}

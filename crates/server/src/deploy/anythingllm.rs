use serde_json::json;
use tracing::info;

/// Upload a document to AnythingLLM via the raw-text API endpoint.
pub async fn upload_document(
    base_url: &str,
    api_key: &str,
    workspace_slug: &str,
    markdown: &str,
    doc_title: &str,
) -> Result<String, String> {
    let url = format!(
        "{}/api/v1/document/raw-text",
        base_url.trim_end_matches('/')
    );

    let body = json!({
        "textContent": markdown,
        "metadata": { "title": doc_title },
        "addToWorkspaces": [workspace_slug]
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {api_key}"))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("AnythingLLM API request failed: {e}"))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read AnythingLLM response: {e}"))?;

    if !status.is_success() {
        return Err(format!(
            "AnythingLLM API returned {status}: {response_text}"
        ));
    }

    info!("Successfully uploaded document to AnythingLLM workspace {workspace_slug}");
    Ok(format!(
        "Document uploaded to AnythingLLM workspace \"{workspace_slug}\""
    ))
}

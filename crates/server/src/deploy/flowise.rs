use serde_json::json;
use tracing::info;

/// Upsert a document into a Flowise Document Store via the REST API.
pub async fn upsert_document(
    base_url: &str,
    api_key: &str,
    store_id: &str,
    markdown: &str,
) -> Result<String, String> {
    let url = format!(
        "{}/api/v1/document-store/upsert/{}",
        base_url.trim_end_matches('/'),
        store_id
    );

    let body = json!({
        "docLoaders": [{
            "loader": "plainText",
            "loaderConfig": {
                "text": markdown
            }
        }]
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
        .map_err(|e| format!("Flowise API request failed: {e}"))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read Flowise response: {e}"))?;

    if !status.is_success() {
        return Err(format!(
            "Flowise API returned {status}: {response_text}"
        ));
    }

    info!("Successfully upserted document to Flowise store {store_id}");
    Ok(format!("Document upserted to Flowise store {store_id}"))
}

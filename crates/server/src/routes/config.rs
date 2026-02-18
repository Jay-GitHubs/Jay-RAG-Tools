use axum::Json;
use jay_rag_core::provider;
use serde::Serialize;

#[derive(Serialize)]
pub struct ConfigResponse {
    pub providers: Vec<ProviderInfo>,
    pub languages: Vec<LanguageInfo>,
    pub storage_backends: Vec<&'static str>,
}

#[derive(Serialize)]
pub struct ProviderInfo {
    pub name: &'static str,
    pub display_name: &'static str,
    pub default_model: &'static str,
    pub models: Vec<&'static str>,
    pub cost_per_image_usd: f64,
}

#[derive(Serialize)]
pub struct LanguageInfo {
    pub code: &'static str,
    pub name: &'static str,
}

/// Get available configuration options.
pub async fn get_config() -> Json<ConfigResponse> {
    let providers = provider::all_providers()
        .iter()
        .map(|p| ProviderInfo {
            name: p.name,
            display_name: p.display_name,
            default_model: p.default_model,
            models: p.models.to_vec(),
            cost_per_image_usd: p.cost_per_image_usd,
        })
        .collect();

    Json(ConfigResponse {
        providers,
        languages: vec![
            LanguageInfo {
                code: "th",
                name: "Thai",
            },
            LanguageInfo {
                code: "en",
                name: "English",
            },
        ],
        storage_backends: vec!["local", "s3", "nfs"],
    })
}

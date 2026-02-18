use axum::Json;
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
    pub default_model: &'static str,
    pub models: Vec<&'static str>,
}

#[derive(Serialize)]
pub struct LanguageInfo {
    pub code: &'static str,
    pub name: &'static str,
}

/// Get available configuration options.
pub async fn get_config() -> Json<ConfigResponse> {
    Json(ConfigResponse {
        providers: vec![
            ProviderInfo {
                name: "ollama",
                default_model: "qwen2.5vl",
                models: vec!["qwen2.5vl", "qwen2.5vl:72b", "llama3.2-vision", "minicpm-v"],
            },
            ProviderInfo {
                name: "openai",
                default_model: "gpt-4o",
                models: vec!["gpt-4o", "gpt-4o-mini"],
            },
            ProviderInfo {
                name: "claude",
                default_model: "claude-opus-4-6",
                models: vec!["claude-opus-4-6", "claude-sonnet-4-6"],
            },
        ],
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

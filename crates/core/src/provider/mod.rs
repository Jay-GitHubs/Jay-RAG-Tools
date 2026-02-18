pub mod anthropic;
pub mod ollama;
pub mod openai;

use crate::error::{CoreError, CoreResult};

/// Trait for vision LLM providers that can describe images.
#[async_trait::async_trait]
pub trait VisionProvider: Send + Sync {
    /// Send a base64-encoded image to the vision model with a prompt.
    ///
    /// Returns the text description/transcription from the model.
    async fn ask(&self, image_b64: &str, prompt: &str, retries: u32) -> CoreResult<String>;

    /// Verify that this provider is available and correctly configured.
    async fn check(&self) -> CoreResult<()>;

    /// The provider name (e.g., "ollama", "openai", "claude").
    fn provider_name(&self) -> &str;

    /// The model name being used.
    fn model_name(&self) -> &str;
}

/// Default model for each provider.
pub fn default_model(provider_name: &str) -> &'static str {
    match provider_name {
        "ollama" => "qwen2.5vl",
        "openai" => "gpt-4o",
        "claude" => "claude-opus-4-6",
        _ => "qwen2.5vl",
    }
}

/// Factory: create a provider by name and model.
pub fn create_provider(
    provider_name: &str,
    model: &str,
) -> CoreResult<Box<dyn VisionProvider>> {
    match provider_name {
        "ollama" => Ok(Box::new(ollama::OllamaProvider::new(model))),
        "openai" => Ok(Box::new(openai::OpenAIProvider::new(model))),
        "claude" => Ok(Box::new(anthropic::AnthropicProvider::new(model))),
        other => Err(CoreError::Config(format!(
            "Unknown provider '{other}'. Use: ollama | openai | claude"
        ))),
    }
}

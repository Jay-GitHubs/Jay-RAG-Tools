use crate::error::{CoreError, CoreResult};
use crate::provider::VisionProvider;
use genai::chat::{ChatMessage, ChatRequest, ContentPart, MessageContent};
use genai::Client;

/// Vision provider using local Ollama instance.
pub struct OllamaProvider {
    model: String,
    client: Client,
}

impl OllamaProvider {
    pub fn new(model: &str) -> Self {
        Self {
            model: model.to_string(),
            client: Client::default(),
        }
    }
}

#[async_trait::async_trait]
impl VisionProvider for OllamaProvider {
    async fn ask(&self, image_b64: &str, prompt: &str, retries: u32) -> CoreResult<String> {
        let mut last_error = String::new();

        for attempt in 0..retries {
            let image_part =
                ContentPart::from_binary_base64("image/png", image_b64, None::<String>);

            let message = ChatMessage::user(
                MessageContent::from_text(prompt).append(image_part),
            );

            let request = ChatRequest::from_messages(vec![message]);

            match self.client.exec_chat(&self.model, request, None).await {
                Ok(response) => {
                    let text = response
                        .first_text()
                        .unwrap_or_default()
                        .to_string();
                    return Ok(text.trim().to_string());
                }
                Err(e) => {
                    last_error = format!("{e}");
                    if attempt < retries - 1 {
                        tracing::warn!(
                            "Ollama error (attempt {}/{}): {}",
                            attempt + 1,
                            retries,
                            e
                        );
                        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                    }
                }
            }
        }

        Ok(format!("[Ollama error: {last_error}]"))
    }

    async fn check(&self) -> CoreResult<()> {
        tracing::info!("Checking Ollama model '{}'...", self.model);

        let host =
            std::env::var("OLLAMA_HOST").unwrap_or_else(|_| "http://localhost:11434".to_string());
        let url = format!("{host}/api/tags");

        let resp = reqwest::get(&url).await.map_err(|e| {
            CoreError::Provider(format!(
                "Cannot connect to Ollama at {host}: {e}\nMake sure Ollama is running: ollama serve"
            ))
        })?;

        let body: serde_json::Value = resp.json().await.map_err(|e| {
            CoreError::Provider(format!("Invalid response from Ollama: {e}"))
        })?;

        let empty = vec![];
        let models = body["models"]
            .as_array()
            .unwrap_or(&empty)
            .iter()
            .filter_map(|m| m["name"].as_str())
            .collect::<Vec<_>>();

        if !models.iter().any(|m| m.contains(&self.model.as_str())) {
            return Err(CoreError::Provider(format!(
                "Model '{}' not found in Ollama.\nRun: ollama pull {}\nAvailable: {}",
                self.model,
                self.model,
                if models.is_empty() {
                    "none".to_string()
                } else {
                    models.join(", ")
                }
            )));
        }

        tracing::info!("Ollama model '{}' is ready.", self.model);
        Ok(())
    }

    fn provider_name(&self) -> &str {
        "ollama"
    }

    fn model_name(&self) -> &str {
        &self.model
    }
}

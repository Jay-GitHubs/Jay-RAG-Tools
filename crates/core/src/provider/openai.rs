use crate::error::{CoreError, CoreResult};
use crate::provider::VisionProvider;
use genai::chat::{ChatMessage, ChatRequest, ContentPart, MessageContent};
use genai::Client;

/// Vision provider using OpenAI GPT-4o.
pub struct OpenAIProvider {
    model: String,
    client: Client,
}

impl OpenAIProvider {
    pub fn new(model: &str) -> Self {
        Self {
            model: model.to_string(),
            client: Client::default(),
        }
    }
}

#[async_trait::async_trait]
impl VisionProvider for OpenAIProvider {
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
                            "OpenAI error (attempt {}/{}): {}",
                            attempt + 1,
                            retries,
                            e
                        );
                        tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                    }
                }
            }
        }

        Ok(format!("[OpenAI error: {last_error}]"))
    }

    async fn check(&self) -> CoreResult<()> {
        if std::env::var("OPENAI_API_KEY").is_err() {
            return Err(CoreError::Provider(
                "Missing OPENAI_API_KEY environment variable.\nRun: export OPENAI_API_KEY='sk-...'"
                    .to_string(),
            ));
        }
        tracing::info!("OpenAI model '{}' ready. (API key found)", self.model);
        Ok(())
    }

    fn provider_name(&self) -> &str {
        "openai"
    }

    fn model_name(&self) -> &str {
        &self.model
    }
}

use crate::error::{CoreError, CoreResult};
use genai::chat::{ChatMessage, ChatRequest, ContentPart, MessageContent};
use genai::Client;

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

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

/// Whether a provider runs locally or in the cloud.
#[derive(Debug, Clone, Copy)]
pub enum ProviderKind {
    /// Local provider (e.g. Ollama) — checked via HTTP health endpoint.
    Local {
        host_env: &'static str,
        default_host: &'static str,
    },
    /// Cloud provider — checked by verifying the API key env var exists.
    Cloud {
        api_key_env: &'static str,
        env_hint: &'static str,
    },
}

/// Static metadata for a registered provider.
#[derive(Debug, Clone)]
pub struct ProviderMeta {
    /// Short identifier used in CLI flags and config (e.g. `"ollama"`).
    pub name: &'static str,
    /// Human-readable display name (e.g. `"Ollama (Local)"`).
    pub display_name: &'static str,
    /// Provider kind (local vs cloud).
    pub kind: ProviderKind,
    /// Default model when none is specified.
    pub default_model: &'static str,
    /// Available model choices for the UI dropdown.
    pub models: &'static [&'static str],
    /// Approximate cost per image in USD (0.0 for free/local).
    pub cost_per_image_usd: f64,
}

/// All registered providers.
pub static PROVIDERS: &[ProviderMeta] = &[
    ProviderMeta {
        name: "ollama",
        display_name: "Ollama (Local)",
        kind: ProviderKind::Local {
            host_env: "OLLAMA_HOST",
            default_host: "http://localhost:11434",
        },
        default_model: "qwen2.5vl",
        models: &["qwen2.5vl", "qwen2.5vl:72b", "llama3.2-vision", "minicpm-v"],
        cost_per_image_usd: 0.0,
    },
    ProviderMeta {
        name: "openai",
        display_name: "OpenAI",
        kind: ProviderKind::Cloud {
            api_key_env: "OPENAI_API_KEY",
            env_hint: "export OPENAI_API_KEY='sk-...'",
        },
        default_model: "gpt-4o",
        models: &["gpt-4o", "gpt-4o-mini"],
        cost_per_image_usd: 0.01,
    },
    ProviderMeta {
        name: "claude",
        display_name: "Anthropic Claude",
        kind: ProviderKind::Cloud {
            api_key_env: "ANTHROPIC_API_KEY",
            env_hint: "export ANTHROPIC_API_KEY='sk-ant-...'",
        },
        default_model: "claude-sonnet-4-6",
        models: &["claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
        cost_per_image_usd: 0.01,
    },
    ProviderMeta {
        name: "gemini",
        display_name: "Google Gemini",
        kind: ProviderKind::Cloud {
            api_key_env: "GEMINI_API_KEY",
            env_hint: "export GEMINI_API_KEY='...'",
        },
        default_model: "gemini-2.0-flash",
        models: &["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
        cost_per_image_usd: 0.0025,
    },
    ProviderMeta {
        name: "xai",
        display_name: "xAI Grok",
        kind: ProviderKind::Cloud {
            api_key_env: "XAI_API_KEY",
            env_hint: "export XAI_API_KEY='...'",
        },
        default_model: "grok-2-vision",
        models: &["grok-2-vision"],
        cost_per_image_usd: 0.005,
    },
    ProviderMeta {
        name: "groq",
        display_name: "Groq",
        kind: ProviderKind::Cloud {
            api_key_env: "GROQ_API_KEY",
            env_hint: "export GROQ_API_KEY='...'",
        },
        default_model: "groq::llama-3.2-90b-vision-preview",
        models: &[
            "groq::llama-3.2-90b-vision-preview",
            "groq::llama-3.2-11b-vision-preview",
        ],
        cost_per_image_usd: 0.002,
    },
];

/// Look up a provider by name.
pub fn find_provider(name: &str) -> Option<&'static ProviderMeta> {
    PROVIDERS.iter().find(|p| p.name == name)
}

/// Return all registered providers.
pub fn all_providers() -> &'static [ProviderMeta] {
    PROVIDERS
}

/// Default model for a given provider name.
pub fn default_model(provider_name: &str) -> &'static str {
    find_provider(provider_name)
        .map(|p| p.default_model)
        .unwrap_or("qwen2.5vl")
}

/// Factory: create a provider by name and model.
pub fn create_provider(
    provider_name: &str,
    model: &str,
) -> CoreResult<Box<dyn VisionProvider>> {
    let meta = find_provider(provider_name).ok_or_else(|| {
        let names: Vec<&str> = PROVIDERS.iter().map(|p| p.name).collect();
        CoreError::Config(format!(
            "Unknown provider '{provider_name}'. Use: {}",
            names.join(" | ")
        ))
    })?;

    Ok(Box::new(GenaiProvider {
        meta,
        model: model.to_string(),
        client: Client::default(),
    }))
}

// ---------------------------------------------------------------------------
// Unified genai-backed provider
// ---------------------------------------------------------------------------

/// Single VisionProvider implementation that handles all providers via genai.
struct GenaiProvider {
    meta: &'static ProviderMeta,
    model: String,
    client: Client,
}

#[async_trait::async_trait]
impl VisionProvider for GenaiProvider {
    async fn ask(&self, image_b64: &str, prompt: &str, retries: u32) -> CoreResult<String> {
        let mut last_error = String::new();

        for attempt in 0..retries {
            let image_part =
                ContentPart::from_binary_base64("image/png", image_b64, None::<String>);

            let message =
                ChatMessage::user(MessageContent::from_text(prompt).append(image_part));

            let request = ChatRequest::from_messages(vec![message]);

            match self.client.exec_chat(&self.model, request, None).await {
                Ok(response) => {
                    let text = response.first_text().unwrap_or_default().to_string();
                    return Ok(text.trim().to_string());
                }
                Err(e) => {
                    last_error = format!("{e}");
                    if attempt < retries - 1 {
                        tracing::warn!(
                            "{} error (attempt {}/{}): {}",
                            self.meta.display_name,
                            attempt + 1,
                            retries,
                            e
                        );
                        let delay = std::time::Duration::from_millis(1000 * 2u64.pow(attempt));
                        tokio::time::sleep(delay).await;
                    }
                }
            }
        }

        Err(CoreError::Provider(format!(
            "{} failed after {} attempts: {last_error}",
            self.meta.display_name, retries
        )))
    }

    async fn check(&self) -> CoreResult<()> {
        match self.meta.kind {
            ProviderKind::Local {
                host_env,
                default_host,
            } => {
                tracing::info!(
                    "Checking {} model '{}'...",
                    self.meta.display_name,
                    self.model
                );

                let host = std::env::var(host_env)
                    .unwrap_or_else(|_| default_host.to_string());
                let url = format!("{host}/api/tags");

                let resp = reqwest::get(&url).await.map_err(|e| {
                    CoreError::Provider(format!(
                        "Cannot connect to {} at {host}: {e}\n\
                         Make sure Ollama is running: ollama serve",
                        self.meta.display_name
                    ))
                })?;

                let body: serde_json::Value = resp.json().await.map_err(|e| {
                    CoreError::Provider(format!(
                        "Invalid response from {}: {e}",
                        self.meta.display_name
                    ))
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
                        "Model '{}' not found in {}.\n\
                         Run: ollama pull {}\n\
                         Available: {}",
                        self.model,
                        self.meta.display_name,
                        self.model,
                        if models.is_empty() {
                            "none".to_string()
                        } else {
                            models.join(", ")
                        }
                    )));
                }

                tracing::info!(
                    "{} model '{}' is ready.",
                    self.meta.display_name,
                    self.model
                );
                Ok(())
            }
            ProviderKind::Cloud {
                api_key_env,
                env_hint,
            } => {
                if std::env::var(api_key_env).is_err() {
                    return Err(CoreError::Provider(format!(
                        "Missing {api_key_env} environment variable.\nRun: {env_hint}"
                    )));
                }
                tracing::info!(
                    "{} model '{}' ready. (API key found)",
                    self.meta.display_name,
                    self.model
                );
                Ok(())
            }
        }
    }

    fn provider_name(&self) -> &str {
        self.meta.name
    }

    fn model_name(&self) -> &str {
        &self.model
    }
}

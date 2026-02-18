"""
providers/base.py — Abstract Base Class for Vision Providers
=============================================================
All vision providers (Ollama, OpenAI, Claude) must extend BaseVisionProvider.

To add a new provider (e.g. Google Gemini):
  1. Create src/providers/gemini_provider.py
  2. Extend BaseVisionProvider
  3. Implement ask() and check()
  4. Register in src/providers/__init__.py
  5. Add default model to PROVIDER_DEFAULTS in src/main.py
"""

from abc import ABC, abstractmethod


class BaseVisionProvider(ABC):
    """Abstract base class for all vision LLM providers."""

    def __init__(self, model: str):
        self.model = model

    @abstractmethod
    def ask(self, image_b64: str, prompt: str, retries: int = 3) -> str:
        """
        Send an image to the vision model and return the text description.

        Args:
            image_b64: Base64-encoded PNG image string
            prompt:    Instruction prompt (Thai or English)
            retries:   Number of retry attempts on failure

        Returns:
            Text description/transcription from the vision model
        """
        ...

    @abstractmethod
    def check(self) -> None:
        """
        Verify that this provider is available and correctly configured.
        Should print a success message or raise SystemExit on failure.
        """
        ...

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(model={self.model})"

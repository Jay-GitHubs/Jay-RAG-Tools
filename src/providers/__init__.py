"""
providers/__init__.py — Provider Registry
==========================================
Maps provider name strings to their implementation classes.
Add new providers here after creating their module.
"""

import sys
from .base import BaseVisionProvider


def get_provider(provider_name: str, model: str) -> BaseVisionProvider:
    """
    Factory function — returns the correct provider instance.

    Args:
        provider_name: "ollama" | "openai" | "claude"
        model:         Model name string

    Returns:
        Instantiated BaseVisionProvider subclass
    """
    if provider_name == "ollama":
        from .ollama_provider import OllamaProvider
        return OllamaProvider(model)

    elif provider_name == "openai":
        from .openai_provider import OpenAIProvider
        return OpenAIProvider(model)

    elif provider_name == "claude":
        from .claude_provider import ClaudeProvider
        return ClaudeProvider(model)

    else:
        print(f"Unknown provider '{provider_name}'. Use: ollama | openai | claude")
        sys.exit(1)


__all__ = ["BaseVisionProvider", "get_provider"]

"""
providers/ollama_provider.py — Ollama Vision Provider
======================================================
Runs 100% locally. Best for privacy-sensitive documents (banks, enterprises).
Best Thai model: qwen2.5vl or qwen2.5vl:72b (requires 128GB+ RAM)
"""

import sys
import time
from .base import BaseVisionProvider


class OllamaProvider(BaseVisionProvider):
    """Vision provider using local Ollama instance."""

    def ask(self, image_b64: str, prompt: str, retries: int = 3) -> str:
        import ollama
        for attempt in range(retries):
            try:
                response = ollama.chat(
                    model=self.model,
                    messages=[{
                        "role": "user",
                        "content": prompt,
                        "images": [image_b64],
                    }],
                )
                return response["message"]["content"].strip()
            except Exception as e:
                if attempt < retries - 1:
                    print(f"  Warning: Ollama error (attempt {attempt+1}/{retries}): {e}")
                    time.sleep(2)
                else:
                    return f"[Ollama error: {e}]"

    def check(self) -> None:
        try:
            import ollama
        except ImportError:
            print("Missing package: pip install ollama")
            sys.exit(1)
        try:
            models    = ollama.list()
            available = [m["name"] for m in models.get("models", [])]
            if not any(self.model in m for m in available):
                print(f"\nModel '{self.model}' not found in Ollama.")
                print(f"Run: ollama pull {self.model}")
                print(f"Available: {', '.join(available) or 'none'}")
                sys.exit(1)
            print(f"  Ollama model '{self.model}' is ready.")
        except Exception as e:
            print(f"Cannot connect to Ollama: {e}")
            print("Make sure Ollama is running: ollama serve")
            sys.exit(1)

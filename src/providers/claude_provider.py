"""
providers/claude_provider.py — Anthropic Claude Vision Provider
================================================================
Uses Claude's vision capability. Excellent document understanding.
Requires: pip install anthropic
Requires: ANTHROPIC_API_KEY environment variable
"""

import os
import sys
import time
from .base import BaseVisionProvider


class ClaudeProvider(BaseVisionProvider):
    """Vision provider using Anthropic Claude."""

    def ask(self, image_b64: str, prompt: str, retries: int = 3) -> str:
        import anthropic
        client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        for attempt in range(retries):
            try:
                response = client.messages.create(
                    model=self.model,
                    max_tokens=2048,
                    messages=[{
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": image_b64,
                                },
                            },
                            {"type": "text", "text": prompt},
                        ],
                    }],
                )
                return response.content[0].text.strip()
            except Exception as e:
                if attempt < retries - 1:
                    print(f"  Warning: Claude error (attempt {attempt+1}/{retries}): {e}")
                    time.sleep(3)
                else:
                    return f"[Claude error: {e}]"

    def check(self) -> None:
        try:
            import anthropic
        except ImportError:
            print("Missing package: pip install anthropic")
            sys.exit(1)
        if not os.environ.get("ANTHROPIC_API_KEY"):
            print("Missing ANTHROPIC_API_KEY environment variable.")
            print("Run: export ANTHROPIC_API_KEY='sk-ant-...'")
            sys.exit(1)
        print(f"  Claude model '{self.model}' ready. (API key found)")

"""
providers/openai_provider.py — OpenAI Vision Provider
======================================================
Uses GPT-4o vision. Best overall quality but sends data to OpenAI cloud.
Requires: pip install openai
Requires: OPENAI_API_KEY environment variable
"""

import os
import sys
import time
from .base import BaseVisionProvider


class OpenAIProvider(BaseVisionProvider):
    """Vision provider using OpenAI GPT-4o."""

    def ask(self, image_b64: str, prompt: str, retries: int = 3) -> str:
        from openai import OpenAI
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        for attempt in range(retries):
            try:
                response = client.chat.completions.create(
                    model=self.model,
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_b64}",
                                    "detail": "high",
                                },
                            },
                        ],
                    }],
                    max_tokens=2048,
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                if attempt < retries - 1:
                    print(f"  Warning: OpenAI error (attempt {attempt+1}/{retries}): {e}")
                    time.sleep(3)
                else:
                    return f"[OpenAI error: {e}]"

    def check(self) -> None:
        try:
            from openai import OpenAI
        except ImportError:
            print("Missing package: pip install openai")
            sys.exit(1)
        if not os.environ.get("OPENAI_API_KEY"):
            print("Missing OPENAI_API_KEY environment variable.")
            print("Run: export OPENAI_API_KEY='sk-...'")
            sys.exit(1)
        print(f"  OpenAI model '{self.model}' ready. (API key found)")

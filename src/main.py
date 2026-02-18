"""
main.py — CLI Entry Point
=========================
Run: python src/main.py --help
"""

import argparse
import sys
from pathlib import Path

from .providers import get_provider
from .processor import process_pdf

# Default model per provider
PROVIDER_DEFAULTS = {
    "ollama": "qwen2.5vl",        # Best Thai support locally
    "openai": "gpt-4o",           # Best overall quality
    "claude": "claude-opus-4-6",  # Excellent document understanding
}


def main():
    parser = argparse.ArgumentParser(
        description="PDF Vision Processor — Thai-first RAG pre-processing tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Local Ollama (free, private)
  python -m src.main --input manual.pdf --provider ollama --model qwen2.5vl

  # OpenAI GPT-4o
  export OPENAI_API_KEY="sk-..."
  python -m src.main --input manual.pdf --provider openai

  # Anthropic Claude
  export ANTHROPIC_API_KEY="sk-ant-..."
  python -m src.main --input manual.pdf --provider claude

  # Batch process a folder
  python -m src.main --input ./manuals/ --output ./output/ --provider ollama

  # English document
  python -m src.main --input english_manual.pdf --lang en
        """
    )
    parser.add_argument("--input",    "-i", required=True,
                        help="Path to PDF file or folder containing PDFs")
    parser.add_argument("--output",   "-o", default="./output",
                        help="Output directory (default: ./output)")
    parser.add_argument("--provider", "-p",
                        choices=["ollama", "openai", "claude"],
                        default="ollama",
                        help="Vision LLM provider (default: ollama)")
    parser.add_argument("--model",    "-m", default=None,
                        help="Model name (default: provider-specific default)")
    parser.add_argument("--lang",     "-l",
                        choices=["th", "en"],
                        default="th",
                        help="Document language for prompts (default: th)")
    parser.add_argument("--start-page", type=int, default=0,
                        help="Start page number, 0-indexed (default: 0)")
    parser.add_argument("--end-page",   type=int, default=None,
                        help="End page number exclusive (default: all pages)")
    parser.add_argument("--skip-check", action="store_true",
                        help="Skip provider availability check")

    args = parser.parse_args()

    model      = args.model or PROVIDER_DEFAULTS[args.provider]
    input_path = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Initialize and verify provider
    provider = get_provider(args.provider, model)
    if not args.skip_check:
        print(f"\nChecking provider: {args.provider} / {model}")
        provider.check()

    # Collect PDFs
    if input_path.is_file():
        pdfs = [input_path]
    elif input_path.is_dir():
        pdfs = sorted(input_path.glob("*.pdf"))
        print(f"Found {len(pdfs)} PDF(s) in {input_path}")
    else:
        print(f"Input not found: {input_path}")
        sys.exit(1)

    if not pdfs:
        print("No PDF files found.")
        sys.exit(1)

    # Process all PDFs
    results = []
    for pdf_path in pdfs:
        md_path, meta_path = process_pdf(
            pdf_path   = pdf_path,
            output_dir = output_dir,
            provider   = provider,
            start_page = args.start_page,
            end_page   = args.end_page,
            lang       = args.lang,
        )
        results.append((md_path, meta_path))

    print(f"\n{'='*60}")
    print(f"Done! {len(results)} file(s) processed.")
    print(f"Output: {output_dir.resolve()}")
    print()
    print("Flowise Next Steps:")
    print("  1. Load .md files using Text File Loader in Document Store")
    print("  2. Serve output/images/ as static HTTP")
    print("     e.g. python3 -m http.server 8899 --directory output/")
    print("  3. Add to System Prompt:")
    print('     "เมื่อพบ [IMAGE:x.png] ให้แสดงเป็น <img src=\'http://localhost:8899/images/.../x.png\' />"')
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()

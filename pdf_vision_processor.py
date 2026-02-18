"""
PDF Vision Processor for RAG (Flowise) — Multi-Provider Vision Support
=======================================================================
Supports: Ollama (local) | OpenAI GPT-4o | Anthropic Claude

Requirements:
    pip install pymupdf ollama tqdm openai anthropic

Usage:
    # Ollama (local, free)
    python pdf_vision_processor.py --input manual.pdf --provider ollama --model qwen2.5vl

    # OpenAI GPT-4o
    python pdf_vision_processor.py --input manual.pdf --provider openai --model gpt-4o

    # Anthropic Claude
    python pdf_vision_processor.py --input manual.pdf --provider claude --model claude-opus-4-6

Environment Variables (for cloud providers):
    export OPENAI_API_KEY="sk-..."
    export ANTHROPIC_API_KEY="sk-ant-..."
"""

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path

import fitz  # PyMuPDF
from tqdm import tqdm

# ─────────────────────────────────────────────
# CONFIG — Default Models per Provider
# ─────────────────────────────────────────────
PROVIDER_DEFAULTS = {
    "ollama": "qwen2.5vl",           # Best Thai support locally
    "openai": "gpt-4o",              # Best overall quality
    "claude": "claude-opus-4-6",     # Excellent for document understanding
}

IMAGE_DPI               = 150
MIN_IMAGE_SIZE          = 100
PAGE_AS_IMAGE_THRESHOLD = 0.5

# ─────────────────────────────────────────────
# THAI PROMPTS (shared across all providers)
# ─────────────────────────────────────────────
PROMPT_FULL_PAGE = (
    "หน้านี้มาจากคู่มือการใช้งานอุปกรณ์มือถือภาษาไทย\n"
    "กรุณาทำสิ่งต่อไปนี้:\n"
    "1. คัดลอกข้อความภาษาไทยทั้งหมดที่ปรากฏบนหน้านี้ให้ครบถ้วนและถูกต้อง\n"
    "2. สำหรับภาพ ไดอะแกรม หรือภาพหน้าจอ ให้อธิบายเป็นภาษาไทยอย่างละเอียด\n"
    "   เช่น ตำแหน่งปุ่ม องค์ประกอบ UI ลูกศร และหมายเลขขั้นตอน\n"
    "3. จัดรูปแบบผลลัพธ์เป็น Markdown ที่สะอาด มีหัวข้อและขั้นตอนที่ชัดเจน\n"
    "ห้ามแปลข้อความ ให้คงภาษาไทยไว้ทั้งหมด"
)

PROMPT_SINGLE_IMAGE = (
    "ภาพนี้มาจากคู่มือการใช้งานอุปกรณ์มือถือภาษาไทย\n"
    "กรุณาอธิบายสิ่งที่เห็นในภาพอย่างละเอียดเป็นภาษาไทย:\n"
    "- ภาพหน้าจอ UI หรือเมนู\n"
    "- ไดอะแกรมหรือแผนภาพ\n"
    "- ป้ายกำกับปุ่ม ลูกศร หรือตัวเลขขั้นตอน\n"
    "- คำแนะนำที่เป็นภาพ\n"
    "หากมีข้อความในภาพให้คัดลอกออกมาด้วย ตอบเป็นภาษาไทยในรูปแบบย่อหน้าสั้นๆ"
)


# ─────────────────────────────────────────────
# PROVIDER: OLLAMA
# ─────────────────────────────────────────────
def ask_vision_ollama(model: str, image_b64: str, prompt: str, retries: int = 3) -> str:
    import ollama
    for attempt in range(retries):
        try:
            response = ollama.chat(
                model=model,
                messages=[{"role": "user", "content": prompt, "images": [image_b64]}],
            )
            return response["message"]["content"].strip()
        except Exception as e:
            if attempt < retries - 1:
                print(f"  Warning: Ollama error (attempt {attempt+1}/{retries}): {e}")
                time.sleep(2)
            else:
                return f"[Ollama error: {e}]"


def check_ollama(model: str):
    try:
        import ollama
        models    = ollama.list()
        available = [m["name"] for m in models.get("models", [])]
        if not any(model in m for m in available):
            print(f"\nModel '{model}' not found in Ollama.")
            print(f"Run: ollama pull {model}")
            print(f"Available: {', '.join(available) or 'none'}")
            sys.exit(1)
        print(f"  Ollama model '{model}' is ready.")
    except ImportError:
        print("Missing: pip install ollama")
        sys.exit(1)
    except Exception as e:
        print(f"Cannot connect to Ollama: {e}\nRun: ollama serve")
        sys.exit(1)


# ─────────────────────────────────────────────
# PROVIDER: OPENAI
# ─────────────────────────────────────────────
def ask_vision_openai(model: str, image_b64: str, prompt: str, retries: int = 3) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
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
                    }
                ],
                max_tokens=2048,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            if attempt < retries - 1:
                print(f"  Warning: OpenAI error (attempt {attempt+1}/{retries}): {e}")
                time.sleep(3)
            else:
                return f"[OpenAI error: {e}]"


def check_openai(model: str):
    try:
        from openai import OpenAI
    except ImportError:
        print("Missing: pip install openai")
        sys.exit(1)
    if not os.environ.get("OPENAI_API_KEY"):
        print("Missing OPENAI_API_KEY environment variable.")
        print("Run: export OPENAI_API_KEY='sk-...'")
        sys.exit(1)
    print(f"  OpenAI model '{model}' ready. (API key found)")


# ─────────────────────────────────────────────
# PROVIDER: CLAUDE (Anthropic)
# ─────────────────────────────────────────────
def ask_vision_claude(model: str, image_b64: str, prompt: str, retries: int = 3) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    for attempt in range(retries):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=2048,
                messages=[
                    {
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
                    }
                ],
            )
            return response.content[0].text.strip()
        except Exception as e:
            if attempt < retries - 1:
                print(f"  Warning: Claude error (attempt {attempt+1}/{retries}): {e}")
                time.sleep(3)
            else:
                return f"[Claude error: {e}]"


def check_claude(model: str):
    try:
        import anthropic
    except ImportError:
        print("Missing: pip install anthropic")
        sys.exit(1)
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("Missing ANTHROPIC_API_KEY environment variable.")
        print("Run: export ANTHROPIC_API_KEY='sk-ant-...'")
        sys.exit(1)
    print(f"  Claude model '{model}' ready. (API key found)")


# ─────────────────────────────────────────────
# UNIFIED VISION DISPATCHER
# ─────────────────────────────────────────────
def ask_vision(provider: str, model: str, image_b64: str, prompt: str) -> str:
    """Route vision request to correct provider."""
    if provider == "ollama":
        return ask_vision_ollama(model, image_b64, prompt)
    elif provider == "openai":
        return ask_vision_openai(model, image_b64, prompt)
    elif provider == "claude":
        return ask_vision_claude(model, image_b64, prompt)
    else:
        return f"[Unknown provider: {provider}]"


def check_provider(provider: str, model: str):
    print(f"\nChecking provider: {provider} / {model}")
    if provider == "ollama":
        check_ollama(model)
    elif provider == "openai":
        check_openai(model)
    elif provider == "claude":
        check_claude(model)
    else:
        print(f"Unknown provider '{provider}'. Use: ollama | openai | claude")
        sys.exit(1)


# ─────────────────────────────────────────────
# IMAGE HELPERS
# ─────────────────────────────────────────────
def render_page_as_image(page: fitz.Page, dpi: int = IMAGE_DPI):
    mat       = fitz.Matrix(dpi / 72, dpi / 72)
    pixmap    = page.get_pixmap(matrix=mat, alpha=False)
    img_bytes = pixmap.tobytes("png")
    img_b64   = base64.b64encode(img_bytes).decode("utf-8")
    return img_b64, img_bytes


def get_image_coverage(page: fitz.Page) -> float:
    page_area = page.rect.width * page.rect.height
    if page_area == 0:
        return 0.0
    image_area = sum(
        rect.width * rect.height
        for img in page.get_images(full=True)
        for rect in page.get_image_rects(img[0])
    )
    return min(image_area / page_area, 1.0)


def save_image(img_bytes: bytes, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(img_bytes)


# ─────────────────────────────────────────────
# PAGE PROCESSOR
# ─────────────────────────────────────────────
def process_page(
    doc: fitz.Document,
    page_num: int,
    provider: str,
    model: str,
    images_dir: Path,
    doc_stem: str,
    metadata_catalog: list,
) -> str:
    page       = doc[page_num]
    coverage   = get_image_coverage(page)
    page_label = f"Page {page_num + 1}"
    lines      = [f"\n\n---\n## {page_label}\n"]

    # ── Strategy A: Image-heavy page → render entire page ───────────────────
    if coverage >= PAGE_AS_IMAGE_THRESHOLD:
        print(f"  [Page {page_num+1}] image-heavy ({coverage:.0%}) — full page render")

        img_b64, img_bytes = render_page_as_image(page)
        img_filename       = f"{doc_stem}_page_{page_num+1:03d}_full.png"
        save_image(img_bytes, images_dir / img_filename)

        description = ask_vision(provider, model, img_b64, PROMPT_FULL_PAGE)

        metadata_catalog.append({
            "image_file":  img_filename,
            "page":        page_num + 1,
            "type":        "full_page",
            "description": description,
            "source_doc":  doc_stem,
            "provider":    provider,
            "model":       model,
        })

        lines.append(f"[IMAGE:{img_filename}]\n")
        lines.append(description)

    # ── Strategy B: Mixed page → text + individual image descriptions ────────
    else:
        text = page.get_text("text").strip()
        if text:
            lines.append(text)

        images = page.get_images(full=True)
        if images:
            print(f"  [Page {page_num+1}] {len(images)} image(s) — saving & describing")

        img_saved_count = 0
        for img_idx, img_info in enumerate(images):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                img_bytes  = base_image["image"]
                img_w      = base_image.get("width", 0)
                img_h      = base_image.get("height", 0)

                if img_w < MIN_IMAGE_SIZE or img_h < MIN_IMAGE_SIZE:
                    continue

                img_saved_count += 1
                img_filename = f"{doc_stem}_page_{page_num+1:03d}_img{img_saved_count}.png"
                save_image(img_bytes, images_dir / img_filename)

                img_b64     = base64.b64encode(img_bytes).decode("utf-8")
                description = ask_vision(provider, model, img_b64, PROMPT_SINGLE_IMAGE)

                metadata_catalog.append({
                    "image_file":  img_filename,
                    "page":        page_num + 1,
                    "index":       img_saved_count,
                    "type":        "extracted_image",
                    "width":       img_w,
                    "height":      img_h,
                    "description": description,
                    "source_doc":  doc_stem,
                    "provider":    provider,
                    "model":       model,
                })

                lines.append(
                    f"\n[IMAGE:{img_filename}]\n"
                    f"**[ภาพที่ {img_saved_count}]:** {description}\n"
                )

            except Exception as e:
                lines.append(f"\n**[ภาพที่ {img_idx+1}]:** [Error: {e}]\n")

    return "\n".join(lines)


# ─────────────────────────────────────────────
# PDF PROCESSOR
# ─────────────────────────────────────────────
def process_pdf(
    pdf_path:   Path,
    output_dir: Path,
    provider:   str,
    model:      str,
    start_page: int = 0,
    end_page:   int = None,
):
    print(f"\n{'='*60}")
    print(f"Processing : {pdf_path.name}")
    print(f"Provider   : {provider}  |  Model: {model}")
    print(f"{'='*60}")

    doc         = fitz.open(str(pdf_path))
    total_pages = len(doc)
    end_page    = end_page or total_pages
    doc_stem    = pdf_path.stem

    images_dir = output_dir / "images" / doc_stem
    images_dir.mkdir(parents=True, exist_ok=True)

    all_content = [
        f"# {doc_stem}\n",
        f"> Provider: `{provider}` | Model: `{model}` | Pages: {total_pages}\n",
        f"> Images: `images/{doc_stem}/`\n",
    ]
    metadata_catalog = []

    for page_num in tqdm(range(start_page, end_page), desc="Pages", unit="pg"):
        try:
            content = process_page(
                doc, page_num, provider, model,
                images_dir, doc_stem, metadata_catalog
            )
            all_content.append(content)
        except Exception as e:
            print(f"  Error on page {page_num+1}: {e}")
            all_content.append(f"\n\n---\n## Page {page_num+1}\n[Error: {e}]\n")

    doc.close()

    md_path   = output_dir / f"{doc_stem}_enriched.md"
    meta_path = output_dir / f"{doc_stem}_images_metadata.json"

    md_path.write_text("\n".join(all_content), encoding="utf-8")
    meta_path.write_text(
        json.dumps(metadata_catalog, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"\n  Markdown : {md_path}  ({md_path.stat().st_size / 1024:.1f} KB)")
    print(f"  Metadata : {meta_path}  ({len(metadata_catalog)} images)")
    return md_path, meta_path


# ─────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Process Thai image-heavy PDFs into enriched Markdown for RAG"
    )
    parser.add_argument("--input",    "-i", required=True,
                        help="Path to PDF file or folder")
    parser.add_argument("--output",   "-o", default="./output",
                        help="Output directory (default: ./output)")
    parser.add_argument("--provider", "-p",
                        choices=["ollama", "openai", "claude"],
                        default="ollama",
                        help="Vision provider: ollama | openai | claude  (default: ollama)")
    parser.add_argument("--model",    "-m", default=None,
                        help="Model name (default: per-provider default)")
    parser.add_argument("--start-page", type=int, default=0)
    parser.add_argument("--end-page",   type=int, default=None)
    parser.add_argument("--skip-check", action="store_true",
                        help="Skip provider/model availability check")
    args = parser.parse_args()

    # Resolve default model for chosen provider
    model = args.model or PROVIDER_DEFAULTS[args.provider]

    input_path = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not args.skip_check:
        check_provider(args.provider, model)

    if input_path.is_file():
        pdfs = [input_path]
    elif input_path.is_dir():
        pdfs = sorted(input_path.glob("*.pdf"))
        print(f"Found {len(pdfs)} PDF(s) in {input_path}")
    else:
        print(f"Input not found: {input_path}")
        sys.exit(1)

    results = []
    for pdf_path in pdfs:
        md_path, meta_path = process_pdf(
            pdf_path, output_dir, args.provider, model,
            args.start_page, args.end_page
        )
        results.append((md_path, meta_path))

    print(f"\n{'='*60}")
    print(f"Done! {len(results)} file(s) processed.")
    print(f"Output: {output_dir.resolve()}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()

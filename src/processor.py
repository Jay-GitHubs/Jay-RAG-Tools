"""
processor.py — Core PDF Processing Logic
=========================================
Handles page-by-page PDF processing, image extraction,
vision LLM description, and Markdown + metadata output.
"""

import base64
import json
from pathlib import Path

import fitz  # PyMuPDF
from tqdm import tqdm

from .providers.base import BaseVisionProvider
from .prompts import get_prompts

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
IMAGE_DPI               = 150   # Render DPI for full-page captures
MIN_IMAGE_SIZE          = 100   # Skip images smaller than this (px) — icons/decorations
PAGE_AS_IMAGE_THRESHOLD = 0.5   # Pages where images cover >50% → render full page


# ─────────────────────────────────────────────
# IMAGE HELPERS
# ─────────────────────────────────────────────
def render_page_as_image(page: fitz.Page, dpi: int = IMAGE_DPI) -> tuple[str, bytes]:
    """
    Render an entire PDF page as a PNG image.

    Returns:
        Tuple of (base64_string, raw_png_bytes)
    """
    mat       = fitz.Matrix(dpi / 72, dpi / 72)
    pixmap    = page.get_pixmap(matrix=mat, alpha=False)
    img_bytes = pixmap.tobytes("png")
    img_b64   = base64.b64encode(img_bytes).decode("utf-8")
    return img_b64, img_bytes


def get_image_coverage(page: fitz.Page) -> float:
    """
    Calculate what fraction of the page area is covered by images.

    Returns:
        Float between 0.0 and 1.0
    """
    page_area = page.rect.width * page.rect.height
    if page_area == 0:
        return 0.0
    image_area = sum(
        rect.width * rect.height
        for img in page.get_images(full=True)
        for rect in page.get_image_rects(img[0])
    )
    return min(image_area / page_area, 1.0)


def save_image(img_bytes: bytes, path: Path) -> None:
    """Save raw image bytes to disk, creating parent directories as needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(img_bytes)


# ─────────────────────────────────────────────
# PAGE PROCESSOR
# ─────────────────────────────────────────────
def process_page(
    doc:              fitz.Document,
    page_num:         int,
    provider:         BaseVisionProvider,
    images_dir:       Path,
    doc_stem:         str,
    metadata_catalog: list,
    lang:             str = "th",
) -> str:
    """
    Process a single PDF page and return enriched Markdown string.

    Embeds [IMAGE:filename.png] reference tags so Flowise can render
    actual screenshots in chat responses.

    Args:
        doc:              Open PyMuPDF document
        page_num:         Zero-indexed page number
        provider:         Vision LLM provider instance
        images_dir:       Directory to save extracted images
        doc_stem:         PDF filename without extension (used for naming)
        metadata_catalog: List to append image metadata records to
        lang:             Language code for prompts ("th" or "en")

    Returns:
        Markdown string for this page
    """
    page       = doc[page_num]
    coverage   = get_image_coverage(page)
    page_label = f"Page {page_num + 1}"
    prompts    = get_prompts(lang)
    lines      = [f"\n\n---\n## {page_label}\n"]

    # ── Strategy A: Image-heavy page → render entire page ───────────────────
    if coverage >= PAGE_AS_IMAGE_THRESHOLD:
        print(f"  [Page {page_num+1}] image-heavy ({coverage:.0%}) — full page render")

        img_b64, img_bytes = render_page_as_image(page)
        img_filename       = f"{doc_stem}_page_{page_num+1:03d}_full.png"
        save_image(img_bytes, images_dir / img_filename)

        description = provider.ask(img_b64, prompts["full_page"])

        metadata_catalog.append({
            "image_file":  img_filename,
            "page":        page_num + 1,
            "type":        "full_page",
            "description": description,
            "source_doc":  doc_stem,
            "provider":    provider.__class__.__name__,
            "model":       provider.model,
        })

        lines.append(f"[IMAGE:{img_filename}]\n")
        lines.append(description)

    # ── Strategy B: Mixed page → text + per-image descriptions ──────────────
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
                    continue  # Skip tiny decorative images

                img_saved_count += 1
                img_filename = f"{doc_stem}_page_{page_num+1:03d}_img{img_saved_count}.png"
                save_image(img_bytes, images_dir / img_filename)

                img_b64     = base64.b64encode(img_bytes).decode("utf-8")
                description = provider.ask(img_b64, prompts["single_image"])

                metadata_catalog.append({
                    "image_file":  img_filename,
                    "page":        page_num + 1,
                    "index":       img_saved_count,
                    "type":        "extracted_image",
                    "width":       img_w,
                    "height":      img_h,
                    "description": description,
                    "source_doc":  doc_stem,
                    "provider":    provider.__class__.__name__,
                    "model":       provider.model,
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
    provider:   BaseVisionProvider,
    start_page: int = 0,
    end_page:   int = None,
    lang:       str = "th",
) -> tuple[Path, Path]:
    """
    Process an entire PDF file.

    Args:
        pdf_path:   Path to the input PDF
        output_dir: Directory to write output files
        provider:   Vision LLM provider instance
        start_page: First page to process (0-indexed)
        end_page:   Last page to process (exclusive), None = all pages
        lang:       Language code for prompts

    Returns:
        Tuple of (markdown_path, metadata_json_path)
    """
    print(f"\n{'='*60}")
    print(f"Processing : {pdf_path.name}")
    print(f"Provider   : {provider}")
    print(f"{'='*60}")

    doc         = fitz.open(str(pdf_path))
    total_pages = len(doc)
    end_page    = end_page or total_pages
    doc_stem    = pdf_path.stem

    images_dir = output_dir / "images" / doc_stem
    images_dir.mkdir(parents=True, exist_ok=True)

    print(f"  Pages    : {start_page+1} – {end_page} (of {total_pages})")
    print(f"  Images   : {images_dir}")

    all_content = [
        f"# {doc_stem}\n",
        f"> Provider: `{provider.__class__.__name__}` | Model: `{provider.model}` | Pages: {total_pages}\n",
        f"> Images: `images/{doc_stem}/`\n",
    ]
    metadata_catalog = []

    for page_num in tqdm(range(start_page, end_page), desc="Pages", unit="pg"):
        try:
            content = process_page(
                doc, page_num, provider,
                images_dir, doc_stem, metadata_catalog, lang
            )
            all_content.append(content)
        except Exception as e:
            print(f"  Error on page {page_num+1}: {e}")
            all_content.append(f"\n\n---\n## Page {page_num+1}\n[Error: {e}]\n")

    doc.close()

    # Save outputs
    md_path   = output_dir / f"{doc_stem}_enriched.md"
    meta_path = output_dir / f"{doc_stem}_images_metadata.json"

    md_path.write_text("\n".join(all_content), encoding="utf-8")
    meta_path.write_text(
        json.dumps(metadata_catalog, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"\n  Markdown : {md_path}  ({md_path.stat().st_size / 1024:.1f} KB)")
    print(f"  Metadata : {meta_path}  ({len(metadata_catalog)} images)")
    return md_path, meta_path

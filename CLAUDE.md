# CLAUDE.md — Project Context for Claude Code Agent

## Project Overview

**pdf-vision-rag** is a Thai-first PDF pre-processing tool that extracts both text and
images from PDF documents and converts them into enriched Markdown files suitable for
RAG (Retrieval-Augmented Generation) pipelines — specifically Flowise.

The core problem it solves: standard PDF loaders in RAG tools (Flowise, LangChain, etc.)
drop images entirely. For Thai device manuals, product guides, and technical documents,
50–80% of critical information is inside images, diagrams, and screenshots. This tool
preserves that information using Vision LLMs and enables actual image display inside
Flowise chat responses.

---

## Why This Project Is Unique

1. **Thai-first** — prompts and output are optimized for Thai language OCR and description
2. **Privacy-first** — supports local Ollama models so bank/enterprise documents never leave the server
3. **Image display in chat** — uses `[IMAGE:filename.png]` reference tags so Flowise can render actual screenshots in chat responses, not just text descriptions
4. **Multi-provider** — works with Ollama (local), OpenAI GPT-4o, and Anthropic Claude

No existing open-source tool combines all four of these capabilities.

---

## Target Users

- Thai enterprises (banks, telecoms, government) using Flowise/RAG for internal knowledge bases
- Organizations with Thai-language technical manuals, device guides, compliance documents
- Privacy-sensitive environments that cannot send documents to cloud APIs

---

## Tech Stack

| Layer | Technology |
|---|---|
| PDF parsing | PyMuPDF (fitz) |
| Vision LLM — local | Ollama (qwen2.5vl, llama3.2-vision, minicpm-v) |
| Vision LLM — cloud | OpenAI GPT-4o, Anthropic Claude |
| Output format | Markdown (.md) + PNG images + JSON metadata |
| RAG integration | Flowise (Text File Loader → Document Store → Vector DB) |
| Embeddings | Ollama nomic-embed-text or OpenAI text-embedding-3-small |
| Vector DB | Qdrant, Chroma, PGVector |

---

## Project Structure

```
pdf-vision-rag/
├── CLAUDE.md                    ← You are here — read this first
├── README.md                    ← User-facing documentation
├── requirements.txt             ← Python dependencies
├── src/
│   ├── main.py                  ← CLI entry point
│   ├── processor.py             ← Core PDF processing logic
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── base.py              ← Abstract base class for vision providers
│   │   ├── ollama_provider.py   ← Ollama implementation
│   │   ├── openai_provider.py   ← OpenAI implementation
│   │   └── claude_provider.py   ← Anthropic Claude implementation
│   ├── prompts.py               ← All Thai/English prompts (centralized)
│   └── utils.py                 ← Image helpers, file utils
├── docs/
│   ├── flowise-integration.md   ← How to use output in Flowise
│   └── providers.md             ← Provider setup guide
├── tests/
│   └── test_processor.py        ← Basic tests
└── output/                      ← Default output directory (gitignored)
    └── images/
```

---

## Core Concepts

### The `[IMAGE:filename.png]` Tag System
When the processor encounters an image in the PDF, it:
1. Saves the image as a PNG file to `output/images/{doc_name}/filename.png`
2. Sends the image to a Vision LLM to generate a Thai description
3. Embeds `[IMAGE:filename.png]` + the description into the output Markdown

When Flowise retrieves a chunk containing `[IMAGE:filename.png]`, the system prompt
instructs the LLM to convert this tag into an HTML `<img>` tag pointing to the static
image server. This allows users to see actual screenshots from the manual in the chat UI.

### Two Processing Strategies (auto-selected per page)
- **Strategy A — Full page render:** If >50% of the page area is images, the entire page
  is rendered as a PNG and sent to the vision LLM for full transcription. Best for
  diagram-heavy or screenshot-heavy pages.
- **Strategy B — Mixed page:** Text is extracted normally via PyMuPDF. Individual images
  are extracted separately and described by the vision LLM. Best for pages that are
  mostly text with some supporting images.

### Image Coverage Threshold
`PAGE_AS_IMAGE_THRESHOLD = 0.5` — configurable constant. Pages where images cover
more than 50% of the area trigger Strategy A.

### Metadata Catalog
Every processed image is recorded in `{doc_stem}_images_metadata.json`:
```json
{
  "image_file": "manual_page_003_img1.png",
  "page": 3,
  "type": "extracted_image",
  "description": "ภาพหน้าจอแสดงเมนูตั้งค่า Wi-Fi...",
  "source_doc": "manual",
  "provider": "ollama",
  "model": "qwen2.5vl"
}
```
This catalog enables future features like direct image search, image-only retrieval,
and audit trails.

---

## Current Features (v1.0)

- [x] PDF text extraction via PyMuPDF
- [x] Image extraction and saving as PNG
- [x] Full-page render for image-heavy pages
- [x] Vision LLM description generation (Thai prompts)
- [x] Multi-provider support: Ollama, OpenAI, Claude
- [x] `[IMAGE:filename.png]` reference tags in output Markdown
- [x] JSON metadata catalog per document
- [x] CLI with `--input`, `--output`, `--provider`, `--model` flags
- [x] Batch processing (folder of PDFs)
- [x] Provider availability check on startup

---

## Planned Features (Roadmap — discuss with developer before implementing)

- [ ] **Web UI** — Simple web interface to upload PDFs and monitor processing progress
- [ ] **API server** — FastAPI REST endpoint so Flowise can trigger processing directly
- [ ] **Flowise custom node** — Native Flowise node that wraps this tool
- [ ] **Table extraction** — Detect and convert tables to Markdown format
- [ ] **Multi-language support** — Add language flag `--lang en|th|zh` to switch prompts
- [ ] **Incremental processing** — Skip already-processed pages (resume on failure)
- [ ] **Confidence scoring** — Vision LLM confidence score per image description
- [ ] **Image deduplication** — Skip near-identical images across pages
- [ ] **Progress webhook** — POST progress updates to a URL during batch processing
- [ ] **Docker image** — Containerized deployment with Ollama bundled
- [ ] **Config file** — YAML config instead of CLI flags for complex setups

---

## Key Design Decisions

1. **Markdown output, not JSON** — Flowise Text File Loader ingests `.md` natively.
   JSON would require a custom loader.
2. **`[IMAGE:]` tags over base64 embedding** — Embedding images as base64 in Markdown
   would make files enormous and slow to embed. Tags keep the Markdown small while
   enabling image display via a static server.
3. **Per-provider modules** — Each provider is isolated so adding a new provider
   (e.g., Google Gemini) only requires adding one new file in `providers/`.
4. **Thai prompts hardcoded** — Current version assumes Thai documents. Multi-language
   support is planned but not yet implemented.
5. **PyMuPDF over pdfplumber** — PyMuPDF is faster, handles more PDF variants, and
   provides precise image bounding boxes needed for coverage calculation.

---

## Environment Variables

```bash
OPENAI_API_KEY=sk-...          # Required for --provider openai
ANTHROPIC_API_KEY=sk-ant-...   # Required for --provider claude
OLLAMA_HOST=http://localhost:11434  # Optional, default shown
```

---

## Running the Current Script

```bash
# Install
pip install pymupdf ollama tqdm openai anthropic

# Ollama (local)
ollama pull qwen2.5vl
python src/main.py --input docs/manual.pdf --provider ollama --model qwen2.5vl

# OpenAI
export OPENAI_API_KEY="sk-..."
python src/main.py --input docs/manual.pdf --provider openai

# Claude
export ANTHROPIC_API_KEY="sk-ant-..."
python src/main.py --input docs/manual.pdf --provider claude
```

---

## Code Style & Conventions

- Python 3.10+
- Type hints on all function signatures
- Docstrings on all public functions and classes
- Constants in UPPER_SNAKE_CASE at top of each module
- Provider classes extend `BaseVisionProvider` abstract class
- All user-facing strings that appear in output Markdown should be in Thai
- Error messages and logs can be in English
- Keep CLI output clean — use tqdm for progress, avoid excessive print statements

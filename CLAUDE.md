# CLAUDE.md — Project Context for Claude Code Agent

## Project Overview

**JAY-RAG-TOOLS v2.0** is a Thai-first PDF pre-processing platform that extracts text and
images from PDF documents and converts them into enriched Markdown files suitable for
RAG (Retrieval-Augmented Generation) pipelines — including Flowise, AnythingLLM, Dify,
and LangFlow.

v2.0 is a full Rust rewrite with a web dashboard, replacing the original Python CLI.
It provides both a CLI tool and a web-based REST API + React dashboard for upload,
pipeline configuration, real-time progress monitoring, and results viewing.

The core problem it solves: standard PDF loaders in RAG tools drop images entirely.
For Thai device manuals, product guides, and technical documents, 50–80% of critical
information is inside images, diagrams, and screenshots. This tool preserves that
information using Vision LLMs and enables actual image display inside chat responses.

---

## Why This Project Is Unique

1. **Thai-first** — prompts and output are optimized for Thai language OCR and description
2. **Privacy-first** — supports local Ollama models so bank/enterprise documents never leave the server
3. **Image display in chat** — uses `[IMAGE:filename.png]` reference tags so RAG platforms can render actual screenshots in chat responses
4. **Multi-provider** — works with Ollama (local), OpenAI GPT-4o, and Anthropic Claude
5. **Multi-platform** — guides for Flowise, AnythingLLM, Dify, LangFlow
6. **Performance** — Rust backend with async processing and concurrent LLM calls
7. **Web Dashboard** — React/Next.js UI for upload, pipeline config, live progress
8. **Flexible Storage** — Local filesystem, AWS S3, NFS/SMB

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend language | Rust (edition 2024) |
| PDF parsing | pdfium-render 0.8 |
| Vision LLM client | genai 0.5 (multi-provider) |
| Web framework | Axum 0.8 |
| Frontend | React / Next.js (App Router) + Tailwind CSS |
| Storage | Local filesystem, AWS S3 (aws-sdk-s3), NFS/SMB |
| CLI framework | clap 4 |
| Progress bars | indicatif 0.17 |
| Vision LLM — local | Ollama (qwen2.5vl, llama3.2-vision, minicpm-v) |
| Vision LLM — cloud | OpenAI GPT-4o, Anthropic Claude |
| Output format | Markdown (.md) + PNG images + JSON metadata |

---

## Project Structure

```
jay-rag-tools/
├── Cargo.toml                    # Workspace root
├── crates/
│   ├── core/                     # Processing engine (PDF, providers, prompts)
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── config.rs         # ProcessingConfig, Language enum
│   │       ├── error.rs          # CoreError via thiserror
│   │       ├── pdf.rs            # pdfium-render: coverage, render, extract
│   │       ├── processor.rs      # process_pdf() — Strategy A/B logic
│   │       ├── prompts.rs        # Thai/English prompt constants
│   │       ├── metadata.rs       # ImageMetadata struct, JSON
│   │       ├── progress.rs       # ProgressReporter trait
│   │       ├── table.rs          # Table detection heuristics
│   │       └── provider/
│   │           ├── mod.rs        # VisionProvider trait + factory
│   │           ├── ollama.rs     # Ollama via genai
│   │           ├── openai.rs     # OpenAI via genai
│   │           └── anthropic.rs  # Claude via genai
│   │
│   ├── storage/                  # Storage abstraction
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── error.rs
│   │       ├── traits.rs         # StorageBackend trait
│   │       ├── local.rs          # Local filesystem
│   │       ├── s3.rs             # AWS S3
│   │       └── nfs.rs            # NFS/SMB (mounted path)
│   │
│   ├── server/                   # Axum API server
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── app.rs            # Router + middleware
│   │       ├── error.rs          # API errors → JSON
│   │       ├── state.rs          # AppState
│   │       ├── ws.rs             # WebSocket progress
│   │       ├── routes/           # REST endpoints
│   │       └── jobs/             # Job queue + runner
│   │
│   └── cli/                      # CLI binary
│       └── src/main.rs           # clap: "process" + "serve"
│
├── frontend/                     # React/Next.js dashboard
│   └── app/
│       ├── page.tsx              # Dashboard home
│       ├── upload/page.tsx       # Upload + pipeline config
│       ├── jobs/page.tsx         # Job list
│       ├── jobs/[id]/page.tsx    # Live progress
│       └── results/[id]/page.tsx # Markdown viewer + gallery
│
├── docs/                         # RAG platform integration guides
│   ├── flowise-integration.md
│   ├── anythingllm-integration.md
│   ├── dify-integration.md
│   └── langflow-integration.md
│
├── src/                          # Legacy Python source (v1.0)
├── CLAUDE.md                     # ← You are here
└── README.md
```

---

## Core Concepts

### The `[IMAGE:filename.png]` Tag System
When the processor encounters an image in the PDF, it:
1. Saves the image as a PNG file to `output/images/{doc_name}/filename.png`
2. Sends the image to a Vision LLM to generate a Thai description
3. Embeds `[IMAGE:filename.png]` + the description into the output Markdown

RAG platforms retrieve chunks containing these tags, and the system prompt instructs
the LLM to convert them into HTML `<img>` tags pointing to the static image server.

### Two Processing Strategies (auto-selected per page)
- **Strategy A — Full page render:** If >50% of the page area is images, the entire page
  is rendered as a PNG and sent to the vision LLM for full transcription.
- **Strategy B — Mixed page:** Text is extracted via pdfium-render. Individual images
  are extracted separately and described by the vision LLM.

### Architecture: Sync PDF + Async LLM
PdfDocument from pdfium-render is not Send/Sync. The processor extracts all page data
synchronously in `spawn_blocking`, then makes async LLM calls on the extracted data.
This keeps the pdfium types confined to a single thread while allowing concurrent I/O.

### Table Extraction
When enabled (`--tables` flag or config), the processor uses text analysis heuristics
to detect table-like content, then sends the page to the Vision LLM with a specialized
table extraction prompt to produce Markdown tables.

---

## Features (v2.0)

- [x] Full Rust rewrite with workspace architecture
- [x] PDF text extraction via pdfium-render
- [x] Image extraction and full-page rendering
- [x] Vision LLM description (Thai/English prompts)
- [x] Multi-provider: Ollama, OpenAI, Claude (via genai crate)
- [x] `[IMAGE:filename.png]` reference tags in output Markdown
- [x] JSON metadata catalog per document
- [x] CLI with `process` and `serve` subcommands
- [x] Batch processing (folder of PDFs)
- [x] Axum REST API with WebSocket progress
- [x] React/Next.js web dashboard
- [x] Storage abstraction: Local, S3, NFS/SMB
- [x] Table extraction via Vision LLM
- [x] Multi-platform RAG guides (Flowise, AnythingLLM, Dify, LangFlow)

---

## Key Design Decisions

1. **Rust over Python** — 10-100x faster PDF parsing, true concurrency, single binary deployment
2. **pdfium-render over PyMuPDF** — Rust-native, MIT licensed, enterprise-safe
3. **genai crate** — Single client for Ollama/OpenAI/Claude, auto-detects API keys
4. **spawn_blocking for PDF** — PdfDocument is !Send; sync extraction + async LLM calls
5. **Markdown output** — RAG platforms ingest `.md` natively via text file loaders
6. **`[IMAGE:]` tags** — Keep Markdown small; serve images via static HTTP
7. **SQLite-backed job queue** — Jobs persist across server restarts via rusqlite (WAL mode)
8. **Workspace crates** — core/storage/server/cli are independently compilable

---

## Environment Variables

```bash
OPENAI_API_KEY=sk-...              # Required for --provider openai
ANTHROPIC_API_KEY=sk-ant-...       # Required for --provider claude
OLLAMA_HOST=http://localhost:11434 # Optional, default shown
RUST_LOG=info                      # Logging level
```

---

## Running

```bash
# Build
cargo build --release

# CLI: Process a PDF
./target/release/jay-rag process --input manual.pdf --provider ollama --model qwen2.5vl

# CLI: Start web dashboard + API
./target/release/jay-rag serve --bind 0.0.0.0:3000

# API: Upload via curl
curl -X POST localhost:3000/api/upload -F 'file=@manual.pdf' -F 'config={"provider":"ollama"}'
```

Note: pdfium binary (libpdfium.dylib/libpdfium.so) must be available on the system
or in the project directory. Download from https://github.com/nicklockwood/pdfium-binaries/releases

---

## Code Style & Conventions

- Rust edition 2024
- Type annotations on all public function signatures
- Doc comments on all public items
- Constants in UPPER_SNAKE_CASE
- Provider implementations in `crates/core/src/provider/`
- All user-facing strings in output Markdown should be in Thai (configurable via `--lang`)
- Error messages and logs in English
- Use `tracing` for structured logging
- Use `indicatif` for CLI progress bars
- Frontend: TypeScript strict mode, Tailwind CSS, React Query for data fetching

## Git Workflow
See `.claude/git-flow.md` for full branching, commit, and PR rules.

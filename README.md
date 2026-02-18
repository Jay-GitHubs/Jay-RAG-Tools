# JAY-RAG-TOOLS v2.0

> Thai-first PDF Vision Processor for RAG pipelines — extract text AND images from PDFs,
> generate Thai descriptions using Vision LLMs, and display actual screenshots in chat.
> Now with a Rust backend, web dashboard, and multi-platform RAG support.

---

## The Problem

Standard RAG tools (Flowise, LangChain, etc.) drop all images when loading PDFs.
For Thai device manuals, product guides, and technical documents, this means losing
50–80% of the actual content — diagrams, screenshots, button layouts, step-by-step visuals.

## The Solution

**JAY-RAG-TOOLS** pre-processes PDFs using a Vision LLM to:
1. **Extract and save** every image as a PNG file
2. **Describe each image** in Thai using a Vision LLM
3. **Embed `[IMAGE:filename.png]` tags** in the output Markdown
4. **Output enriched `.md`** ready to load into any RAG platform

v2.0 adds a **web dashboard** for upload and monitoring, **table extraction**,
**flexible storage** (Local/S3/NFS), and guides for multiple RAG platforms.

---

## Quick Start

### Prerequisites

- Rust toolchain (`rustup` — https://rustup.rs)
- pdfium library ([download binaries](https://github.com/nicklockwood/pdfium-binaries/releases))
- Ollama (for local processing) or OpenAI/Claude API key

### Build & Run

```bash
# Build
cargo build --release

# Pull a Thai-capable vision model
ollama pull qwen2.5vl

# Process a PDF via CLI
./target/release/jay-rag process --input manual.pdf --provider ollama --model qwen2.5vl

# Start the web dashboard
./target/release/jay-rag serve --bind 0.0.0.0:3000
# Open http://localhost:3000 in your browser
```

### Output

```
output/
  manual_enriched.md              <- Load into your RAG platform
  manual_images_metadata.json     <- Image catalog
  images/manual/
    manual_page_001_full.png
    manual_page_003_img1.png
    ...
```

---

## Web Dashboard

The web dashboard provides a browser-based interface for PDF processing:

- **Upload** — Drag-and-drop PDF upload with pipeline configuration
- **Pipeline Config** — Select provider, model, language, storage backend
- **Live Progress** — Real-time progress via WebSocket
- **Results Viewer** — Rendered Markdown with inline images + image gallery

```bash
# Start the server
./target/release/jay-rag serve --bind 0.0.0.0:3000

# Upload via API
curl -X POST localhost:3000/api/upload \
  -F 'file=@manual.pdf' \
  -F 'config={"provider":"ollama","model":"qwen2.5vl","language":"th"}'

# Check job status
curl localhost:3000/api/jobs
```

---

## CLI Usage

```bash
# Ollama (local, free, private)
jay-rag process --input manual.pdf --provider ollama --model qwen2.5vl

# OpenAI GPT-4o
export OPENAI_API_KEY="sk-..."
jay-rag process --input manual.pdf --provider openai

# Anthropic Claude
export ANTHROPIC_API_KEY="sk-ant-..."
jay-rag process --input manual.pdf --provider claude

# Batch process a folder
jay-rag process --input ./manuals/ --output ./output/ --provider ollama

# Process specific page range
jay-rag process --input manual.pdf --start-page 0 --end-page 10

# Enable table extraction
jay-rag process --input manual.pdf --provider ollama --tables

# English documents
jay-rag process --input english_manual.pdf --provider ollama --lang en
```

---

## Supported Vision Providers

| Provider | Model | Thai Quality | Cost | Privacy |
|---|---|---|---|---|
| `ollama` | qwen2.5vl | Excellent | Free | Local |
| `ollama` | llama3.2-vision | Good | Free | Local |
| `openai` | gpt-4o | Excellent | ~$0.01/page | Cloud |
| `claude` | claude-opus-4-6 | Excellent | ~$0.01/page | Cloud |

For **enterprise/bank use cases**, use Ollama to keep documents 100% local.

---

## RAG Platform Integration

Guides for connecting processed output to popular RAG platforms:

| Platform | Guide |
|---|---|
| Flowise | [docs/flowise-integration.md](docs/flowise-integration.md) |
| AnythingLLM | [docs/anythingllm-integration.md](docs/anythingllm-integration.md) |
| Dify | [docs/dify-integration.md](docs/dify-integration.md) |
| LangFlow | [docs/langflow-integration.md](docs/langflow-integration.md) |

### Quick Flowise Setup

1. Process your PDF: `jay-rag process --input manual.pdf --provider ollama`
2. Start the server: `jay-rag serve --bind 0.0.0.0:3000`
3. In Flowise Document Store: load `manual_enriched.md` via Text File Loader
4. Add to System Prompt:
   ```
   เมื่อพบ [IMAGE:filename.png] ให้แสดงเป็น <img src="http://localhost:3000/images/manual/filename.png" />
   ```
5. Users see actual screenshots inline in chat responses

---

## Storage Backends

| Backend | Use Case |
|---|---|
| `local` (default) | Development, single-server deployment |
| `s3` | Cloud deployment, CDN-backed image serving |
| `nfs` | Enterprise NAS/SAN shared storage |

```bash
# S3 storage
jay-rag process --input manual.pdf --storage s3 --s3-bucket my-bucket --s3-prefix rag-output/

# NFS storage (must be pre-mounted)
jay-rag process --input manual.pdf --storage nfs --storage-path /mnt/nfs/output
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/upload` | Upload PDF + config |
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs/:id` | Job detail + progress |
| DELETE | `/api/jobs/:id` | Cancel/remove job |
| GET | `/api/results/:id` | Get output files |
| GET | `/api/config` | Available providers/models |
| GET | `/api/health` | Health check |
| WS | `/ws/:job_id` | Real-time progress stream |

---

## Architecture

```
                    +-----------------+
                    |   Frontend      |
                    |  (React/Next.js)|
                    +--------+--------+
                             |
                    +--------v--------+
                    |   Axum Server   |
                    | (REST + WebSocket)
                    +--------+--------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v------+  +----v-------+
     |   Core     |  |   Storage   |  |   Jobs     |
     | (PDF +     |  | (Local/S3/  |  | (Queue +   |
     |  Providers)|  |  NFS)       |  |  Runner)   |
     +------------+  +-------------+  +------------+
```

---

## Why Not LlamaParse / Unstructured?

| | LlamaParse | Unstructured | **JAY-RAG-TOOLS** |
|---|---|---|---|
| Thai OCR quality | Good | Weak | Excellent (qwen2.5vl) |
| Image display in chat | No | No | Yes (`[IMAGE:]` tags) |
| Fully local/private | No (Cloud) | No (Cloud) | Yes (Ollama) |
| Free | No ($3/1k pages) | No (Paid) | Yes |
| Web dashboard | No | No | Yes |
| Table extraction | Yes | Yes | Yes (Vision LLM) |
| Multi-platform RAG | No | No | Yes (4 platforms) |

---

## Requirements

- Rust 1.75+ (edition 2024)
- pdfium library binary (libpdfium.dylib / libpdfium.so)
- One of: Ollama running locally / OpenAI API key / Anthropic API key
- Node.js 18+ (for frontend development only)

---

## License

MIT

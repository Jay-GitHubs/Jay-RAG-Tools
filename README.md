# JAY-RAG-TOOLS 🇹🇭

> Thai-first PDF Vision Processor for RAG pipelines — extract text AND images from PDFs,
> generate Thai descriptions using Vision LLMs, and display actual screenshots in Flowise chat.

---

## The Problem

Standard RAG tools (Flowise, LangChain, etc.) drop all images when loading PDFs.
For Thai device manuals, product guides, and technical documents, this means losing
50–80% of the actual content — diagrams, screenshots, button layouts, step-by-step visuals.

## The Solution

`JAY-RAG-TOOLS` pre-processes PDFs using a Vision LLM to:
1. **Extract and save** every image as a PNG file
2. **Describe each image** in Thai using a Vision LLM
3. **Embed `[IMAGE:filename.png]` tags** in the output Markdown
4. **Output enriched `.md`** ready to load into Flowise Document Store

When a user asks a question and a chunk with `[IMAGE:...]` is retrieved, Flowise renders
the actual screenshot inline in the chat response.

---

## Quick Start

```bash
pip install pymupdf ollama tqdm

# Pull a Thai-capable vision model
ollama pull qwen2.5vl

# Process your PDF
python src/main.py --input manual.pdf --provider ollama --model qwen2.5vl
```

Output:
```
output/
  manual_enriched.md              ← Load into Flowise
  manual_images_metadata.json     ← Image catalog
  images/manual/
    manual_page_001_full.png
    manual_page_003_img1.png
    ...
```

---

## Supported Vision Providers

| Provider | Model | Thai Quality | Cost | Privacy |
|---|---|---|---|---|
| `ollama` | qwen2.5vl, qwen2.5vl:72b | ⭐⭐⭐⭐ | Free | ✅ Local |
| `ollama` | llama3.2-vision | ⭐⭐⭐ | Free | ✅ Local |
| `openai` | gpt-4o | ⭐⭐⭐⭐⭐ | ~$0.01/page | ❌ Cloud |
| `claude` | claude-opus-4-6 | ⭐⭐⭐⭐⭐ | ~$0.01/page | ❌ Cloud |

For **enterprise/bank use cases**, use Ollama to keep documents local.

---

## Usage

```bash
# Ollama (local, free, private)
python src/main.py --input manual.pdf --provider ollama --model qwen2.5vl

# OpenAI GPT-4o
export OPENAI_API_KEY="sk-..."
python src/main.py --input manual.pdf --provider openai

# Anthropic Claude
export ANTHROPIC_API_KEY="sk-ant-..."
python src/main.py --input manual.pdf --provider claude

# Batch process a folder
python src/main.py --input ./manuals/ --output ./output/ --provider ollama

# Process specific page range
python src/main.py --input manual.pdf --start-page 0 --end-page 10
```

---

## Flowise Integration

1. Run this script to generate `manual_enriched.md` and `images/` folder
2. Serve the `images/` folder as static HTTP: `python3 -m http.server 8899`
3. In Flowise **Document Store**: load `manual_enriched.md` via Text File Loader
4. Add to your **System Prompt**:
   ```
   เมื่อพบ [IMAGE:filename.png] ให้แสดงเป็น <img src="http://localhost:8899/images/manual/filename.png" />
   ```
5. Users will see actual screenshots from the manual inline in chat responses

See [docs/flowise-integration.md](docs/flowise-integration.md) for full setup guide.

---

## Why Not LlamaParse / Unstructured?

| | LlamaParse | Unstructured | **JAY-RAG-TOOLS** |
|---|---|---|---|
| Thai OCR quality | Good | Weak | Best (qwen2.5vl) |
| Image display in chat | ❌ | ❌ | ✅ `[IMAGE:]` tags |
| Fully local/private | ❌ Cloud | ❌ Cloud | ✅ Ollama |
| Free | ❌ $3/1k pages | ❌ Paid | ✅ Free |
| Custom Thai prompts | ❌ | ❌ | ✅ |

---

## Roadmap

- [ ] Web UI for PDF upload and processing monitor
- [ ] FastAPI server for Flowise webhook integration
- [ ] Native Flowise custom node
- [ ] Table extraction to Markdown
- [ ] Multi-language support (`--lang th|en|zh`)
- [ ] Docker image with Ollama bundled
- [ ] Incremental processing (resume on failure)

---

## Requirements

- Python 3.10+
- `pip install pymupdf tqdm`
- One of: `ollama` / `openai` / `anthropic` package
- For Ollama: Ollama running locally with a vision model pulled

---

## License

MIT

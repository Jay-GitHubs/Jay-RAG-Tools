# Flowise Integration Guide — JAY-RAG-TOOLS v2.0

## Overview

This guide explains how to connect **JAY-RAG-TOOLS v2.0** output into a Flowise RAG
pipeline so that users see actual screenshots from Thai-language manuals inline in chat
responses.

v2.0 introduces two ways to process PDFs:
- **CLI** — `jay-rag process` command
- **Web Dashboard / REST API** — Axum server at `http://localhost:3000`

Both produce the same enriched Markdown output with `[IMAGE:filename.png]` tags.

---

## Prerequisites

- JAY-RAG-TOOLS v2.0 installed
- Flowise v1.6+ running (default: `http://localhost:3001`)
- A Vision LLM provider configured:
  - **Ollama** (local): `ollama pull qwen2.5vl`
  - **OpenAI**: `OPENAI_API_KEY` set
  - **Anthropic Claude**: `ANTHROPIC_API_KEY` set
- An embedding model available (Ollama `nomic-embed-text` or OpenAI `text-embedding-3-small`)
- A vector store (Qdrant, Chroma, or PGVector)

---

## Step 1 — Process the PDF

### Option A: CLI

```bash
# Ollama (local, privacy-first)
jay-rag process --input manual.pdf --provider ollama --model qwen2.5vl --output ./output

# OpenAI
jay-rag process --input manual.pdf --provider openai --output ./output

# Claude
jay-rag process --input manual.pdf --provider claude --output ./output

# Batch processing (entire folder)
jay-rag process --input ./pdf-folder/ --provider ollama --model qwen2.5vl --output ./output
```

### Option B: REST API (Web Dashboard)

Start the API server:

```bash
jay-rag serve --port 3000
```

Submit a processing job via `curl`:

```bash
curl -X POST http://localhost:3000/api/jobs \
  -F "file=@manual.pdf" \
  -F "provider=ollama" \
  -F "model=qwen2.5vl"
```

Response:

```json
{
  "job_id": "a1b2c3d4",
  "status": "processing",
  "created_at": "2026-02-18T10:30:00Z"
}
```

Check job status:

```bash
curl http://localhost:3000/api/jobs/a1b2c3d4
```

Download results when complete:

```bash
curl http://localhost:3000/api/jobs/a1b2c3d4/result --output result.zip
```

Or use the Web Dashboard at `http://localhost:3000` to upload, monitor, and download
through the browser UI.

### Output Structure

Regardless of method, the output looks like:

```
output/
  manual_enriched.md              <-- Load this into Flowise
  manual_images_metadata.json     <-- Image catalog (optional)
  images/
    manual/
      manual_page_001_full.png
      manual_page_003_img1.png
      ...
```

---

## Step 2 — Serve Images via HTTP

Flowise chat UI loads images via HTTP URLs, not local file paths. v2.0 includes a
built-in static image server.

### Built-in Server (Recommended)

```bash
jay-rag serve --port 3000
```

The built-in server automatically serves images from your output directory. Images are
accessible at:

```
http://localhost:3000/images/manual/manual_page_003_img1.png
```

### Alternative: Standalone Static Server (Development)

```bash
python3 -m http.server 8899 --directory ./output
# Images at: http://localhost:8899/images/manual/manual_page_003_img1.png
```

### Production Deployment

For production, put nginx or a CDN in front of the image path:

```nginx
server {
    listen 80;
    server_name rag-images.example.com;

    location /images/ {
        alias /var/data/jay-rag/output/images/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Update the system prompt URL base to match your production domain.

---

## Step 3 — Flowise Document Store

1. Open Flowise at `http://localhost:3001`
2. Go to **Document Stores** and click **Add New**. Name it `"Thai Manual Store"`
3. Add a **Text File Loader** node and select `manual_enriched.md`
4. Add a **Recursive Character Text Splitter** with these settings:
   - **Chunk Size:** `1000`
   - **Chunk Overlap:** `200`
   - **Separator:** `---` (matches the page dividers in the enriched Markdown)
5. Add an **Embeddings** node:
   - Ollama: `nomic-embed-text`
   - Or OpenAI: `text-embedding-3-small`
6. Add a **Vector Store** node (Qdrant, Chroma, or PGVector)
7. Click **"Process All Chunks"**

### Chunking Notes

The enriched Markdown uses `---` as page separators. Using `---` as the primary
separator ensures that `[IMAGE:filename.png]` tags stay together with their surrounding
text context. Do not use a chunk size smaller than 500 characters or image references
may get split from their descriptions.

---

## Step 4 — Flowise RAG Chatflow

Create a new Chatflow named `"Thai Manual RAG"`.

### Node Layout

```
[ Chat Input ]
       |
[ Conversational Retrieval QA Chain ]
    |-- [ Vector Store Retriever ]
    |     Collection: thai_manual_store
    |     Top K: 4
    |
    +-- [ Chat LLM ]
          Ollama: qwen2.5vl
          (or OpenAI GPT-4o)
       |
[ Chat Output ]
```

### System Prompt

Paste this into the system prompt field of the Chat LLM node. Update the URL base to
match your image server address.

```
คุณเป็นผู้ช่วยด้านเทคนิคสำหรับคู่มือการใช้งาน
เมื่อคุณพบ [IMAGE:filename.png] ใน context ให้แปลงเป็น:
<img src="http://localhost:3000/images/{document_name}/filename.png" style="max-width:100%;border-radius:8px;margin:8px 0;" />

กฎสำคัญ:
1. ตอบเป็นภาษาไทยเสมอ
2. แสดงภาพประกอบเสมอหากมีอยู่ใน context — อย่าข้ามแท็ก [IMAGE:]
3. อธิบายเนื้อหาในภาพควบคู่กับการแสดงภาพ
4. ถ้ามีหลายภาพใน context ให้แสดงทุกภาพตามลำดับ
5. ห้ามสร้าง URL ภาพที่ไม่มีอยู่ใน context
```

Replace `{document_name}` with the actual document stem (e.g., `manual`).

---

## End-to-End Example

```
User: "วิธีตั้งค่า Wi-Fi ทำอย่างไร?"
       |
       v
Vector Store retrieves top-4 relevant chunks
       |
       v
Retrieved chunk contains:
  "## หน้า 5 — ตั้งค่า Wi-Fi

   ขั้นตอนที่ 1: เปิด Settings
   ขั้นตอนที่ 2: แตะ Wi-Fi

   [IMAGE:manual_page_005_img1.png]
   **[รูปที่ 1]:** ภาพหน้าจอแสดงเมนูตั้งค่า Wi-Fi พร้อมรายชื่อเครือข่ายที่พบ

   ขั้นตอนที่ 3: เลือกเครือข่ายและกรอกรหัสผ่าน"
       |
       v
System prompt converts [IMAGE:...] to <img> tag
       |
       v
Chat UI renders:
  - Thai text instructions (ขั้นตอนที่ 1, 2, 3)
  - Actual screenshot from the manual displayed inline
  - Additional explanation of what the screenshot shows
```

---

## Troubleshooting

### Images not displaying in chat

| Symptom | Cause | Fix |
|---------|-------|-----|
| Broken image icon | Image server not running | Run `jay-rag serve --port 3000` |
| 404 on image URL | Wrong document name in URL | Check the `images/` subfolder name matches the system prompt URL |
| CORS error in browser console | Flowise and image server on different origins | Add CORS headers to your image server or use the built-in `jay-rag serve` which handles CORS automatically |
| Images load but look tiny | Missing CSS in system prompt | Ensure `style="max-width:100%"` is in the `<img>` tag |

### Chunks missing image references

- Increase **Chunk Size** to at least 1000 characters
- Increase **Chunk Overlap** to at least 200 characters
- Use `---` as the separator to keep page content together

### Processing failures

```bash
# Check API server health
curl http://localhost:3000/api/health

# Check Ollama is running (if using local provider)
curl http://localhost:11434/api/tags

# Re-process a single file
jay-rag process --input manual.pdf --provider ollama --model qwen2.5vl --output ./output
```

### Thai text garbled in output

- Ensure the source PDF has embedded Thai fonts (not scanned images of text)
- For scanned documents, use Strategy A (full-page render) by lowering the threshold:
  `jay-rag process --input manual.pdf --page-image-threshold 0.3`
- Use a Vision LLM with strong Thai OCR support (`qwen2.5vl` recommended)

---

## Recommended Flowise Settings Summary

| Setting | Value |
|---------|-------|
| Text Splitter | Recursive Character Text Splitter |
| Chunk Size | 1000 |
| Chunk Overlap | 200 |
| Separator | `---` |
| Embeddings | `nomic-embed-text` (Ollama) or `text-embedding-3-small` (OpenAI) |
| Vector Store | Qdrant (recommended) / Chroma / PGVector |
| Top K | 4 |
| Image Server | `jay-rag serve --port 3000` |

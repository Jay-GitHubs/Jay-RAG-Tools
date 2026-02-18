# AnythingLLM Integration Guide — JAY-RAG-TOOLS v2.0

## Overview

This guide explains how to integrate **JAY-RAG-TOOLS v2.0** with
[AnythingLLM](https://anythingllm.com/) so that Thai-language manuals processed by
JAY-RAG-TOOLS can be queried in AnythingLLM's chat interface, with actual screenshots
and diagrams rendered inline alongside Thai text answers.

AnythingLLM supports custom document upload, embedded vector databases, and flexible
LLM backends, making it a natural fit for JAY-RAG-TOOLS enriched Markdown output.

---

## Prerequisites

- **JAY-RAG-TOOLS v2.0** installed and configured
- **AnythingLLM** installed (Desktop app or Docker)
  - Download: https://anythingllm.com/download
  - Docker: `docker pull mintplexlabs/anythingllm`
- A Vision LLM provider for PDF processing:
  - **Ollama** (local): `ollama pull qwen2.5vl`
  - **OpenAI**: `OPENAI_API_KEY` set
  - **Anthropic Claude**: `ANTHROPIC_API_KEY` set
- An embedding provider configured in AnythingLLM (Ollama, OpenAI, or built-in)
- A chat LLM configured in AnythingLLM (Ollama, OpenAI, Anthropic, etc.)

---

## Step 1 — Process the PDF

### Option A: CLI

```bash
# Local processing with Ollama
jay-rag process --input manual.pdf --provider ollama --model qwen2.5vl --output ./output

# Cloud processing with OpenAI
jay-rag process --input manual.pdf --provider openai --output ./output

# Batch processing
jay-rag process --input ./pdf-folder/ --provider ollama --model qwen2.5vl --output ./output
```

### Option B: REST API

Start the server:

```bash
jay-rag serve --port 3000
```

Submit a job:

```bash
curl -X POST http://localhost:3000/api/jobs \
  -F "file=@manual.pdf" \
  -F "provider=ollama" \
  -F "model=qwen2.5vl"
```

Check status:

```bash
curl http://localhost:3000/api/jobs/{job_id}
```

### Output

After processing, you will have:

```
output/
  manual_enriched.md              <-- Upload this to AnythingLLM
  manual_images_metadata.json     <-- Image catalog
  images/
    manual/
      manual_page_001_full.png
      manual_page_003_img1.png
      ...
```

---

## Step 2 — Start the Image Server

AnythingLLM renders HTML in chat responses, so images must be accessible via HTTP URLs.

### Built-in Server (Recommended)

```bash
jay-rag serve --port 3000
```

Images are served at:

```
http://localhost:3000/images/manual/manual_page_003_img1.png
```

The built-in server handles CORS automatically.

### Alternative: nginx (Production)

```nginx
server {
    listen 8899;
    location /images/ {
        alias /path/to/output/images/;
        expires 30d;
        add_header Access-Control-Allow-Origin "*";
    }
}
```

---

## Step 3 — Create a Workspace in AnythingLLM

1. Open AnythingLLM
2. Click **New Workspace** and name it (e.g., `"Thai Device Manual"`)
3. In workspace settings, configure:
   - **Chat Model:** Choose your preferred LLM (GPT-4o, Claude, or Ollama model)
   - **Embedding Model:** `nomic-embed-text` (Ollama) or `text-embedding-3-small` (OpenAI)
   - **Vector Database:** Use the built-in LanceDB or connect to Chroma/Qdrant

---

## Step 4 — Upload Enriched Markdown

1. In your workspace, click the **Upload** icon (document icon) or drag-and-drop
2. Select `manual_enriched.md` from the output directory
3. AnythingLLM will automatically:
   - Split the document into chunks
   - Generate embeddings
   - Store vectors in the workspace's vector database
4. Wait for the upload and embedding process to complete (progress shown in UI)

### Upload via API (optional)

If you are using AnythingLLM's API:

```bash
# Upload the document
curl -X POST http://localhost:3001/api/v1/document/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@output/manual_enriched.md"

# Move to workspace
curl -X POST http://localhost:3001/api/v1/workspace/thai-device-manual/update-embeddings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"adds": ["custom-documents/manual_enriched.md-HASH.json"]}'
```

---

## Step 5 — Configure the System Prompt

Go to **Workspace Settings** (gear icon) and set the **System Prompt**.

Update the URL base to match your image server address and document name.

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

### Chat Settings

In workspace settings, also configure:

| Setting | Recommended Value |
|---------|-------------------|
| Chat mode | Query (RAG) |
| Similarity Top K | 4 |
| Chat temperature | 0.3 |
| Chat history | 10 messages |

---

## Step 6 — Test the Integration

Open the workspace chat and ask a question:

```
วิธีตั้งค่า Wi-Fi ทำอย่างไร?
```

Expected behavior:
1. AnythingLLM retrieves relevant chunks from the vector store
2. Chunks containing `[IMAGE:filename.png]` tags are included in context
3. The LLM converts the tags to `<img>` HTML tags per the system prompt
4. The chat UI renders Thai text instructions with inline screenshots

---

## End-to-End Example

```
User: "วิธีเชื่อมต่อ Bluetooth?"
       |
       v
AnythingLLM Vector DB retrieves top-4 chunks
       |
       v
Retrieved chunk:
  "## หน้า 8 — เชื่อมต่อ Bluetooth

   1. เปิด Settings > Bluetooth
   2. เปิดสวิตช์ Bluetooth

   [IMAGE:manual_page_008_img1.png]
   **[รูปที่ 1]:** ภาพหน้าจอแสดงรายการอุปกรณ์ Bluetooth ที่พบ

   3. แตะชื่ออุปกรณ์ที่ต้องการจับคู่"
       |
       v
LLM output (with system prompt):
  "วิธีเชื่อมต่อ Bluetooth มีขั้นตอนดังนี้:

   1. เปิด Settings แล้วแตะ Bluetooth
   2. เปิดสวิตช์ Bluetooth

   <img src="http://localhost:3000/images/manual/manual_page_008_img1.png"
        style="max-width:100%;border-radius:8px;margin:8px 0;" />

   ภาพด้านบนแสดงรายการอุปกรณ์ Bluetooth ที่ระบบค้นพบ

   3. แตะชื่ออุปกรณ์ที่ต้องการจับคู่แล้วยืนยัน"
       |
       v
Chat UI: Thai instructions + inline screenshot rendered
```

---

## Troubleshooting

### Images not rendering in chat

| Symptom | Cause | Fix |
|---------|-------|-----|
| Broken image icon | Image server not running | Start `jay-rag serve --port 3000` |
| Image URL returns 404 | Document name mismatch in URL | Check `output/images/` subfolder name matches the URL in the system prompt |
| No image tags in LLM response | LLM ignoring system prompt | Rephrase system prompt to be more explicit; try a more capable LLM |
| CORS blocked | Browser blocking cross-origin images | Use the built-in `jay-rag serve` which handles CORS, or add CORS headers to your server |
| AnythingLLM strips HTML | HTML rendering disabled | Check AnythingLLM settings; some chat modes strip HTML. Use "Query" mode |

### Document not showing in workspace

- Verify the file was uploaded successfully (check the document list in workspace)
- Re-embed: delete the document from the workspace and re-upload
- Check that embeddings are configured (Settings > Embedding in AnythingLLM)

### Thai text garbled or incorrect

- Ensure source PDF has embedded Thai fonts
- For scanned Thai documents, lower the page-image threshold:
  `jay-rag process --input manual.pdf --page-image-threshold 0.3`
- Use `qwen2.5vl` for best Thai OCR results

### Chunks too small / image tags split from context

- AnythingLLM default chunk size may be too small
- Go to **Settings > Embedder Preferences** and increase chunk size to at least 1000
- Set chunk overlap to 200

### API server health check

```bash
# JAY-RAG-TOOLS server
curl http://localhost:3000/api/health

# AnythingLLM server
curl http://localhost:3001/api/v1/auth -H "Authorization: Bearer YOUR_API_KEY"

# Ollama (if using local provider)
curl http://localhost:11434/api/tags
```

---

## Recommended Settings Summary

| Component | Setting | Value |
|-----------|---------|-------|
| JAY-RAG-TOOLS | Provider | Ollama `qwen2.5vl` (local) or OpenAI GPT-4o (cloud) |
| JAY-RAG-TOOLS | Image server | `jay-rag serve --port 3000` |
| AnythingLLM | Chat mode | Query (RAG) |
| AnythingLLM | Embedding | `nomic-embed-text` or `text-embedding-3-small` |
| AnythingLLM | Top K | 4 |
| AnythingLLM | Temperature | 0.3 |
| AnythingLLM | Vector DB | LanceDB (built-in) or Chroma/Qdrant |

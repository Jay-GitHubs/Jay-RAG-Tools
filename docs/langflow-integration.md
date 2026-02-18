# LangFlow Integration Guide — JAY-RAG-TOOLS v2.0

## Overview

This guide explains how to integrate **JAY-RAG-TOOLS v2.0** with
[LangFlow](https://langflow.org/) so that Thai-language manuals processed by
JAY-RAG-TOOLS can be queried through LangFlow's visual RAG flows, with actual
screenshots and diagrams rendered inline in chat responses.

LangFlow is a visual framework for building LangChain-based flows. It supports
document loading, vector stores, retrieval chains, and chat interfaces, making it
well-suited for serving JAY-RAG-TOOLS enriched Markdown output.

---

## Prerequisites

- **JAY-RAG-TOOLS v2.0** installed and configured
- **LangFlow** installed and running
  - Install: `pip install langflow` or `pipx install langflow`
  - Run: `langflow run` (default: `http://localhost:7860`)
  - Docker: `docker run -p 7860:7860 langflowai/langflow`
- A Vision LLM provider for PDF processing:
  - **Ollama** (local): `ollama pull qwen2.5vl`
  - **OpenAI**: `OPENAI_API_KEY` set
  - **Anthropic Claude**: `ANTHROPIC_API_KEY` set
- API keys for LLM and embedding providers configured in LangFlow's
  **Global Variables** or **Environment Variables** settings

---

## Step 1 — Process the PDF

### Option A: CLI

```bash
# Local processing with Ollama
jay-rag process --input manual.pdf --provider ollama --model qwen2.5vl --output ./output

# Cloud processing with OpenAI
jay-rag process --input manual.pdf --provider openai --output ./output

# Cloud processing with Claude
jay-rag process --input manual.pdf --provider claude --output ./output

# Batch processing
jay-rag process --input ./pdf-folder/ --provider ollama --model qwen2.5vl --output ./output
```

### Option B: REST API

Start the server:

```bash
jay-rag serve --port 3000
```

Submit a processing job:

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

```
output/
  manual_enriched.md              <-- Load this into LangFlow
  manual_images_metadata.json     <-- Image catalog
  images/
    manual/
      manual_page_001_full.png
      manual_page_003_img1.png
      ...
```

---

## Step 2 — Start the Image Server

LangFlow's chat interface renders HTML, so images must be accessible via HTTP URLs.

### Built-in Server (Recommended)

```bash
jay-rag serve --port 3000
```

Images are served at:

```
http://localhost:3000/images/manual/manual_page_003_img1.png
```

### Production Setup

For production, serve images behind nginx or a CDN:

```nginx
server {
    listen 443 ssl;
    server_name rag-images.example.com;

    location /images/ {
        alias /var/data/jay-rag/output/images/;
        expires 30d;
        add_header Access-Control-Allow-Origin "*";
    }
}
```

---

## Step 3 — Build the LangFlow RAG Flow

Open LangFlow at `http://localhost:7860` and create a new flow. You will build a
retrieval-augmented generation pipeline using these components.

### 3.1 — Document Loading (File Component)

1. Drag a **File** component onto the canvas
2. Upload `manual_enriched.md` through the component
3. This provides the raw text content to the splitter

### 3.2 — Text Splitting (Recursive Character Text Splitter)

1. Drag a **RecursiveCharacterTextSplitter** component onto the canvas
2. Connect the File output to the splitter input
3. Configure:

| Setting | Value |
|---------|-------|
| Chunk Size | 1000 |
| Chunk Overlap | 200 |
| Separators | `["---", "\n\n", "\n"]` |

The `---` separator matches JAY-RAG-TOOLS page dividers, keeping `[IMAGE:]` tags
together with their surrounding text.

### 3.3 — Embeddings

Drag an embedding component onto the canvas:

**Option A: Ollama Embeddings**
- Model: `nomic-embed-text`
- Base URL: `http://localhost:11434`

**Option B: OpenAI Embeddings**
- Model: `text-embedding-3-small`
- API Key: your OpenAI key (or set via Global Variables)

### 3.4 — Vector Store

Drag a vector store component onto the canvas:

**Option A: Chroma**
- Collection Name: `thai_manual`
- Persist Directory: `./chroma_db`

**Option B: Qdrant**
- Collection Name: `thai_manual`
- URL: `http://localhost:6333`

**Option C: FAISS (In-Memory)**
- Good for development and testing

Connect:
- Text Splitter output -> Vector Store "documents" input
- Embeddings output -> Vector Store "embeddings" input

### 3.5 — Retriever

1. The vector store component typically has a built-in retriever output
2. Set **Search Type** to `similarity`
3. Set **Top K** to `4`

### 3.6 — Chat Model (LLM)

Drag a Chat Model component:

**Option A: Ollama**
- Model: `qwen2.5vl` or `llama3.1`
- Base URL: `http://localhost:11434`
- Temperature: `0.3`

**Option B: OpenAI**
- Model: `gpt-4o`
- Temperature: `0.3`

**Option C: Anthropic**
- Model: `claude-sonnet-4-20250514`
- Temperature: `0.3`

### 3.7 — Prompt Template

Drag a **Prompt** component and configure the template:

**System Message:**

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

**Human Message:**

```
Context:
{context}

Question: {question}
```

### 3.8 — Retrieval QA Chain

Connect everything together:

```
[ Chat Input ]
       |
[ Prompt Template ]
    |-- context <-- [ Vector Store Retriever ]
    |                    |-- [ Vector Store (Chroma/Qdrant) ]
    |                    |       |-- documents <-- [ Text Splitter ] <-- [ File ]
    |                    |       |-- embeddings <-- [ Embeddings ]
    |                    |
    +-- question <-- [ Chat Input ]
       |
[ Chat Model (LLM) ]
       |
[ Chat Output ]
```

### 3.9 — Chat Output

1. Drag a **Chat Output** component
2. Connect the LLM output to it
3. This displays the final response in the LangFlow chat interface

---

## Step 4 — Save and Test

1. Click **Save** to save the flow
2. Click the **Playground** button (chat icon) to open the chat interface
3. Test with a query:

```
วิธีตั้งค่า Wi-Fi ทำอย่างไร?
```

4. Verify:
   - Response is in Thai
   - `[IMAGE:]` tags are converted to `<img>` HTML tags
   - Images are visible in the chat
   - Text explanations accompany the images

---

## Step 5 — Deploy as API (Optional)

LangFlow flows can be exposed as APIs for integration with other applications.

1. Click the **API** button in the flow editor
2. Copy the flow ID
3. Call the API:

```bash
curl -X POST "http://localhost:7860/api/v1/run/{flow_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "input_value": "วิธีตั้งค่า Wi-Fi?",
    "output_type": "chat",
    "input_type": "chat"
  }'
```

---

## End-to-End Example

```
User: "วิธีอัปเดตซอฟต์แวร์ของเครื่อง?"
       |
       v
LangFlow Vector Store Retriever fetches top-4 chunks
       |
       v
Retrieved chunk:
  "## หน้า 15 — อัปเดตซอฟต์แวร์

   1. เปิด Settings > System > Software Update
   2. แตะ Check for Updates

   [IMAGE:manual_page_015_img1.png]
   **[รูปที่ 1]:** ภาพหน้าจอแสดงหน้า Software Update
   พร้อมปุ่ม Download and Install

   3. หากมีอัปเดต ให้แตะ Download and Install
   4. รอจนเครื่องรีสตาร์ทเสร็จ"
       |
       v
Prompt template injects context + question into LLM
       |
       v
LLM output:
  "วิธีอัปเดตซอฟต์แวร์มีขั้นตอนดังนี้:

   1. เปิด Settings > System > Software Update
   2. แตะ Check for Updates

   <img src='http://localhost:3000/images/manual/manual_page_015_img1.png'
        style='max-width:100%;border-radius:8px;margin:8px 0;' />

   ภาพด้านบนแสดงหน้า Software Update ซึ่งจะมีปุ่ม Download and Install

   3. หากมีอัปเดต ให้แตะ Download and Install
   4. รอจนเครื่องรีสตาร์ทเสร็จสมบูรณ์"
```

---

## Troubleshooting

### Images not rendering in LangFlow chat

| Symptom | Cause | Fix |
|---------|-------|-----|
| Broken image icon | Image server not running | Start `jay-rag serve --port 3000` |
| 404 on image URL | Wrong document folder name | Check `output/images/` subfolder name matches the system prompt URL |
| CORS error | Cross-origin blocked | Use `jay-rag serve` (handles CORS) or add CORS headers to your server |
| Raw HTML shown as text | Chat output not rendering HTML | Check LangFlow version; upgrade to latest for HTML rendering support |

### Vector store issues

- **Empty retrieval results:** Ensure the vector store was built (check that documents were embedded). Re-run the flow to rebuild.
- **Irrelevant results:** Lower the Top K or try a different embedding model
- **Chroma persistence error:** Ensure the persist directory exists and is writable

### Flow build errors

- **Missing API key:** Set API keys in LangFlow's Global Variables (Settings > Global Variables)
- **Ollama connection refused:** Ensure Ollama is running (`ollama serve`)
- **Component version mismatch:** Update LangFlow to the latest version (`pip install langflow --upgrade`)

### Chunks splitting image tags from context

- Increase chunk size to 1000+ characters
- Set chunk overlap to 200
- Use `["---", "\n\n", "\n"]` as separators (the `---` separator should come first)

### Thai text issues

- For scanned PDFs, lower the page-image threshold:
  `jay-rag process --input manual.pdf --page-image-threshold 0.3`
- Use `qwen2.5vl` for best Thai OCR results
- Verify the enriched Markdown file contains correct Thai text before loading into LangFlow

### Health checks

```bash
# JAY-RAG-TOOLS server
curl http://localhost:3000/api/health

# LangFlow server
curl http://localhost:7860/health

# Ollama
curl http://localhost:11434/api/tags

# Qdrant (if using)
curl http://localhost:6333/collections
```

---

## Recommended Settings Summary

| Component | Setting | Value |
|-----------|---------|-------|
| JAY-RAG-TOOLS | Provider | Ollama `qwen2.5vl` (local) or OpenAI GPT-4o (cloud) |
| JAY-RAG-TOOLS | Image server | `jay-rag serve --port 3000` |
| LangFlow | Text Splitter | RecursiveCharacterTextSplitter |
| LangFlow | Chunk Size | 1000 |
| LangFlow | Chunk Overlap | 200 |
| LangFlow | Separators | `["---", "\n\n", "\n"]` |
| LangFlow | Embeddings | `nomic-embed-text` (Ollama) or `text-embedding-3-small` (OpenAI) |
| LangFlow | Vector Store | Chroma or Qdrant |
| LangFlow | Top K | 4 |
| LangFlow | Chat Model Temperature | 0.3 |

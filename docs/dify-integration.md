# Dify Integration Guide — JAY-RAG-TOOLS v2.0

## Overview

This guide explains how to integrate **JAY-RAG-TOOLS v2.0** with
[Dify](https://dify.ai/) so that Thai-language manuals processed by JAY-RAG-TOOLS
can power Dify chatbot and workflow applications, with actual screenshots and diagrams
from the source PDFs displayed inline in chat responses.

Dify provides a Knowledge Base feature that accepts Markdown document uploads, making
it a natural fit for JAY-RAG-TOOLS enriched Markdown output.

---

## Prerequisites

- **JAY-RAG-TOOLS v2.0** installed and configured
- **Dify** running (self-hosted or Dify Cloud)
  - Self-hosted: https://docs.dify.ai/getting-started/install-self-hosted
  - Cloud: https://cloud.dify.ai/
- A Vision LLM provider for PDF processing:
  - **Ollama** (local): `ollama pull qwen2.5vl`
  - **OpenAI**: `OPENAI_API_KEY` set
  - **Anthropic Claude**: `ANTHROPIC_API_KEY` set
- An LLM model configured in Dify (Settings > Model Providers)
- An embedding model configured in Dify

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
  manual_enriched.md              <-- Upload this to Dify Knowledge Base
  manual_images_metadata.json     <-- Image catalog
  images/
    manual/
      manual_page_001_full.png
      manual_page_003_img1.png
      ...
```

---

## Step 2 — Start the Image Server

Dify chat applications render HTML in responses, so images must be accessible via HTTP.

### Built-in Server (Recommended)

```bash
jay-rag serve --port 3000
```

Images are served at:

```
http://localhost:3000/images/manual/manual_page_003_img1.png
```

### Production Setup

For production deployments, serve images behind a reverse proxy or CDN:

```nginx
server {
    listen 443 ssl;
    server_name rag-images.example.com;

    location /images/ {
        alias /var/data/jay-rag/output/images/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*";
    }
}
```

---

## Step 3 — Create a Dify Knowledge Base

1. Open Dify and navigate to **Knowledge** in the left sidebar
2. Click **Create Knowledge** and name it (e.g., `"Thai Device Manual"`)
3. Click **Import from File** and upload `manual_enriched.md`
4. Configure the text processing settings:

### Indexing Settings

| Setting | Recommended Value | Notes |
|---------|-------------------|-------|
| Indexing mode | High Quality | Uses embedding model for semantic search |
| Segmentation | Custom | Allows setting separators |
| Segment separator | `---` | Matches JAY-RAG-TOOLS page dividers |
| Maximum segment length | 1000 | Keep image tags with their text context |
| Segment overlap | 200 | Prevents losing context at boundaries |
| Embedding model | `text-embedding-3-small` or Ollama `nomic-embed-text` | Must be configured in Model Providers |

5. Click **Save and Process**
6. Wait for the indexing to complete (progress shown in the UI)

### Upload via Dify API (optional)

```bash
# Create a knowledge base document via API
curl -X POST "https://your-dify-instance/v1/datasets/{dataset_id}/document/create_by_file" \
  -H "Authorization: Bearer DIFY_API_KEY" \
  -F "file=@output/manual_enriched.md" \
  -F 'data={"indexing_technique":"high_quality","process_rule":{"mode":"custom","rules":{"pre_processing_rules":[{"id":"remove_extra_spaces","enabled":true}],"segmentation":{"separator":"---","max_tokens":1000,"chunk_overlap":200}}}}'
```

---

## Step 4 — Create a Dify Application

### Chatbot App (Simple)

1. Go to **Studio** (or **Build Apps**) in the left sidebar
2. Click **Create from Blank** and choose **Chatbot**
3. Name it (e.g., `"Thai Manual Assistant"`)
4. In the app configuration:
   - **Model:** Select your preferred LLM (GPT-4o, Claude, or Ollama model)
   - **Context:** Click **Add** and select the Knowledge Base you created (`"Thai Device Manual"`)
   - **Top K:** Set to `4`
   - **Score Threshold:** Set to `0.5` (adjust based on retrieval quality)

### Workflow App (Advanced)

For more control, create a **Chatflow** or **Workflow** app:

1. Click **Create from Blank** and choose **Chatflow**
2. Build this flow:

```
[ Start ]
    |
[ Knowledge Retrieval ]
    Knowledge: Thai Device Manual
    Top K: 4
    Score Threshold: 0.5
    |
[ LLM ]
    Model: GPT-4o / Claude / Ollama
    Context: {{#knowledge_retrieval.result#}}
    System Prompt: (see below)
    |
[ Answer ]
```

---

## Step 5 — Configure the System Prompt

In your Chatbot or Chatflow LLM node, set the system prompt. Update the URL base to
match your image server and document name.

### For Chatbot Apps

Paste into the **Instructions** field:

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

### For Chatflow/Workflow LLM Node

In the LLM node's **System** prompt field, use the same text above. In the **User**
prompt, include the context variable:

```
Context:
{{#context#}}

User question:
{{#query#}}
```

---

## Step 6 — Test the Integration

1. Open your app and click **Debug and Preview** (or **Run**)
2. Ask a question:

```
วิธีตั้งค่า Wi-Fi ทำอย่างไร?
```

3. Verify that:
   - The response is in Thai
   - `[IMAGE:...]` tags have been converted to `<img>` HTML tags
   - Images are visible in the chat response
   - Text explanations accompany the images

---

## End-to-End Example

```
User: "วิธีถ่ายภาพหน้าจอ?"
       |
       v
Dify Knowledge Retrieval fetches top-4 segments
       |
       v
Retrieved segment:
  "## หน้า 12 — การถ่ายภาพหน้าจอ

   วิธีที่ 1: กดปุ่ม Power + Volume Down พร้อมกัน

   [IMAGE:manual_page_012_img1.png]
   **[รูปที่ 1]:** ภาพแสดงตำแหน่งปุ่ม Power และ Volume Down บนตัวเครื่อง

   วิธีที่ 2: ปัดลงจากด้านบน แล้วแตะไอคอน Screenshot

   [IMAGE:manual_page_012_img2.png]
   **[รูปที่ 2]:** ภาพหน้าจอแสดง Quick Settings พร้อมไอคอน Screenshot"
       |
       v
LLM generates response with <img> tags:
  "การถ่ายภาพหน้าจอทำได้ 2 วิธี:

   **วิธีที่ 1:** กดปุ่ม Power + Volume Down พร้อมกัน

   <img src='http://localhost:3000/images/manual/manual_page_012_img1.png'
        style='max-width:100%;border-radius:8px;margin:8px 0;' />

   ภาพด้านบนแสดงตำแหน่งของปุ่มที่ต้องกด

   **วิธีที่ 2:** ปัดลงจากด้านบนแล้วแตะไอคอน Screenshot

   <img src='http://localhost:3000/images/manual/manual_page_012_img2.png'
        style='max-width:100%;border-radius:8px;margin:8px 0;' />

   ภาพด้านบนแสดง Quick Settings ที่มีไอคอน Screenshot ให้แตะ"
```

---

## Troubleshooting

### Images not rendering in Dify chat

| Symptom | Cause | Fix |
|---------|-------|-----|
| Broken image icon | Image server not running | Start `jay-rag serve --port 3000` |
| Image URL returns 404 | Document folder name mismatch | Verify the folder name under `output/images/` matches the URL path |
| Images not displayed at all | Dify markdown rendering issue | Ensure the LLM outputs proper HTML `<img>` tags, not markdown image syntax |
| CORS error | Cross-origin request blocked | Use the built-in `jay-rag serve` (handles CORS) or add CORS headers |

### Knowledge Base indexing issues

- **Segments too small:** Increase maximum segment length to 1000+
- **Image tags split across segments:** Use `---` as separator and increase overlap to 200
- **Re-index:** Delete the knowledge base document and re-upload after changing settings

### Dify Cloud specific notes

- If using Dify Cloud (not self-hosted), your image server must be publicly accessible
- Use a public URL (with HTTPS) instead of `localhost` in the system prompt
- Consider using a CDN or cloud storage (S3, GCS) for image hosting

### LLM not following the system prompt

- Some smaller models ignore complex system prompts; use GPT-4o or Claude for best results
- Simplify the system prompt if the model struggles
- Test with Dify's "Debug and Preview" mode to iterate on the prompt

### Processing failures

```bash
# Check JAY-RAG-TOOLS server
curl http://localhost:3000/api/health

# Check Ollama
curl http://localhost:11434/api/tags

# Re-process with verbose logging
jay-rag process --input manual.pdf --provider ollama --model qwen2.5vl --output ./output --verbose
```

---

## Recommended Settings Summary

| Component | Setting | Value |
|-----------|---------|-------|
| JAY-RAG-TOOLS | Provider | Ollama `qwen2.5vl` (local) or OpenAI GPT-4o (cloud) |
| JAY-RAG-TOOLS | Image server | `jay-rag serve --port 3000` |
| Dify | Knowledge indexing | High Quality |
| Dify | Segment separator | `---` |
| Dify | Max segment length | 1000 |
| Dify | Segment overlap | 200 |
| Dify | Embedding model | `text-embedding-3-small` or `nomic-embed-text` |
| Dify | Retrieval Top K | 4 |
| Dify | Score threshold | 0.5 |
| Dify | Chat LLM | GPT-4o / Claude / Ollama `qwen2.5vl` |

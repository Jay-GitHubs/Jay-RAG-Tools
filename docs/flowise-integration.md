# Flowise Integration Guide

## Overview

This guide explains how to connect `pdf-vision-rag` output into a Flowise RAG pipeline
so that users see actual screenshots from the manual inline in chat responses.

---

## Step 1 — Run the Processor

```bash
python -m src.main --input manual.pdf --provider ollama --model qwen2.5vl --output ./output
```

Output structure:
```
output/
  manual_enriched.md              ← Load this into Flowise
  manual_images_metadata.json     ← Image catalog (optional use)
  images/
    manual/
      manual_page_001_full.png
      manual_page_003_img1.png
      ...
```

---

## Step 2 — Serve Images as Static HTTP

Flowise chat UI needs to load images via HTTP URL, not file path.

```bash
# Simple (development)
python3 -m http.server 8899 --directory ./output

# Images accessible at:
# http://localhost:8899/images/manual/manual_page_003_img1.png
```

For production, use nginx or any static file server.

---

## Step 3 — Flowise Document Store

1. Go to **Document Stores → New Store** → name it `"Manual KM Store"`
2. Add **Text File Loader** node → select `manual_enriched.md`
3. Add **Recursive Character Text Splitter**:
   - Chunk Size: `1000`
   - Chunk Overlap: `200`
   - Separator: `---` (matches our page dividers)
4. Add **Embeddings** (Ollama `nomic-embed-text` or OpenAI `text-embedding-3-small`)
5. Add **Vector Store** (Qdrant / Chroma / PGVector)
6. Click **"Process All Chunks"**

---

## Step 4 — Flowise RAG Chatflow

Create **New Chatflow → "RAG with Vision"**

Nodes:
```
[ Chat Input ]
       ↓
[ Conversational Retrieval QA Chain ]
    ├── [ Vector Store Retriever ]
    │     Collection: manual_vision_store
    │     Top K: 4
    │
    └── [ Chat LLM ]
          Ollama: qwen2.5vl
          (or OpenAI GPT-4o)
       ↓
[ Chat Output ]
```

System Prompt:
```
คุณเป็นผู้ช่วยด้านเทคนิคสำหรับคู่มือการใช้งานอุปกรณ์มือถือ
เมื่อคุณพบ [IMAGE:filename.png] ใน context ให้แปลงเป็น:
<img src="http://localhost:8899/images/manual/filename.png" style="max-width:100%;border-radius:8px;" />
ตอบเป็นภาษาไทยและแสดงภาพประกอบเสมอหากมีอยู่ใน context
```

---

## How It Works End-to-End

```
User: "วิธีตั้งค่า Wi-Fi?"
       ↓
Vector Store retrieves top-4 chunks
       ↓
Chunk contains:
  "ขั้นตอนที่ 2: แตะ Settings
   [IMAGE:manual_page_005_img1.png]
   **[ภาพที่ 1]:** ภาพหน้าจอแสดงเมนูตั้งค่า Wi-Fi..."
       ↓
System prompt converts [IMAGE:...] → <img src="...">
       ↓
Chat UI renders:
  - Thai text instructions
  - Actual screenshot from the manual ✅
```

"""
prompts.py — Centralized Vision LLM Prompts
============================================
All prompts used when sending images to vision models.
Thai prompts produce better results for Thai-language documents.

To add a new language: add a new dict key and update get_prompts().
"""

# ─────────────────────────────────────────────
# THAI PROMPTS (default)
# ─────────────────────────────────────────────
TH_FULL_PAGE = (
    "หน้านี้มาจากคู่มือการใช้งานอุปกรณ์มือถือภาษาไทย\n"
    "กรุณาทำสิ่งต่อไปนี้:\n"
    "1. คัดลอกข้อความภาษาไทยทั้งหมดที่ปรากฏบนหน้านี้ให้ครบถ้วนและถูกต้อง\n"
    "2. สำหรับภาพ ไดอะแกรม หรือภาพหน้าจอ ให้อธิบายเป็นภาษาไทยอย่างละเอียด\n"
    "   เช่น ตำแหน่งปุ่ม องค์ประกอบ UI ลูกศร และหมายเลขขั้นตอน\n"
    "3. จัดรูปแบบผลลัพธ์เป็น Markdown ที่สะอาด มีหัวข้อและขั้นตอนที่ชัดเจน\n"
    "ห้ามแปลข้อความ ให้คงภาษาไทยไว้ทั้งหมด"
)

TH_SINGLE_IMAGE = (
    "ภาพนี้มาจากคู่มือการใช้งานอุปกรณ์มือถือภาษาไทย\n"
    "กรุณาอธิบายสิ่งที่เห็นในภาพอย่างละเอียดเป็นภาษาไทย:\n"
    "- ภาพหน้าจอ UI หรือเมนู\n"
    "- ไดอะแกรมหรือแผนภาพ\n"
    "- ป้ายกำกับปุ่ม ลูกศร หรือตัวเลขขั้นตอน\n"
    "- คำแนะนำที่เป็นภาพ\n"
    "หากมีข้อความในภาพให้คัดลอกออกมาด้วย ตอบเป็นภาษาไทยในรูปแบบย่อหน้าสั้นๆ"
)

# ─────────────────────────────────────────────
# ENGLISH PROMPTS
# ─────────────────────────────────────────────
EN_FULL_PAGE = (
    "This page is from a device manual. "
    "Please transcribe ALL visible text exactly as shown. "
    "For diagrams, screenshots, or illustrations, describe them in detail "
    "including button locations, UI elements, arrows, and step numbers. "
    "Format as clean Markdown with proper headings and numbered steps."
)

EN_SINGLE_IMAGE = (
    "This image is from a device manual. "
    "Describe what you see in detail: UI screenshots, diagrams, "
    "button labels, arrows, step indicators, or visual instructions. "
    "If there is text in the image, transcribe it. "
    "Be specific and technical. Output as a short paragraph."
)

# ─────────────────────────────────────────────
# PROMPT REGISTRY
# ─────────────────────────────────────────────
PROMPTS = {
    "th": {
        "full_page":    TH_FULL_PAGE,
        "single_image": TH_SINGLE_IMAGE,
    },
    "en": {
        "full_page":    EN_FULL_PAGE,
        "single_image": EN_SINGLE_IMAGE,
    },
}


def get_prompts(lang: str = "th") -> dict:
    """
    Return the prompt set for the given language code.
    Falls back to Thai if language not found.

    Args:
        lang: Language code — "th" (Thai) or "en" (English)

    Returns:
        dict with keys: full_page, single_image
    """
    return PROMPTS.get(lang, PROMPTS["th"])

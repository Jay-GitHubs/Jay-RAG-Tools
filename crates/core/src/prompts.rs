use crate::config::Language;

/// Thai prompt for full-page render (Strategy A).
pub const TH_FULL_PAGE: &str = "\
หน้านี้มาจากคู่มือการใช้งานอุปกรณ์มือถือภาษาไทย\n\
กรุณาทำสิ่งต่อไปนี้:\n\
1. คัดลอกข้อความภาษาไทยทั้งหมดที่ปรากฏบนหน้านี้ให้ครบถ้วนและถูกต้อง\n\
2. สำหรับภาพ ไดอะแกรม หรือภาพหน้าจอ ให้อธิบายเป็นภาษาไทยอย่างละเอียด\n\
   เช่น ตำแหน่งปุ่ม องค์ประกอบ UI ลูกศร และหมายเลขขั้นตอน\n\
3. จัดรูปแบบผลลัพธ์เป็น Markdown ที่สะอาด มีหัวข้อและขั้นตอนที่ชัดเจน\n\
ห้ามแปลข้อความ ให้คงภาษาไทยไว้ทั้งหมด";

/// Thai prompt for individual image description (Strategy B).
pub const TH_SINGLE_IMAGE: &str = "\
ภาพนี้มาจากคู่มือการใช้งานอุปกรณ์มือถือภาษาไทย\n\
กรุณาอธิบายสิ่งที่เห็นในภาพอย่างละเอียดเป็นภาษาไทย:\n\
- ภาพหน้าจอ UI หรือเมนู\n\
- ไดอะแกรมหรือแผนภาพ\n\
- ป้ายกำกับปุ่ม ลูกศร หรือตัวเลขขั้นตอน\n\
- คำแนะนำที่เป็นภาพ\n\
หากมีข้อความในภาพให้คัดลอกออกมาด้วย ตอบเป็นภาษาไทยในรูปแบบย่อหน้าสั้นๆ";

/// English prompt for full-page render (Strategy A).
pub const EN_FULL_PAGE: &str = "\
This page is from a device manual. \
Please transcribe ALL visible text exactly as shown. \
For diagrams, screenshots, or illustrations, describe them in detail \
including button locations, UI elements, arrows, and step numbers. \
Format as clean Markdown with proper headings and numbered steps.";

/// English prompt for individual image description (Strategy B).
pub const EN_SINGLE_IMAGE: &str = "\
This image is from a device manual. \
Describe what you see in detail: UI screenshots, diagrams, \
button labels, arrows, step indicators, or visual instructions. \
If there is text in the image, transcribe it. \
Be specific and technical. Output as a short paragraph.";

/// Thai prompt for table extraction (full-page content + table formatting).
pub const TH_TABLE_EXTRACTION: &str = "\
หน้านี้มาจากเอกสาร PDF ภาษาไทยและมีตารางอยู่ด้วย\n\
กรุณาทำสิ่งต่อไปนี้:\n\
1. คัดลอกข้อความทั้งหมดบนหน้านี้ (หัวข้อ ย่อหน้า รายการ) ให้ครบถ้วน\n\
2. แปลงตารางทั้งหมดเป็นรูปแบบ Markdown Table โดย:\n\
   - ใส่หัวคอลัมน์ให้ครบถ้วน\n\
   - จัดเรียงข้อมูลในแต่ละเซลล์ให้ถูกต้อง\n\
   - ถ้ามีข้อมูลที่ไม่ชัดเจนให้ใส่ [ไม่ชัดเจน]\n\
3. จัดรูปแบบผลลัพธ์ทั้งหมดเป็น Markdown ที่สะอาด\n\
คงข้อความภาษาไทยไว้ทั้งหมด ห้ามแปลภาษา";

/// English prompt for table extraction (full-page content + table formatting).
pub const EN_TABLE_EXTRACTION: &str = "\
This page is from a PDF document and contains a table.\n\
Please do the following:\n\
1. Transcribe ALL text on this page (headings, paragraphs, lists) completely\n\
2. Convert all tables to Markdown table format:\n\
   - Include all column headers\n\
   - Arrange cell data accurately\n\
   - If any data is unclear, use [unclear]\n\
3. Format the entire output as clean Markdown\n\
Preserve all original text exactly as shown.";

// --- High Quality (Vision-First) Prompts ---

/// Thai high-quality prompt: expert OCR transcription from page image.
pub const TH_HIGH_QUALITY: &str = "\
คุณเป็นผู้เชี่ยวชาญด้าน OCR ภาษาไทย กรุณาถอดข้อความจากภาพหน้าเอกสารนี้อย่างละเอียดและแม่นยำที่สุด\n\
\n\
กฎที่ต้องปฏิบัติตาม:\n\
1. คัดลอกข้อความทุกตัวอักษรตามที่ปรากฏในภาพ รวมถึงวรรณยุกต์ สระ และตัวเลขทั้งหมด\n\
2. รักษาโครงสร้างเอกสาร: หัวข้อใช้ #/##/### ตามลำดับชั้น, รายการใช้ - หรือตัวเลข, ย่อหน้าคั่นด้วยบรรทัดว่าง\n\
3. ตารางให้แปลงเป็น Markdown Table พร้อมหัวคอลัมน์ให้ครบถ้วน\n\
4. ภาพ ไดอะแกรม หรือภาพหน้าจอ ให้อธิบายรายละเอียดเป็นภาษาไทย\n\
5. ข้อความที่อ่านไม่ชัดให้ใส่ [ไม่ชัดเจน]\n\
6. ห้ามแปลภาษา คงภาษาไทยไว้ทั้งหมด\n\
7. ตอบเฉพาะเนื้อหา Markdown เท่านั้น ห้ามใส่คำอธิบายเพิ่มเติม";

/// Thai high-quality prompt with pdfium text hint.
pub const TH_HIGH_QUALITY_WITH_HINT: &str = "\
คุณเป็นผู้เชี่ยวชาญด้าน OCR ภาษาไทย กรุณาถอดข้อความจากภาพหน้าเอกสารนี้อย่างละเอียดและแม่นยำที่สุด\n\
\n\
ด้านล่างนี้คือข้อความอ้างอิงที่สกัดจาก PDF โดยอัตโนมัติ อาจมีข้อผิดพลาด เช่น ลำดับตัวอักษรสลับ สระลอย วรรณยุกต์หาย ใช้เป็นตัวช่วยตรวจสอบคำที่ไม่ชัดเท่านั้น ภาพคือแหล่งข้อมูลหลัก\n\
\n\
--- ข้อความอ้างอิงจาก PDF ---\n\
{hint_text}\n\
--- สิ้นสุดข้อความอ้างอิง ---\n\
\n\
กฎที่ต้องปฏิบัติตาม:\n\
1. คัดลอกข้อความทุกตัวอักษรตามที่ปรากฏในภาพ รวมถึงวรรณยุกต์ สระ และตัวเลขทั้งหมด\n\
2. รักษาโครงสร้างเอกสาร: หัวข้อใช้ #/##/### ตามลำดับชั้น, รายการใช้ - หรือตัวเลข, ย่อหน้าคั่นด้วยบรรทัดว่าง\n\
3. ตารางให้แปลงเป็น Markdown Table พร้อมหัวคอลัมน์ให้ครบถ้วน\n\
4. ภาพ ไดอะแกรม หรือภาพหน้าจอ ให้อธิบายรายละเอียดเป็นภาษาไทย\n\
5. ข้อความที่อ่านไม่ชัดให้ใส่ [ไม่ชัดเจน]\n\
6. ห้ามแปลภาษา คงภาษาไทยไว้ทั้งหมด\n\
7. ตอบเฉพาะเนื้อหา Markdown เท่านั้น ห้ามใส่คำอธิบายเพิ่มเติม";

/// English high-quality prompt: expert OCR transcription from page image.
pub const EN_HIGH_QUALITY: &str = "\
You are an expert document OCR system. Transcribe this page image with maximum accuracy.\n\
\n\
Rules:\n\
1. Transcribe every character exactly as shown in the image, including numbers, symbols, and punctuation\n\
2. Preserve document structure: headings as #/##/###, lists as - or numbered, paragraphs separated by blank lines\n\
3. Convert tables to Markdown tables with complete column headers\n\
4. Describe images, diagrams, or screenshots in detail\n\
5. Mark unclear text as [unclear]\n\
6. Output clean Markdown only — no commentary or explanation";

/// English high-quality prompt with pdfium text hint.
pub const EN_HIGH_QUALITY_WITH_HINT: &str = "\
You are an expert document OCR system. Transcribe this page image with maximum accuracy.\n\
\n\
Below is reference text extracted automatically from the PDF. It may contain errors such as wrong character ordering, missing diacritics, or garbled text. Use it only to verify ambiguous words — the image is the primary source.\n\
\n\
--- Reference text from PDF ---\n\
{hint_text}\n\
--- End reference text ---\n\
\n\
Rules:\n\
1. Transcribe every character exactly as shown in the image, including numbers, symbols, and punctuation\n\
2. Preserve document structure: headings as #/##/###, lists as - or numbered, paragraphs separated by blank lines\n\
3. Convert tables to Markdown tables with complete column headers\n\
4. Describe images, diagrams, or screenshots in detail\n\
5. Mark unclear text as [unclear]\n\
6. Output clean Markdown only — no commentary or explanation";

/// A set of prompts for a specific language.
#[derive(Debug, Clone)]
pub struct Prompts {
    pub full_page: &'static str,
    pub single_image: &'static str,
    pub table_extraction: &'static str,
    pub high_quality: &'static str,
    pub high_quality_with_hint: &'static str,
}

/// Get the prompt set for the given language.
pub fn get_prompts(lang: Language) -> Prompts {
    match lang {
        Language::Th => Prompts {
            full_page: TH_FULL_PAGE,
            single_image: TH_SINGLE_IMAGE,
            table_extraction: TH_TABLE_EXTRACTION,
            high_quality: TH_HIGH_QUALITY,
            high_quality_with_hint: TH_HIGH_QUALITY_WITH_HINT,
        },
        Language::En => Prompts {
            full_page: EN_FULL_PAGE,
            single_image: EN_SINGLE_IMAGE,
            table_extraction: EN_TABLE_EXTRACTION,
            high_quality: EN_HIGH_QUALITY,
            high_quality_with_hint: EN_HIGH_QUALITY_WITH_HINT,
        },
    }
}

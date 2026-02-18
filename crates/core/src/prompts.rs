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

/// Thai prompt for table extraction.
pub const TH_TABLE_EXTRACTION: &str = "\
ภาพนี้มีตาราง กรุณาแปลงตารางเป็นรูปแบบ Markdown Table\n\
- คงข้อความภาษาไทยไว้ทั้งหมด\n\
- ใส่หัวคอลัมน์ให้ครบถ้วน\n\
- จัดเรียงข้อมูลในแต่ละเซลล์ให้ถูกต้อง\n\
- ถ้ามีข้อมูลที่ไม่ชัดเจนให้ใส่ [ไม่ชัดเจน]\n\
ให้ผลลัพธ์เป็น Markdown Table เท่านั้น ไม่ต้องอธิบายเพิ่มเติม";

/// English prompt for table extraction.
pub const EN_TABLE_EXTRACTION: &str = "\
This image contains a table. Convert it to Markdown table format.\n\
- Include all column headers\n\
- Arrange cell data accurately\n\
- If any data is unclear, use [unclear]\n\
Output only the Markdown table, no additional explanation.";

/// A set of prompts for a specific language.
#[derive(Debug, Clone)]
pub struct Prompts {
    pub full_page: &'static str,
    pub single_image: &'static str,
    pub table_extraction: &'static str,
}

/// Get the prompt set for the given language.
pub fn get_prompts(lang: Language) -> Prompts {
    match lang {
        Language::Th => Prompts {
            full_page: TH_FULL_PAGE,
            single_image: TH_SINGLE_IMAGE,
            table_extraction: TH_TABLE_EXTRACTION,
        },
        Language::En => Prompts {
            full_page: EN_FULL_PAGE,
            single_image: EN_SINGLE_IMAGE,
            table_extraction: EN_TABLE_EXTRACTION,
        },
    }
}

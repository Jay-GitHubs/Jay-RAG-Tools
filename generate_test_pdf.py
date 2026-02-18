"""Generate a test Thai mobile manual PDF with text and images."""
import fitz  # PyMuPDF
from pathlib import Path

# Thai font path (macOS system Thai font)
THAI_FONT = "/System/Library/Fonts/Supplemental/Thonburi.ttc"

def make_screenshot(width, height, color, label):
    """Create a simple colored rectangle with text as a fake screenshot."""
    doc = fitz.open()
    page = doc.new_page(width=width, height=height)
    page.draw_rect(fitz.Rect(0, 0, width, height), color=color, fill=color)
    # Add a border
    page.draw_rect(fitz.Rect(2, 2, width-2, height-2), color=(0.3, 0.3, 0.3), width=2)
    # Add some UI-like elements
    page.draw_rect(fitz.Rect(10, 10, width-10, 50), color=(0.2, 0.2, 0.2), fill=(0.2, 0.2, 0.2))
    page.insert_text((20, 38), label, fontsize=14, color=(1, 1, 1))
    # Add fake buttons
    for i, btn in enumerate(["OK", "Cancel", "Help"]):
        x = 30 + i * 90
        page.draw_rect(fitz.Rect(x, height-60, x+70, height-30),
                       color=(0.4, 0.4, 0.8), fill=(0.4, 0.4, 0.8))
        page.insert_text((x+15, height-40), btn, fontsize=11, color=(1, 1, 1))

    pix = page.get_pixmap(dpi=150)
    img_bytes = pix.tobytes("png")
    doc.close()
    return img_bytes


def create_test_pdf(output_path="test.pdf"):
    doc = fitz.open()

    # ─── Page 1: Cover / Title ───
    page = doc.new_page()
    w, h = page.rect.width, page.rect.height

    # Title block
    page.draw_rect(fitz.Rect(50, 80, w-50, 250), color=(0.1, 0.3, 0.7), fill=(0.1, 0.3, 0.7))
    page.insert_text((80, 150), "คู่มือการใช้งาน", fontname="thai", fontfile=THAI_FONT,
                     fontsize=28, color=(1, 1, 1))
    page.insert_text((80, 200), "สมาร์ทโฟน รุ่น XZ-500 Pro", fontname="thai", fontfile=THAI_FONT,
                     fontsize=18, color=(0.9, 0.9, 1))

    page.insert_text((80, 300), "สารบัญ", fontname="thai", fontfile=THAI_FONT,
                     fontsize=20, color=(0, 0, 0))

    toc_items = [
        "1. การเริ่มต้นใช้งาน ..................... หน้า 2",
        "2. การตั้งค่า Wi-Fi ...................... หน้า 3",
        "3. การใช้งานกล้อง ....................... หน้า 4",
        "4. การแก้ไขปัญหา ....................... หน้า 5",
    ]
    y = 340
    for item in toc_items:
        page.insert_text((100, y), item, fontname="thai", fontfile=THAI_FONT,
                         fontsize=13, color=(0.2, 0.2, 0.2))
        y += 30

    page.insert_text((80, 550), "เวอร์ชัน 2.0 | ภาษาไทย", fontname="thai", fontfile=THAI_FONT,
                     fontsize=11, color=(0.5, 0.5, 0.5))

    # ─── Page 2: Getting Started (text-heavy) ───
    page = doc.new_page()
    page.insert_text((50, 60), "1. การเริ่มต้นใช้งาน", fontname="thai", fontfile=THAI_FONT,
                     fontsize=22, color=(0.1, 0.3, 0.7))

    paragraphs = [
        "ขอบคุณที่เลือกใช้สมาร์ทโฟน XZ-500 Pro คู่มือนี้จะช่วยให้คุณเริ่มต้นใช้งานอุปกรณ์ได้อย่างรวดเร็ว",
        "",
        "1.1 สิ่งที่อยู่ในกล่อง",
        "  • สมาร์ทโฟน XZ-500 Pro จำนวน 1 เครื่อง",
        "  • สาย USB-C จำนวน 1 เส้น",
        "  • อะแดปเตอร์ชาร์จ 65W จำนวน 1 ตัว",
        "  • คู่มือการใช้งานฉบับย่อ",
        "  • เข็มจิ้มถาดซิม จำนวน 1 อัน",
        "",
        "1.2 การใส่ซิมการ์ด",
        "ขั้นตอนที่ 1: ใช้เข็มจิ้มถาดซิมกดที่รูด้านซ้ายของเครื่อง",
        "ขั้นตอนที่ 2: วางซิมการ์ด (nano-SIM) ลงในถาด",
        "ขั้นตอนที่ 3: ดันถาดซิมกลับเข้าไปจนสุด",
        "",
        "1.3 การเปิดเครื่อง",
        "กดปุ่มเปิด/ปิดที่ด้านขวาค้างไว้ 3 วินาที จนหน้าจอแสดงโลโก้ XZ",
        "รอประมาณ 30 วินาทีจนกว่าจะเข้าสู่หน้าจอตั้งค่าเริ่มต้น",
        "",
        "1.4 การตั้งค่าเริ่มต้น",
        "เลือกภาษา → เชื่อมต่อ Wi-Fi → ลงชื่อเข้าใช้บัญชี Google → เสร็จสิ้น",
    ]

    y = 100
    for line in paragraphs:
        if line == "":
            y += 10
            continue
        size = 14 if line.startswith("1.") and not line.startswith("  ") else 12
        color = (0.1, 0.1, 0.1) if not line.startswith("1.") or line.startswith("  ") else (0.2, 0.2, 0.5)
        page.insert_text((70, y), line, fontname="thai", fontfile=THAI_FONT,
                         fontsize=size, color=color)
        y += 22

    # Small image on this page
    img1 = make_screenshot(200, 150, (0.95, 0.95, 0.95), "Power Button")
    page.insert_image(fitz.Rect(350, 350, 550, 500), stream=img1)

    # ─── Page 3: Wi-Fi Settings (image-heavy — should trigger Strategy A) ───
    page = doc.new_page()
    page.insert_text((50, 60), "2. การตั้งค่า Wi-Fi", fontname="thai", fontfile=THAI_FONT,
                     fontsize=22, color=(0.1, 0.3, 0.7))

    # Large screenshot covering most of the page
    wifi_img = make_screenshot(400, 600, (0.92, 0.95, 1.0), "Wi-Fi Settings")
    page.insert_image(fitz.Rect(50, 90, 450, 690), stream=wifi_img)

    # Second image
    wifi_img2 = make_screenshot(200, 300, (0.9, 1.0, 0.9), "Connected")
    page.insert_image(fitz.Rect(350, 400, 550, 700), stream=wifi_img2)

    page.insert_text((50, 730), "แตะที่ชื่อเครือข่ายที่ต้องการเชื่อมต่อ แล้วใส่รหัสผ่าน",
                     fontname="thai", fontfile=THAI_FONT, fontsize=11, color=(0.3, 0.3, 0.3))

    # ─── Page 4: Camera (mixed text + images) ───
    page = doc.new_page()
    page.insert_text((50, 60), "3. การใช้งานกล้อง", fontname="thai", fontfile=THAI_FONT,
                     fontsize=22, color=(0.1, 0.3, 0.7))

    camera_text = [
        "กล้อง XZ-500 Pro มีความละเอียด 108 ล้านพิกเซล รองรับการถ่ายวิดีโอ 4K",
        "",
        "3.1 โหมดการถ่ายภาพ",
        "  • อัตโนมัติ — ปรับค่าทั้งหมดให้อัตโนมัติ",
        "  • โปร — ปรับ ISO, ความเร็วชัตเตอร์, สมดุลแสงขาว",
        "  • กลางคืน — ถ่ายในที่แสงน้อย",
        "  • พาโนรามา — ถ่ายภาพกว้าง",
        "",
        "3.2 วิธีการถ่ายภาพ",
        "ขั้นตอนที่ 1: เปิดแอปกล้องจากหน้าจอหลัก",
        "ขั้นตอนที่ 2: เลือกโหมดที่ต้องการ",
        "ขั้นตอนที่ 3: แตะปุ่มชัตเตอร์ หรือกดปุ่มลดเสียง",
    ]

    y = 100
    for line in camera_text:
        if line == "":
            y += 10
            continue
        size = 14 if line.startswith("3.") and not line.startswith("  ") else 12
        color = (0.1, 0.1, 0.1) if not line.startswith("3.") or line.startswith("  ") else (0.2, 0.2, 0.5)
        page.insert_text((70, y), line, fontname="thai", fontfile=THAI_FONT,
                         fontsize=size, color=color)
        y += 22

    # Camera UI screenshots
    cam_img1 = make_screenshot(220, 180, (0.1, 0.1, 0.1), "Camera App")
    page.insert_image(fitz.Rect(50, 400, 270, 580), stream=cam_img1)

    cam_img2 = make_screenshot(220, 180, (0.15, 0.15, 0.2), "Pro Mode")
    page.insert_image(fitz.Rect(300, 400, 520, 580), stream=cam_img2)

    page.insert_text((50, 610), "ภาพที่ 1: หน้าจอแอปกล้อง", fontname="thai", fontfile=THAI_FONT,
                     fontsize=10, color=(0.5, 0.5, 0.5))
    page.insert_text((300, 610), "ภาพที่ 2: โหมดโปร", fontname="thai", fontfile=THAI_FONT,
                     fontsize=10, color=(0.5, 0.5, 0.5))

    # ─── Page 5: Troubleshooting (table-like content) ───
    page = doc.new_page()
    page.insert_text((50, 60), "4. การแก้ไขปัญหา", fontname="thai", fontfile=THAI_FONT,
                     fontsize=22, color=(0.1, 0.3, 0.7))

    page.insert_text((50, 100), "ตารางปัญหาที่พบบ่อยและวิธีแก้ไข", fontname="thai", fontfile=THAI_FONT,
                     fontsize=14, color=(0.2, 0.2, 0.2))

    # Draw a table
    col1, col2, col3 = 50, 230, 410
    row_y = 130
    row_h = 40

    # Header
    page.draw_rect(fitz.Rect(col1, row_y, w-50, row_y+row_h),
                   fill=(0.2, 0.3, 0.6), color=(0.2, 0.3, 0.6))
    page.insert_text((col1+10, row_y+25), "ปัญหา", fontname="thai", fontfile=THAI_FONT,
                     fontsize=12, color=(1, 1, 1))
    page.insert_text((col2+10, row_y+25), "สาเหตุ", fontname="thai", fontfile=THAI_FONT,
                     fontsize=12, color=(1, 1, 1))
    page.insert_text((col3+10, row_y+25), "วิธีแก้ไข", fontname="thai", fontfile=THAI_FONT,
                     fontsize=12, color=(1, 1, 1))

    rows = [
        ("เปิดเครื่องไม่ได้", "แบตเตอรี่หมด", "ชาร์จอย่างน้อย 30 นาที"),
        ("Wi-Fi เชื่อมต่อไม่ได้", "รหัสผ่านผิด", "ตรวจสอบรหัสผ่านอีกครั้ง"),
        ("หน้าจอค้าง", "หน่วยความจำเต็ม", "รีสตาร์ทเครื่อง"),
        ("กล้องไม่ทำงาน", "แอปค้าง", "ล้างแคชแอปกล้อง"),
        ("เสียงไม่ดัง", "โหมดเงียบ", "ปิดโหมดเงียบในการตั้งค่า"),
        ("ชาร์จช้า", "อะแดปเตอร์ไม่ตรงรุ่น", "ใช้อะแดปเตอร์ 65W ที่ให้มา"),
    ]

    for i, (prob, cause, fix) in enumerate(rows):
        ry = row_y + row_h * (i + 1)
        bg = (0.95, 0.95, 0.95) if i % 2 == 0 else (1, 1, 1)
        page.draw_rect(fitz.Rect(col1, ry, w-50, ry+row_h), fill=bg, color=(0.8, 0.8, 0.8))
        page.insert_text((col1+10, ry+25), prob, fontname="thai", fontfile=THAI_FONT,
                         fontsize=10, color=(0.1, 0.1, 0.1))
        page.insert_text((col2+10, ry+25), cause, fontname="thai", fontfile=THAI_FONT,
                         fontsize=10, color=(0.1, 0.1, 0.1))
        page.insert_text((col3+10, ry+25), fix, fontname="thai", fontfile=THAI_FONT,
                         fontsize=10, color=(0.1, 0.1, 0.1))

    # Draw table borders
    table_bottom = row_y + row_h * 7
    page.draw_rect(fitz.Rect(col1, row_y, w-50, table_bottom), color=(0.5, 0.5, 0.5))
    page.draw_line(fitz.Point(col2, row_y), fitz.Point(col2, table_bottom), color=(0.5, 0.5, 0.5))
    page.draw_line(fitz.Point(col3, row_y), fitz.Point(col3, table_bottom), color=(0.5, 0.5, 0.5))

    page.insert_text((50, table_bottom + 40),
                     "หากปัญหายังไม่หายไป กรุณาติดต่อศูนย์บริการ XZ ที่หมายเลข 1234",
                     fontname="thai", fontfile=THAI_FONT, fontsize=12, color=(0.3, 0.3, 0.3))
    page.insert_text((50, table_bottom + 65),
                     "เว็บไซต์: www.xz-mobile.co.th | อีเมล: support@xz-mobile.co.th",
                     fontname="thai", fontfile=THAI_FONT, fontsize=11, color=(0.3, 0.3, 0.3))

    # Save
    doc.save(output_path)
    doc.close()
    print(f"Created {output_path} — 5 pages, Thai mobile manual with text, images, and tables")


if __name__ == "__main__":
    create_test_pdf()

use crate::error::{CoreError, CoreResult};
use base64::Engine;
use image::DynamicImage;
use pdfium_render::prelude::*;
use std::path::Path;

/// An extracted image from a PDF page.
pub struct ExtractedImage {
    /// Raw PNG bytes.
    pub bytes: Vec<u8>,
    /// Base64-encoded PNG string.
    pub base64: String,
    /// Width in pixels.
    pub width: u32,
    /// Height in pixels.
    pub height: u32,
    /// Index of this image on the page.
    pub index: u32,
}

/// Wrapper around the pdfium library for PDF operations.
pub struct PdfEngine {
    pdfium: Pdfium,
}

impl PdfEngine {
    /// Create a new PdfEngine, loading the pdfium library.
    pub fn new() -> CoreResult<Self> {
        let bindings = Pdfium::bind_to_system_library()
            .or_else(|_| {
                Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path("."))
            })
            .map_err(|e| {
                CoreError::Pdfium(format!(
                    "Failed to load pdfium library: {e}\n\
                     Install pdfium: download from https://github.com/nicklockwood/pdfium-binaries/releases\n\
                     Place libpdfium.dylib (macOS) / libpdfium.so (Linux) in the project directory or system path."
                ))
            })?;
        let pdfium = Pdfium::new(bindings);
        Ok(Self { pdfium })
    }

    /// Open a PDF document from a file path.
    pub fn open_document(&self, path: &Path) -> CoreResult<PdfDocument<'_>> {
        self.pdfium
            .load_pdf_from_file(path, None)
            .map_err(|e| CoreError::Pdf(format!("Failed to open PDF '{}': {e}", path.display())))
    }

    /// Get the total number of pages in a document.
    pub fn page_count(doc: &PdfDocument) -> u32 {
        doc.pages().len() as u32
    }

    /// Calculate what fraction of the page area is covered by images.
    pub fn get_image_coverage(page: &PdfPage) -> f64 {
        let page_width = page.width().value as f64;
        let page_height = page.height().value as f64;
        let page_area = page_width * page_height;

        if page_area == 0.0 {
            return 0.0;
        }

        let mut image_area = 0.0;

        for object in page.objects().iter() {
            if object.object_type() == PdfPageObjectType::Image {
                if let Ok(bounds) = object.bounds() {
                    let w = (bounds.right().value - bounds.left().value).abs() as f64;
                    let h = (bounds.top().value - bounds.bottom().value).abs() as f64;
                    image_area += w * h;
                }
            }
        }

        (image_area / page_area).min(1.0)
    }

    /// Render an entire page as a PNG image at the given DPI.
    ///
    /// Returns (base64_string, raw_png_bytes).
    pub fn render_page_as_image(page: &PdfPage, dpi: u32) -> CoreResult<(String, Vec<u8>)> {
        let scale = dpi as f32 / 72.0;
        let width = (page.width().value * scale) as i32;
        let height = (page.height().value * scale) as i32;

        let config = PdfRenderConfig::new()
            .set_target_width(width)
            .set_target_height(height);

        let bitmap = page
            .render_with_config(&config)
            .map_err(|e| CoreError::Image(format!("Failed to render page: {e}")))?;

        let img: DynamicImage = bitmap.as_image();

        let mut png_bytes = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut png_bytes);
        img.write_to(&mut cursor, image::ImageFormat::Png)
            .map_err(|e| CoreError::Image(format!("Failed to encode PNG: {e}")))?;

        let b64 = base64::engine::general_purpose::STANDARD.encode(&png_bytes);

        Ok((b64, png_bytes))
    }

    /// Extract text content from a page.
    pub fn extract_page_text(page: &PdfPage) -> String {
        page.text()
            .map(|t| t.all())
            .unwrap_or_default()
            .trim()
            .to_string()
    }

    /// Extract individual images from a page, filtering by minimum size.
    pub fn extract_page_images(
        page: &PdfPage,
        min_size: u32,
    ) -> CoreResult<Vec<ExtractedImage>> {
        let mut images = Vec::new();
        let mut idx: u32 = 0;

        for object in page.objects().iter() {
            if object.object_type() != PdfPageObjectType::Image {
                continue;
            }

            let Some(image_object) = object.as_image_object() else {
                continue;
            };

            let raw_image: DynamicImage = match image_object.get_raw_image() {
                Ok(img) => img,
                Err(_) => continue,
            };

            let w = raw_image.width();
            let h = raw_image.height();

            if w < min_size || h < min_size {
                continue;
            }

            idx += 1;

            let mut png_bytes = Vec::new();
            let mut cursor = std::io::Cursor::new(&mut png_bytes);
            if raw_image
                .write_to(&mut cursor, image::ImageFormat::Png)
                .is_err()
            {
                continue;
            }

            let b64 = base64::engine::general_purpose::STANDARD.encode(&png_bytes);

            images.push(ExtractedImage {
                bytes: png_bytes,
                base64: b64,
                width: w,
                height: h,
                index: idx,
            });
        }

        Ok(images)
    }
}

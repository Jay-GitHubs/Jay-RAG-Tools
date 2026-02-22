use anyhow::Result;
use clap::{Parser, Subcommand};
use indicatif::{ProgressBar, ProgressStyle};
use jay_rag_core::config::{Language, ProcessingConfig, Quality};
use jay_rag_core::progress::ProgressReporter;
use jay_rag_core::provider;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;

/// JAY-RAG-TOOLS — Thai-first PDF Vision Processor for RAG pipelines
#[derive(Parser)]
#[command(name = "jay-rag", version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Process PDF files with Vision LLM
    Process(ProcessArgs),
    /// Start the web dashboard API server
    Serve(ServeArgs),
}

#[derive(Parser)]
struct ProcessArgs {
    /// Path to PDF file or folder containing PDFs
    #[arg(short, long)]
    input: PathBuf,

    /// Output directory
    #[arg(short, long, default_value = "./output")]
    output: PathBuf,

    /// Vision LLM provider
    #[arg(short, long, default_value = "ollama", value_parser = ["ollama", "openai", "claude", "gemini", "xai", "groq"])]
    provider: String,

    /// Model name (default: provider-specific)
    #[arg(short, long)]
    model: Option<String>,

    /// Document language for prompts
    #[arg(short, long, default_value = "th", value_parser = ["th", "en"])]
    lang: String,

    /// Start page number (0-indexed)
    #[arg(long, default_value = "0")]
    start_page: u32,

    /// End page number (exclusive)
    #[arg(long)]
    end_page: Option<u32>,

    /// Skip provider availability check
    #[arg(long)]
    skip_check: bool,

    /// Disable table extraction (enabled by default)
    #[arg(long)]
    no_tables: bool,

    /// Text-only mode: extract text only, skip all images and Vision LLM calls
    #[arg(long)]
    text_only: bool,

    /// Max pages processed concurrently (default: 4)
    #[arg(long, default_value = "4")]
    concurrency: usize,

    /// Disable trash detection
    #[arg(long)]
    no_detect_trash: bool,

    /// Processing quality: "standard" (pdfium text + LLM for images) or "high" (every page → Vision LLM OCR)
    #[arg(long, default_value = "standard", value_parser = ["standard", "high"])]
    quality: String,

    /// Auto-strip detected trash pages from output (creates _cleaned.md).
    /// Optionally filter by type: toc,boilerplate,blank
    #[arg(long, value_name = "TYPES")]
    strip_trash: Option<Option<String>>,
}

#[derive(Parser)]
struct ServeArgs {
    /// Bind address
    #[arg(long, default_value = "0.0.0.0:3000")]
    bind: String,

    /// Output directory for processed files
    #[arg(short, long, default_value = "./output")]
    output: PathBuf,
}

/// CLI progress reporter using indicatif progress bars.
struct CliProgressReporter {
    bar: ProgressBar,
    images: AtomicU32,
}

impl CliProgressReporter {
    fn new() -> Self {
        let bar = ProgressBar::new(0);
        bar.set_style(
            ProgressStyle::with_template(
                "{spinner:.green} [{bar:40.cyan/blue}] {pos}/{len} pages ({msg})",
            )
            .unwrap()
            .progress_chars("█▉▊▋▌▍▎▏ "),
        );
        Self {
            bar,
            images: AtomicU32::new(0),
        }
    }
}

impl ProgressReporter for CliProgressReporter {
    fn on_pdf_start(&self, filename: &str, total_pages: u32) {
        self.bar.set_length(total_pages as u64);
        self.bar.set_position(0);
        self.bar.set_message(filename.to_string());
        self.images.store(0, Ordering::Relaxed);
    }

    fn on_page_start(&self, _page_num: u32, _total_pages: u32) {}

    fn on_page_complete(&self, page_num: u32, _total_pages: u32) {
        self.bar.set_position(page_num as u64);
    }

    fn on_image_processed(&self, _page_num: u32, _image_index: u32, _desc: &str) {
        self.images.fetch_add(1, Ordering::Relaxed);
    }

    fn on_pdf_complete(&self, filename: &str, total_images: u32) {
        self.bar.finish_with_message(format!(
            "{filename} — {total_images} images"
        ));
    }

    fn on_error(&self, page_num: u32, error: &str) {
        self.bar.println(format!("  Error on page {page_num}: {error}"));
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Process(args) => run_process(args).await?,
        Commands::Serve(args) => run_serve(args).await?,
    }

    Ok(())
}

async fn run_process(args: ProcessArgs) -> Result<()> {
    let lang: Language = args.lang.parse().unwrap_or_default();
    let quality: Quality = args.quality.parse().unwrap_or_default();

    let config = ProcessingConfig {
        language: lang,
        table_extraction: !args.no_tables && !args.text_only,
        text_only: args.text_only,
        max_concurrent_pages: args.concurrency,
        detect_trash: !args.no_detect_trash,
        quality,
        ..Default::default()
    };

    // Print cost warning for high quality mode
    if quality == Quality::High && !args.text_only {
        println!();
        println!("=== HIGH QUALITY MODE ===");
        println!("  Every page → Vision LLM as 300 DPI image.");
        println!("  Best Thai accuracy. Uses ~2-5x more tokens.");
        println!("========================");
    }

    // Create provider (skip when text_only)
    let vision_provider: Option<Arc<dyn jay_rag_core::VisionProvider>> = if args.text_only {
        println!("\nText-only mode: skipping Vision LLM (no images, no API calls)");
        None
    } else {
        let model = args
            .model
            .unwrap_or_else(|| provider::default_model(&args.provider).to_string());

        let p = provider::create_provider(&args.provider, &model)?;

        if !args.skip_check {
            println!("\nChecking provider: {} / {}", args.provider, model);
            p.check().await?;
        }

        Some(Arc::from(p))
    };

    // Create output directory
    tokio::fs::create_dir_all(&args.output).await?;

    // Collect PDFs
    let pdfs: Vec<PathBuf> = if args.input.is_file() {
        vec![args.input.clone()]
    } else if args.input.is_dir() {
        let mut entries = tokio::fs::read_dir(&args.input).await?;
        let mut files = Vec::new();
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if path.extension().is_some_and(|e| e == "pdf") {
                files.push(path);
            }
        }
        files.sort();
        println!("Found {} PDF(s) in {}", files.len(), args.input.display());
        files
    } else {
        anyhow::bail!("Input not found: {}", args.input.display());
    };

    if pdfs.is_empty() {
        anyhow::bail!("No PDF files found.");
    }

    let reporter: Arc<dyn ProgressReporter> = Arc::new(CliProgressReporter::new());
    let mut results = Vec::new();

    for pdf_path in &pdfs {
        let result = jay_rag_core::process_pdf(
            pdf_path,
            &args.output,
            vision_provider.clone(),
            &config,
            reporter.clone(),
            if args.start_page > 0 {
                Some(args.start_page)
            } else {
                None
            },
            args.end_page,
        )
        .await?;
        results.push(result);
    }

    // Trash detection summary + auto-strip
    for result in &results {
        if result.trash_count > 0 {
            if let Some(trash_path) = &result.trash_path {
                let trash_json = tokio::fs::read_to_string(trash_path).await?;
                let trash_items: Vec<jay_rag_core::TrashDetection> =
                    serde_json::from_str(&trash_json)?;

                println!("\nTrash detected: {} item(s)", trash_items.len());
                for item in &trash_items {
                    if item.page == 0 {
                        println!("  (doc)    {:<22} ({:.2})", item.trash_type, item.confidence);
                    } else {
                        println!(
                            "  Page {:<3} {:<22} ({:.2})",
                            item.page, item.trash_type, item.confidence
                        );
                    }
                }

                // Auto-strip if --strip-trash provided
                if args.strip_trash.is_some() {
                    let type_filter = args.strip_trash.as_ref().unwrap();
                    let pages_to_remove: Vec<u32> = trash_items
                        .iter()
                        .filter(|t| {
                            t.page > 0 && match_trash_filter(t, type_filter.as_deref())
                        })
                        .map(|t| t.page)
                        .collect();

                    if pages_to_remove.is_empty() {
                        println!("  No removable pages match the filter.");
                    } else {
                        let (cleaned_path, _) = jay_rag_core::clean_markdown(
                            &result.markdown_path,
                            &pages_to_remove,
                        )
                        .await?;
                        println!(
                            "  Stripped {} page(s) -> {}",
                            pages_to_remove.len(),
                            cleaned_path.display()
                        );
                    }
                } else {
                    println!("  Tip: Use --strip-trash to auto-remove");
                }
            }
        }
    }

    println!("\n{}", "=".repeat(60));
    println!("Done! {} file(s) processed.", results.len());
    println!("Output: {}", args.output.canonicalize()?.display());

    if !args.text_only {
        println!();
        println!("Flowise Next Steps:");
        println!("  1. Load .md files using Text File Loader in Document Store");
        println!("  2. Serve output/images/ as static HTTP");
        println!("     e.g. jay-rag serve --output {}", args.output.display());
        println!("  3. Add to System Prompt:");
        println!(
            "     \"เมื่อพบ [IMAGE:x.png] ให้แสดงเป็น <img src='http://localhost:3000/images/.../x.png' />\""
        );
    }

    println!("{}\n", "=".repeat(60));

    Ok(())
}

/// Check if a trash item matches the optional type filter string.
/// Filter is comma-separated: "toc,boilerplate,blank,header_footer".
/// If no filter, all types match.
fn match_trash_filter(
    item: &jay_rag_core::TrashDetection,
    filter: Option<&str>,
) -> bool {
    let Some(filter) = filter else {
        return true;
    };

    let types: Vec<&str> = filter.split(',').map(|s| s.trim()).collect();
    types.iter().any(|t| match *t {
        "toc" => item.trash_type == jay_rag_core::TrashType::TableOfContents,
        "boilerplate" => item.trash_type == jay_rag_core::TrashType::Boilerplate,
        "blank" => item.trash_type == jay_rag_core::TrashType::BlankPage,
        "header_footer" => item.trash_type == jay_rag_core::TrashType::HeaderFooter,
        _ => false,
    })
}

async fn run_serve(args: ServeArgs) -> Result<()> {
    tokio::fs::create_dir_all(&args.output).await?;

    let upload_dir = args.output.join(".uploads");
    tokio::fs::create_dir_all(&upload_dir).await?;

    let state = jay_rag_server::AppState::new(upload_dir, args.output.clone());
    let app = jay_rag_server::create_app(state);

    let listener = tokio::net::TcpListener::bind(&args.bind).await?;
    println!("\n{}", "=".repeat(60));
    println!("JAY-RAG-TOOLS v2.0 — Web Dashboard");
    println!("  API:       http://{}", args.bind);
    println!("  Dashboard: http://{}", args.bind);
    println!("  Output:    {}", args.output.display());
    println!("{}\n", "=".repeat(60));

    axum::serve(listener, app).await?;
    Ok(())
}

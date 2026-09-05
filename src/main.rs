use clap::error::ErrorKind;
use clap::{Args, Parser, Subcommand, ValueEnum};
use raw_fit_check::{CheckOptions, Registry, Verdict, collect_raw_files, load_registry, run_check};
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Parser)]
#[command(
    name = "raw-fit-check",
    version,
    about = "Preflight real camera RAW files before you change editors or machines",
    long_about = "RAW Fit Check reads local RAW container metadata, extracts and benchmarks embedded JPEG previews, then checks an evidence-backed compatibility registry. Files never leave this computer; sensor data is not developed."
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Inspect one or more RAW files or folders
    Check(CheckArgs),
    /// Show the built-in evidence-backed compatibility claims
    Registry(RegistryArgs),
    /// Run the bundled sample in a temporary folder
    Demo(DemoArgs),
}

#[derive(Clone, Copy, Debug, ValueEnum)]
enum Platform {
    Linux,
    Windows,
    Macos,
}

impl Platform {
    fn as_str(self) -> &'static str {
        match self {
            Self::Linux => "linux",
            Self::Windows => "windows",
            Self::Macos => "macos",
        }
    }
}

#[derive(Args)]
struct CheckArgs {
    /// RAW files or folders to inspect recursively
    #[arg(required = true)]
    paths: Vec<PathBuf>,
    /// Editor slug, for example darktable or apple-photos
    #[arg(long, requires = "editor_version")]
    editor: Option<String>,
    /// Installed editor version (for apple-photos, use the macOS version)
    #[arg(long, requires = "editor", value_parser = validate_version)]
    editor_version: Option<String>,
    /// Override detected platform: linux, windows, or macos
    #[arg(long, value_enum)]
    platform: Option<Platform>,
    /// Use a reviewed custom registry JSON file
    #[arg(long)]
    registry: Option<PathBuf>,
    /// Write extracted JPEG previews to this folder (never overwrites)
    #[arg(long)]
    preview_dir: Option<PathBuf>,
    /// Number of local JPEG decode benchmark runs
    #[arg(long, default_value_t = 3, value_parser = clap::value_parser!(u32).range(1..=25))]
    benchmark_runs: u32,
    /// Emit stable JSON to stdout
    #[arg(long)]
    json: bool,
    /// Disable decorative terminal styling; no prompts are ever shown
    #[arg(long)]
    ci: bool,
}

#[derive(Args)]
struct RegistryArgs {
    /// Read claims from a custom registry file
    #[arg(long)]
    registry: Option<PathBuf>,
    /// Emit the registry as JSON
    #[arg(long)]
    json: bool,
}

#[derive(Args)]
struct DemoArgs {
    /// Emit the demonstration report as JSON
    #[arg(long)]
    json: bool,
}

#[derive(Serialize)]
struct DemoReport {
    demo_directory: String,
    sample_file: String,
    report: raw_fit_check::CheckReport,
}

fn validate_version(value: &str) -> Result<String, String> {
    raw_fit_check::parse_version(value).map(|_| value.to_owned())
}

fn main() -> ExitCode {
    let cli = match Cli::try_parse() {
        Ok(cli) => cli,
        Err(error) => {
            let code = match error.kind() {
                ErrorKind::DisplayHelp | ErrorKind::DisplayVersion => 0,
                _ => 1,
            };
            let _ = error.print();
            return ExitCode::from(code);
        }
    };
    match execute(cli) {
        Ok(code) => ExitCode::from(code as u8),
        Err(message) => {
            eprintln!("error: {message}");
            ExitCode::from(1)
        }
    }
}

fn execute(cli: Cli) -> Result<i32, String> {
    match cli.command {
        Command::Registry(args) => {
            let registry = load_registry(args.registry.as_deref())?;
            print_registry(&registry, args.json)?;
            Ok(0)
        }
        Command::Check(args) => {
            let files = collect_raw_files(&args.paths)?;
            let registry = load_registry(args.registry.as_deref())?;
            let platform = args
                .platform
                .map(Platform::as_str)
                .unwrap_or(normalize_platform(std::env::consts::OS)?);
            let report = run_check(
                &files,
                &registry,
                &CheckOptions {
                    editor: args.editor.as_deref(),
                    editor_version: args.editor_version.as_deref(),
                    platform,
                    preview_dir: args.preview_dir.as_deref(),
                    benchmark_runs: args.benchmark_runs,
                },
            );
            if args.json {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&report).map_err(|e| e.to_string())?
                );
            } else {
                print_human(&report, args.ci);
            }
            Ok(report.overall.exit_code())
        }
        Command::Demo(args) => run_demo(args),
    }
}

fn normalize_platform(platform: &str) -> Result<&'static str, String> {
    match platform {
        "linux" => Ok("linux"),
        "windows" => Ok("windows"),
        "macos" | "darwin" => Ok("macos"),
        _ => Err(format!(
            "unsupported host platform {platform}; use --platform linux, windows, or macos"
        )),
    }
}

fn run_demo(args: DemoArgs) -> Result<i32, String> {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis();
    let directory =
        std::env::temp_dir().join(format!("raw-fit-check-demo-{}-{nonce}", std::process::id()));
    fs::create_dir_all(&directory).map_err(|error| {
        format!(
            "could not create demo folder {}: {error}",
            directory.display()
        )
    })?;
    let sample = directory.join("sony-ilce-6700-sample.ARW");
    fs::write(
        &sample,
        include_bytes!("../examples/sony-ilce-6700-sample.ARW"),
    )
    .map_err(|error| format!("could not write bundled demo sample: {error}"))?;
    let registry = load_registry(None)?;
    let platform = normalize_platform(std::env::consts::OS)?;
    let files = collect_raw_files(std::slice::from_ref(&sample))?;
    let report = run_check(
        &files,
        &registry,
        &CheckOptions {
            editor: Some("darktable"),
            editor_version: Some("4.6.0"),
            platform,
            preview_dir: Some(&directory),
            benchmark_runs: 3,
        },
    );
    if args.json {
        println!(
            "{}",
            serde_json::to_string_pretty(&DemoReport {
                demo_directory: directory.display().to_string(),
                sample_file: sample.display().to_string(),
                report: report.clone(),
            })
            .map_err(|error| error.to_string())?
        );
    } else {
        println!("DEMO OUTPUT: {}", directory.display());
        println!("The bundled sample is copied here; your own files are not read.");
        print_human(&report, true);
    }
    Ok(report.overall.exit_code())
}

fn print_registry(registry: &Registry, json: bool) -> Result<(), String> {
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(registry).map_err(|e| e.to_string())?
        );
        return Ok(());
    }
    println!(
        "RAW FIT CHECK REGISTRY {} · updated {}\n",
        registry.registry_version, registry.updated
    );
    for rule in &registry.rules {
        let range = match (&rule.min_version, &rule.max_version) {
            (Some(a), Some(b)) => format!("{a}–{b}"),
            (Some(a), None) => format!(">={a}"),
            (None, Some(b)) => format!("<={b}"),
            _ => "any".into(),
        };
        println!(
            "{}  {}\n  {} {} · {} · {}\n  Evidence: {}\n  {}\n",
            rule.id,
            rule.outcome,
            rule.editor,
            range,
            rule.camera_model,
            rule.platforms.join(", "),
            rule.evidence.url,
            rule.note
        );
    }
    Ok(())
}

fn print_human(report: &raw_fit_check::CheckReport, _ci: bool) {
    println!("RAW FIT CHECK 0.1 · registry {}", report.registry_version);
    println!(
        "MACHINE {} / {}{}\n",
        report.machine.os,
        report.machine.arch,
        report
            .editor
            .as_ref()
            .map(|e| format!(" · {e} {}", report.editor_version.as_deref().unwrap_or("?")))
            .unwrap_or_default()
    );
    for file in &report.files {
        let symbol = match file.verdict {
            Verdict::Usable => "[PASS]",
            Verdict::PreviewOnly => "[VIEW]",
            Verdict::Unsupported => "[STOP]",
        };
        println!("{symbol} {} — {}", file.path, file.verdict);
        println!(
            "  Camera: {} {} · {}",
            file.camera_make.as_deref().unwrap_or("unknown"),
            file.camera_model.as_deref().unwrap_or("model"),
            file.container
        );
        if let Some(preview) = &file.preview {
            println!(
                "  Preview: {}×{} · {:.2} MP · {:.1} ms decode · {}",
                preview.width,
                preview.height,
                preview.megapixels,
                preview.average_decode_ms,
                preview.extracted_to.as_deref().unwrap_or("not extracted")
            );
        }
        println!("  Why: {}", file.reason);
        if let Some(url) = &file.evidence_url {
            println!("  Evidence: {url}");
        }
        for warning in &file.warnings {
            println!("  Warning: {warning}");
        }
        println!();
    }
    println!("OVERALL: {}", report.overall);
    match report.overall {
        Verdict::Usable => println!(
            "Next: import this small sample and verify one edit + export before moving the full shoot."
        ),
        Verdict::PreviewOnly => println!(
            "Next: update the registry/editor choice or test a full RAW decode before importing the shoot."
        ),
        Verdict::Unsupported => println!(
            "Next: try another representative file or a supported editor; do not commit the shoot yet."
        ),
    }
}

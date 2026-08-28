//! Core inspection and compatibility logic for RAW Fit Check.
//!
//! The library deliberately reads only container metadata and embedded JPEG
//! previews. It does not interpret proprietary sensor data.

use jpeg_decoder::Decoder;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::time::Instant;

pub const BUILTIN_REGISTRY: &str = include_str!("../registry/compatibility.json");
pub const RAW_EXTENSIONS: &[&str] = &[
    "3fr", "arw", "cr2", "cr3", "dng", "erf", "fff", "iiq", "kdc", "mef", "mos", "mrw", "nef",
    "nrw", "orf", "pef", "raf", "raw", "rw2", "rwl", "srw", "x3f",
];

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Registry {
    pub schema_version: u32,
    pub registry_version: String,
    pub updated: String,
    pub rules: Vec<Rule>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Rule {
    pub id: String,
    pub camera_make: String,
    pub camera_model: String,
    pub extensions: Vec<String>,
    pub editor: String,
    pub min_version: Option<String>,
    pub max_version: Option<String>,
    pub platforms: Vec<String>,
    pub outcome: Verdict,
    pub note: String,
    pub evidence: Evidence,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Evidence {
    pub title: String,
    pub url: String,
    pub accessed: String,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum Verdict {
    Usable,
    PreviewOnly,
    Unsupported,
}

impl Verdict {
    pub fn exit_code(self) -> i32 {
        match self {
            Self::Usable => 0,
            Self::PreviewOnly => 2,
            Self::Unsupported => 3,
        }
    }
}

impl std::fmt::Display for Verdict {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let value = match self {
            Self::Usable => "usable",
            Self::PreviewOnly => "preview-only",
            Self::Unsupported => "unsupported",
        };
        formatter.write_str(value)
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct PreviewReport {
    pub offset: usize,
    pub bytes: usize,
    pub width: u16,
    pub height: u16,
    pub megapixels: f32,
    pub average_decode_ms: f64,
    pub benchmark_runs: u32,
    pub extracted_to: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FileReport {
    pub path: String,
    pub bytes: u64,
    pub extension: String,
    pub container: String,
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub software: Option<String>,
    pub compression_tag: Option<u32>,
    pub dng_version: Option<String>,
    pub preview: Option<PreviewReport>,
    pub verdict: Verdict,
    pub reason: String,
    pub matched_rule: Option<String>,
    pub evidence_url: Option<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MachineReport {
    pub os: String,
    pub arch: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CheckReport {
    pub report_version: u32,
    pub tool_version: String,
    pub registry_version: String,
    pub machine: MachineReport,
    pub editor: Option<String>,
    pub editor_version: Option<String>,
    pub files: Vec<FileReport>,
    pub overall: Verdict,
}

#[derive(Debug, Clone)]
pub struct CheckOptions<'a> {
    pub editor: Option<&'a str>,
    pub editor_version: Option<&'a str>,
    pub platform: &'a str,
    pub preview_dir: Option<&'a Path>,
    pub benchmark_runs: u32,
}

#[derive(Default, Debug)]
struct Metadata {
    make: Option<String>,
    model: Option<String>,
    software: Option<String>,
    compression: Option<u32>,
    dng_version: Option<String>,
    container: String,
}

pub fn load_registry(path: Option<&Path>) -> Result<Registry, String> {
    let text = match path {
        Some(path) => fs::read_to_string(path)
            .map_err(|e| format!("could not read registry {}: {e}", path.display()))?,
        None => BUILTIN_REGISTRY.to_owned(),
    };
    let registry: Registry =
        serde_json::from_str(&text).map_err(|e| format!("invalid compatibility registry: {e}"))?;
    if registry.schema_version != 1 {
        return Err(format!(
            "unsupported registry schema {}; expected 1",
            registry.schema_version
        ));
    }
    if registry
        .rules
        .iter()
        .any(|r| r.evidence.url.trim().is_empty() || r.evidence.accessed.trim().is_empty())
    {
        return Err("every registry rule must have an evidence URL and access date".into());
    }
    Ok(registry)
}

pub fn collect_raw_files(paths: &[PathBuf]) -> Result<Vec<PathBuf>, String> {
    let mut output = Vec::new();
    let mut seen = HashSet::new();
    for path in paths {
        collect_one(path, &mut output, &mut seen)?;
    }
    output.sort();
    if output.is_empty() {
        return Err("no supported RAW files found; try a .NEF, .ARW, .CR2, .CR3, .DNG, .ORF, .RAF, .RW2, .PEF, or .SRW sample".into());
    }
    Ok(output)
}

fn collect_one(
    path: &Path,
    output: &mut Vec<PathBuf>,
    seen: &mut HashSet<PathBuf>,
) -> Result<(), String> {
    if !path.exists() {
        return Err(format!("input does not exist: {}", path.display()));
    }
    if path.is_dir() {
        if fs::symlink_metadata(path)
            .map(|metadata| metadata.file_type().is_symlink())
            .unwrap_or(false)
        {
            return Ok(());
        }
        for entry in
            fs::read_dir(path).map_err(|e| format!("could not read {}: {e}", path.display()))?
        {
            let entry = entry.map_err(|e| format!("could not read directory entry: {e}"))?;
            let child = entry.path();
            if child.is_dir() {
                collect_one(&child, output, seen)?;
            } else if is_raw_path(&child) && seen.insert(child.clone()) {
                output.push(child);
            }
        }
    } else if is_raw_path(path) && seen.insert(path.to_path_buf()) {
        output.push(path.to_path_buf());
    }
    Ok(())
}

pub fn is_raw_path(path: &Path) -> bool {
    path.extension()
        .and_then(|v| v.to_str())
        .map(|v| RAW_EXTENSIONS.contains(&v.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

pub fn run_check(
    files: &[PathBuf],
    registry: &Registry,
    options: &CheckOptions<'_>,
) -> CheckReport {
    if let Some(dir) = options.preview_dir {
        let _ = fs::create_dir_all(dir);
    }
    let reports: Vec<_> = files
        .iter()
        .map(|p| inspect_file(p, registry, options))
        .collect();
    let overall = reports
        .iter()
        .map(|r| r.verdict)
        .max_by_key(|v| v.exit_code())
        .unwrap_or(Verdict::Unsupported);
    CheckReport {
        report_version: 1,
        tool_version: env!("CARGO_PKG_VERSION").into(),
        registry_version: registry.registry_version.clone(),
        machine: MachineReport {
            os: options.platform.into(),
            arch: std::env::consts::ARCH.into(),
        },
        editor: options.editor.map(str::to_owned),
        editor_version: options.editor_version.map(str::to_owned),
        files: reports,
        overall,
    }
}

fn inspect_file(path: &Path, registry: &Registry, options: &CheckOptions<'_>) -> FileReport {
    let extension = path
        .extension()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let file_size = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    let mut warnings = Vec::new();
    let data = match fs::read(path) {
        Ok(data) => data,
        Err(error) => {
            return failed_report(
                path,
                file_size,
                extension,
                format!("file could not be read: {error}"),
            );
        }
    };
    let metadata = parse_metadata(&data, &extension);
    if metadata.make.is_none() || metadata.model.is_none() {
        warnings.push("Camera make/model was not found in the TIFF header.".into());
    }
    let preview = find_best_jpeg(&data).and_then(|candidate| {
        let jpeg = &data[candidate.start..candidate.end];
        match benchmark_jpeg(jpeg, options.benchmark_runs.max(1)) {
            Ok(ms) => {
                let extracted_to = options.preview_dir.and_then(|dir| {
                    let stem = path.file_stem()?.to_string_lossy();
                    let destination = unique_preview_path(dir, &stem);
                    match fs::write(&destination, jpeg) {
                        Ok(_) => Some(destination.display().to_string()),
                        Err(e) => {
                            warnings.push(format!("Preview found but could not be written: {e}"));
                            None
                        }
                    }
                });
                Some(PreviewReport {
                    offset: candidate.start,
                    bytes: jpeg.len(),
                    width: candidate.width,
                    height: candidate.height,
                    megapixels: (candidate.width as f32 * candidate.height as f32) / 1_000_000.0,
                    average_decode_ms: ms,
                    benchmark_runs: options.benchmark_runs.max(1),
                    extracted_to,
                })
            }
            Err(e) => {
                warnings.push(format!("Embedded JPEG was found but did not decode: {e}"));
                None
            }
        }
    });
    let matching = options.editor.and_then(|editor| {
        registry.rules.iter().find(|rule| {
            rule_matches(
                rule,
                &metadata,
                &extension,
                editor,
                options.editor_version,
                options.platform,
            )
        })
    });
    let (verdict, reason) = match (preview.as_ref(), options.editor, matching) {
        (None, _, _) => (Verdict::Unsupported, "No decodable embedded JPEG preview was found, so this machine cannot prove a viewing path.".into()),
        (Some(_), None, _) => (Verdict::PreviewOnly, "The embedded JPEG decodes locally; choose an editor and version to test full RAW support.".into()),
        (Some(_), Some(_), Some(rule)) if rule.outcome == Verdict::Usable => (Verdict::Usable, format!("Embedded preview decodes and registry rule {} supports this editor combination.", rule.id)),
        (Some(_), Some(_), Some(rule)) if rule.outcome == Verdict::Unsupported => (Verdict::Unsupported, rule.note.clone()),
        (Some(_), Some(editor), None) => (Verdict::PreviewOnly, format!("The embedded JPEG decodes, but the registry has no exact camera/version/platform claim for {editor}.")),
        (Some(_), Some(_), Some(rule)) => (Verdict::PreviewOnly, rule.note.clone()),
    };
    FileReport {
        path: path.display().to_string(),
        bytes: file_size,
        extension,
        container: metadata.container,
        camera_make: metadata.make,
        camera_model: metadata.model,
        software: metadata.software,
        compression_tag: metadata.compression,
        dng_version: metadata.dng_version,
        preview,
        verdict,
        reason,
        matched_rule: matching.map(|r| r.id.clone()),
        evidence_url: matching.map(|r| r.evidence.url.clone()),
        warnings,
    }
}

fn failed_report(path: &Path, bytes: u64, extension: String, reason: String) -> FileReport {
    FileReport {
        path: path.display().to_string(),
        bytes,
        extension,
        container: "unreadable".into(),
        camera_make: None,
        camera_model: None,
        software: None,
        compression_tag: None,
        dng_version: None,
        preview: None,
        verdict: Verdict::Unsupported,
        reason,
        matched_rule: None,
        evidence_url: None,
        warnings: vec![],
    }
}

fn unique_preview_path(dir: &Path, stem: &str) -> PathBuf {
    let initial = dir.join(format!("{stem}-preview.jpg"));
    if !initial.exists() {
        return initial;
    }
    (2..10_000)
        .map(|n| dir.join(format!("{stem}-preview-{n}.jpg")))
        .find(|p| !p.exists())
        .unwrap_or(initial)
}

fn rule_matches(
    rule: &Rule,
    meta: &Metadata,
    ext: &str,
    editor: &str,
    version: Option<&str>,
    platform: &str,
) -> bool {
    if !rule.editor.eq_ignore_ascii_case(editor)
        || !rule.extensions.iter().any(|v| v.eq_ignore_ascii_case(ext))
    {
        return false;
    }
    if !rule.platforms.iter().any(|v| platform_matches(v, platform)) {
        return false;
    }
    if !field_matches(&rule.camera_make, meta.make.as_deref())
        || !field_matches(&rule.camera_model, meta.model.as_deref())
    {
        return false;
    }
    match version {
        Some(v) => {
            if rule
                .min_version
                .as_deref()
                .is_some_and(|min| compare_versions(v, min).is_lt())
            {
                return false;
            }
            if rule
                .max_version
                .as_deref()
                .is_some_and(|max| compare_versions(v, max).is_gt())
            {
                return false;
            }
            true
        }
        None => rule.min_version.is_none() && rule.max_version.is_none(),
    }
}

fn platform_matches(rule: &str, actual: &str) -> bool {
    rule == "*"
        || rule.eq_ignore_ascii_case(actual)
        || (rule.eq_ignore_ascii_case("macos") && actual.eq_ignore_ascii_case("darwin"))
}

fn field_matches(expected: &str, actual: Option<&str>) -> bool {
    expected == "*" || actual.is_some_and(|v| v.trim().eq_ignore_ascii_case(expected.trim()))
}

fn compare_versions(a: &str, b: &str) -> std::cmp::Ordering {
    let nums = |v: &str| {
        v.split(|c: char| !c.is_ascii_digit())
            .filter(|s| !s.is_empty())
            .take(4)
            .map(|s| s.parse::<u64>().unwrap_or(0))
            .collect::<Vec<_>>()
    };
    let (mut av, mut bv) = (nums(a), nums(b));
    av.resize(4, 0);
    bv.resize(4, 0);
    av.cmp(&bv)
}

#[derive(Debug)]
struct JpegCandidate {
    start: usize,
    end: usize,
    width: u16,
    height: u16,
}

fn find_best_jpeg(data: &[u8]) -> Option<JpegCandidate> {
    let mut found = Vec::new();
    let mut i = 0;
    while i + 3 < data.len() {
        if data[i] == 0xff
            && data[i + 1] == 0xd8
            && let Some(relative_end) = data[i + 2..].windows(2).position(|w| w == [0xff, 0xd9])
        {
            let end = i + 2 + relative_end + 2;
            if let Some((width, height)) = jpeg_dimensions(&data[i..end]) {
                found.push(JpegCandidate {
                    start: i,
                    end,
                    width,
                    height,
                });
            }
            i = end;
            continue;
        }
        i += 1;
    }
    found
        .into_iter()
        .max_by_key(|v| (v.width as u32 * v.height as u32, v.end - v.start))
}

fn jpeg_dimensions(data: &[u8]) -> Option<(u16, u16)> {
    let mut i = 2;
    while i + 8 < data.len() {
        if data[i] != 0xff {
            i += 1;
            continue;
        }
        let marker = data[i + 1];
        i += 2;
        if marker == 0xd8 || marker == 0xd9 || (0xd0..=0xd7).contains(&marker) {
            continue;
        }
        if i + 2 > data.len() {
            return None;
        }
        let len = u16::from_be_bytes([data[i], data[i + 1]]) as usize;
        if len < 2 || i + len > data.len() {
            return None;
        }
        if matches!(marker, 0xc0..=0xc3 | 0xc5..=0xc7 | 0xc9..=0xcb | 0xcd..=0xcf) && len >= 7 {
            return Some((
                u16::from_be_bytes([data[i + 5], data[i + 6]]),
                u16::from_be_bytes([data[i + 3], data[i + 4]]),
            ));
        }
        i += len;
    }
    None
}

fn benchmark_jpeg(data: &[u8], runs: u32) -> Result<f64, String> {
    let start = Instant::now();
    for _ in 0..runs {
        Decoder::new(Cursor::new(data))
            .decode()
            .map_err(|e| e.to_string())?;
    }
    Ok(start.elapsed().as_secs_f64() * 1000.0 / runs as f64)
}

fn parse_metadata(data: &[u8], extension: &str) -> Metadata {
    let mut result = Metadata {
        container: container_name(data, extension),
        ..Default::default()
    };
    if data.len() < 8 {
        return result;
    }
    let little = match &data[0..2] {
        b"II" => true,
        b"MM" => false,
        _ => return result,
    };
    if read_u16(data, 2, little) != Some(42) {
        return result;
    }
    let first = read_u32(data, 4, little).unwrap_or(0) as usize;
    let mut visited = HashSet::new();
    parse_ifd(data, first, little, &mut result, &mut visited, 0);
    result
}

fn container_name(data: &[u8], ext: &str) -> String {
    if data.len() >= 12 && &data[4..8] == b"ftyp" {
        format!("ISO BMFF ({})", String::from_utf8_lossy(&data[8..12]))
    } else if data.starts_with(b"II* ") || data.starts_with(b"MM\0*") {
        if ext == "dng" {
            "TIFF/DNG".into()
        } else {
            "TIFF-based RAW".into()
        }
    } else {
        "unknown".into()
    }
}

fn parse_ifd(
    data: &[u8],
    offset: usize,
    little: bool,
    out: &mut Metadata,
    visited: &mut HashSet<usize>,
    depth: u8,
) {
    if depth > 5 || !visited.insert(offset) {
        return;
    }
    let count = match read_u16(data, offset, little) {
        Some(v) => v as usize,
        None => return,
    };
    if count > 4096 {
        return;
    }
    for n in 0..count {
        let entry = offset
            .saturating_add(2)
            .saturating_add(n.saturating_mul(12));
        if entry + 12 > data.len() {
            break;
        }
        let tag = read_u16(data, entry, little).unwrap_or(0);
        let kind = read_u16(data, entry + 2, little).unwrap_or(0);
        let len = read_u32(data, entry + 4, little).unwrap_or(0) as usize;
        match tag {
            271 => {
                out.make =
                    read_ifd_ascii(data, entry, kind, len, little).or_else(|| out.make.take())
            }
            272 => {
                out.model =
                    read_ifd_ascii(data, entry, kind, len, little).or_else(|| out.model.take())
            }
            305 => {
                out.software =
                    read_ifd_ascii(data, entry, kind, len, little).or_else(|| out.software.take())
            }
            259 => {
                out.compression =
                    read_ifd_number(data, entry, kind, len, little).or(out.compression)
            }
            50706 => {
                if let Some(bytes) = read_ifd_bytes(data, entry, kind, len, little) {
                    out.dng_version = Some(
                        bytes
                            .iter()
                            .map(u8::to_string)
                            .collect::<Vec<_>>()
                            .join("."),
                    );
                }
            }
            330 | 34665 => {
                if let Some(next) = read_ifd_number(data, entry, kind, len, little) {
                    parse_ifd(data, next as usize, little, out, visited, depth + 1);
                }
            }
            _ => {}
        }
    }
    let next_at = offset
        .saturating_add(2)
        .saturating_add(count.saturating_mul(12));
    if let Some(next) = read_u32(data, next_at, little).filter(|v| *v > 0) {
        parse_ifd(data, next as usize, little, out, visited, depth + 1);
    }
}

fn type_size(kind: u16) -> Option<usize> {
    match kind {
        1 | 2 | 6 | 7 => Some(1),
        3 | 8 => Some(2),
        4 | 9 | 11 => Some(4),
        5 | 10 | 12 => Some(8),
        _ => None,
    }
}

fn ifd_value_slice(
    data: &[u8],
    entry: usize,
    kind: u16,
    count: usize,
    little: bool,
) -> Option<&[u8]> {
    let bytes = type_size(kind)?.checked_mul(count)?;
    let start = if bytes <= 4 {
        entry + 8
    } else {
        read_u32(data, entry + 8, little)? as usize
    };
    data.get(start..start.checked_add(bytes)?)
}

fn read_ifd_ascii(
    data: &[u8],
    entry: usize,
    kind: u16,
    count: usize,
    little: bool,
) -> Option<String> {
    if kind != 2 {
        return None;
    }
    let value = ifd_value_slice(data, entry, kind, count, little)?;
    let text = String::from_utf8_lossy(value)
        .trim_matches(char::from(0))
        .trim()
        .to_string();
    (!text.is_empty()).then_some(text)
}

fn read_ifd_bytes(
    data: &[u8],
    entry: usize,
    kind: u16,
    count: usize,
    little: bool,
) -> Option<Vec<u8>> {
    if kind != 1 && kind != 7 {
        return None;
    }
    Some(ifd_value_slice(data, entry, kind, count, little)?.to_vec())
}

fn read_ifd_number(
    data: &[u8],
    entry: usize,
    kind: u16,
    count: usize,
    little: bool,
) -> Option<u32> {
    if count == 0 {
        return None;
    }
    let value = ifd_value_slice(data, entry, kind, count, little)?;
    match kind {
        1 | 7 => value.first().copied().map(u32::from),
        3 => read_u16(value, 0, little).map(u32::from),
        4 => read_u32(value, 0, little),
        _ => None,
    }
}

fn read_u16(data: &[u8], at: usize, little: bool) -> Option<u16> {
    let b = data.get(at..at + 2)?;
    Some(if little {
        u16::from_le_bytes([b[0], b[1]])
    } else {
        u16::from_be_bytes([b[0], b[1]])
    })
}
fn read_u32(data: &[u8], at: usize, little: bool) -> Option<u32> {
    let b = data.get(at..at + 4)?;
    Some(if little {
        u32::from_le_bytes([b[0], b[1], b[2], b[3]])
    } else {
        u32::from_be_bytes([b[0], b[1], b[2], b[3]])
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use jpeg_encoder::{ColorType, Encoder};
    use std::fs;

    fn synthetic_raw() -> Vec<u8> {
        let make = b"SONY\0";
        let model = b"ILCE-6700\0";
        let ifd_offset = 8usize;
        let entries = 3usize;
        let data_offset = ifd_offset + 2 + entries * 12 + 4;
        let mut raw = vec![0u8; data_offset + make.len() + model.len()];
        raw[0..8].copy_from_slice(&[b'I', b'I', 42, 0, 8, 0, 0, 0]);
        raw[8..10].copy_from_slice(&(entries as u16).to_le_bytes());
        let write_entry =
            |buf: &mut [u8], at: usize, tag: u16, kind: u16, count: u32, value: u32| {
                buf[at..at + 2].copy_from_slice(&tag.to_le_bytes());
                buf[at + 2..at + 4].copy_from_slice(&kind.to_le_bytes());
                buf[at + 4..at + 8].copy_from_slice(&count.to_le_bytes());
                buf[at + 8..at + 12].copy_from_slice(&value.to_le_bytes());
            };
        write_entry(&mut raw, 10, 271, 2, make.len() as u32, data_offset as u32);
        write_entry(
            &mut raw,
            22,
            272,
            2,
            model.len() as u32,
            (data_offset + make.len()) as u32,
        );
        write_entry(&mut raw, 34, 259, 3, 1, 7);
        raw[data_offset..data_offset + make.len()].copy_from_slice(make);
        raw[data_offset + make.len()..].copy_from_slice(model);
        let mut jpeg = Vec::new();
        Encoder::new(&mut jpeg, 90)
            .encode(&[200, 180, 100], 1, 1, ColorType::Rgb)
            .unwrap();
        raw.extend(jpeg);
        raw
    }

    #[test]
    fn extracts_metadata_and_preview() {
        let raw = synthetic_raw();
        let meta = parse_metadata(&raw, "arw");
        assert_eq!(meta.make.as_deref(), Some("SONY"));
        assert_eq!(meta.model.as_deref(), Some("ILCE-6700"));
        let preview = find_best_jpeg(&raw).unwrap();
        assert_eq!((preview.width, preview.height), (1, 1));
        assert!(benchmark_jpeg(&raw[preview.start..preview.end], 1).is_ok());
    }

    #[test]
    fn documented_check_classifies_supported_sample() {
        let dir = std::env::temp_dir().join(format!("raw-fit-check-test-{}", std::process::id()));
        let _ = fs::create_dir_all(&dir);
        let path = dir.join("sample.ARW");
        fs::write(&path, synthetic_raw()).unwrap();
        let registry = load_registry(None).unwrap();
        let report = run_check(
            std::slice::from_ref(&path),
            &registry,
            &CheckOptions {
                editor: Some("darktable"),
                editor_version: Some("4.8.1"),
                platform: "linux",
                preview_dir: None,
                benchmark_runs: 1,
            },
        );
        assert_eq!(report.overall, Verdict::Usable);
        assert_eq!(
            report.files[0].matched_rule.as_deref(),
            Some("darktable-4.6-sony-ilce-6700")
        );
        let json = serde_json::to_string(&report).unwrap();
        assert!(json.contains("\"overall\":\"usable\""));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn unknown_editor_is_preview_only() {
        let raw = synthetic_raw();
        let dir =
            std::env::temp_dir().join(format!("raw-fit-check-unknown-{}", std::process::id()));
        let _ = fs::create_dir_all(&dir);
        let path = dir.join("sample.ARW");
        fs::write(&path, raw).unwrap();
        let registry = load_registry(None).unwrap();
        let report = run_check(
            &[path],
            &registry,
            &CheckOptions {
                editor: Some("mystery"),
                editor_version: Some("1"),
                platform: "linux",
                preview_dir: None,
                benchmark_runs: 1,
            },
        );
        assert_eq!(report.overall, Verdict::PreviewOnly);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn version_comparison_is_numeric() {
        assert!(compare_versions("4.10.0", "4.6").is_gt());
        assert!(compare_versions("4.6", "4.6.0").is_eq());
    }
}

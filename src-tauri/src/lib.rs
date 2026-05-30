use serde::Serialize;
use serde_json::Value;
use std::fs::Metadata;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager};

mod python_worker;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct InputFileInfo {
    path: String,
    name: String,
    extension: String,
    size_bytes: Option<u64>,
    kind: String,
    available: bool,
    validation_code: Option<String>,
    validation_message: Option<String>,
    signature_kind: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PreflightIssue {
    level: &'static str,
    code: String,
    message: String,
    target: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PreflightResult {
    ok: bool,
    issues: Vec<PreflightIssue>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CacheSessionInfo {
    id: String,
    path: String,
    initialized: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AlphaLicenseInfo {
    valid: bool,
    expires_on: &'static str,
    checked_at_epoch_seconds: u64,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct E2eBootstrapInfo {
    enabled: bool,
    files: Vec<String>,
    output_path: Option<String>,
    auto_export: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ToolHubSmokeReport {
    ok: bool,
    resource_dir: String,
    src_python_found: bool,
    bundled_python_found: bool,
    worker_response: Value,
}

const ALPHA_EXPIRES_ON: &str = "2026-06-30";
const ALPHA_EXPIRY_UNIX_SECONDS: u64 = 1_782_831_600; // 2026-07-01 00:00:00 JST.
const MIN_SPLASH_VISIBLE_MILLIS: u64 = 4_000;
const MAX_SPLASH_VISIBLE_MILLIS: u64 = 12_000;
const STALE_CACHE_SESSION_SECONDS: u64 = 24 * 60 * 60;

struct StartupState {
    launched_at: Instant,
    completed: AtomicBool,
    splash_cleanup_started: AtomicBool,
}

fn kind_from_extension(extension: &str) -> &'static str {
    match extension {
        "pdf" => "pdf",
        "xls" | "xlsx" | "xlsm" | "xlsb" => "excel",
        "doc" | "docx" | "docm" => "word",
        "ppt" | "pptx" | "pptm" => "powerpoint",
        _ => "unsupported",
    }
}

fn validation_issue(code: &str, message: impl Into<String>) -> (Option<String>, Option<String>) {
    (Some(code.to_string()), Some(message.into()))
}

fn is_reserved_windows_name(name: &str) -> bool {
    let stem = name
        .trim_end_matches([' ', '.'])
        .split('.')
        .next()
        .unwrap_or_default()
        .to_ascii_uppercase();
    matches!(
        stem.as_str(),
        "CON"
            | "PRN"
            | "AUX"
            | "NUL"
            | "COM1"
            | "COM2"
            | "COM3"
            | "COM4"
            | "COM5"
            | "COM6"
            | "COM7"
            | "COM8"
            | "COM9"
            | "LPT1"
            | "LPT2"
            | "LPT3"
            | "LPT4"
            | "LPT5"
            | "LPT6"
            | "LPT7"
            | "LPT8"
            | "LPT9"
    )
}

#[cfg(windows)]
fn is_cloud_placeholder(metadata: &Metadata) -> bool {
    use std::os::windows::fs::MetadataExt;

    const FILE_ATTRIBUTE_OFFLINE: u32 = 0x0000_1000;
    const FILE_ATTRIBUTE_RECALL_ON_OPEN: u32 = 0x0004_0000;
    const FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS: u32 = 0x0040_0000;
    let attributes = metadata.file_attributes();
    attributes
        & (FILE_ATTRIBUTE_OFFLINE
            | FILE_ATTRIBUTE_RECALL_ON_OPEN
            | FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS)
        != 0
}

#[cfg(not(windows))]
fn is_cloud_placeholder(_metadata: &Metadata) -> bool {
    false
}

fn detect_signature(path: &Path) -> Result<String, String> {
    let mut file = std::fs::File::open(path).map_err(|error| match error.kind() {
        std::io::ErrorKind::PermissionDenied => "ファイルを読み取る権限がありません。".to_string(),
        _ => format!("ファイルの先頭を確認できません: {error}"),
    })?;
    let mut buffer = [0_u8; 1024];
    let read = std::io::Read::read(&mut file, &mut buffer)
        .map_err(|error| format!("ファイルの先頭を読み取れません: {error}"))?;
    let bytes = &buffer[..read];
    if bytes.windows(5).any(|window| window == b"%PDF-") {
        return Ok("pdf".to_string());
    }
    if bytes.starts_with(b"PK\x03\x04")
        || bytes.starts_with(b"PK\x05\x06")
        || bytes.starts_with(b"PK\x07\x08")
    {
        return Ok("zip".to_string());
    }
    if bytes.starts_with(&[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]) {
        return Ok("ole".to_string());
    }
    Ok("unknown".to_string())
}

fn validate_input_file(
    file_path: &Path,
    name: &str,
    extension: &str,
    kind: &str,
    metadata: Option<&Metadata>,
) -> (bool, Option<String>, Option<String>, Option<String>) {
    if name.starts_with("~$") {
        let (code, message) = validation_issue(
            "temporary_office_file",
            "Office の一時ファイルは追加できません。元のファイルを選択してください。",
        );
        return (false, code, message, None);
    }
    if matches!(extension, "tmp" | "crdownload" | "download") {
        let (code, message) = validation_issue(
            "temporary_input_file",
            "ダウンロード中または一時ファイルのため追加できません。",
        );
        return (false, code, message, None);
    }
    if kind == "unsupported" {
        let (code, message) = validation_issue(
            "unsupported_format",
            "対応形式ではありません。PDF、Word、Excel、PowerPoint を選択してください。",
        );
        return (false, code, message, None);
    }

    let Some(metadata) = metadata else {
        let (code, message) = validation_issue(
            "input_not_found",
            "ファイルが存在しないか、現在アクセスできません。",
        );
        return (false, code, message, None);
    };
    if !metadata.is_file() {
        let (code, message) =
            validation_issue("input_not_file", "ファイルではないため追加できません。");
        return (false, code, message, None);
    }
    if metadata.len() == 0 {
        let (code, message) = validation_issue(
            "empty_input_file",
            "ファイルサイズが 0 バイトのため追加できません。",
        );
        return (false, code, message, None);
    }
    if is_cloud_placeholder(metadata) {
        let (code, message) = validation_issue(
            "input_cloud_placeholder",
            "クラウド上の実体未取得ファイルです。先にローカルへダウンロードしてください。",
        );
        return (false, code, message, None);
    }

    let signature = match detect_signature(file_path) {
        Ok(value) => value,
        Err(message) => {
            let (code, message) = validation_issue("input_not_readable", message);
            return (false, code, message, None);
        }
    };
    let valid_signature = match kind {
        "pdf" => signature == "pdf",
        "excel" | "word" | "powerpoint" => signature == "zip" || signature == "ole",
        _ => false,
    };
    if !valid_signature {
        let expected = if kind == "pdf" { "PDF" } else { "Office" };
        let (code, message) = validation_issue(
            "invalid_file_signature",
            format!(
                "拡張子は {expected} ですが、ファイルの中身が一致しません。別形式や破損ファイルの可能性があります。"
            ),
        );
        return (false, code, message, Some(signature));
    }

    (true, None, None, Some(signature))
}

fn cache_root() -> PathBuf {
    std::env::temp_dir().join("pdf-workbench-sessions")
}

fn toolhub_smoke_resource_dir() -> Result<PathBuf, String> {
    if let Ok(value) = std::env::var("PDF_WORKBENCH_RESOURCE_DIR") {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return Ok(PathBuf::from(trimmed));
        }
    }

    let exe_path = std::env::current_exe().map_err(|error| error.to_string())?;
    exe_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Could not resolve PDF Workbench executable directory.".to_string())
}

fn bundled_python_executable(resource_dir: &Path) -> PathBuf {
    resource_dir.join("python").join(if cfg!(windows) {
        "python.exe"
    } else {
        "bin/python"
    })
}

fn toolhub_smoke_report() -> Result<ToolHubSmokeReport, String> {
    let resource_dir = toolhub_smoke_resource_dir()?;
    let src_python_found = resource_dir
        .join("src-python")
        .join("pdf_workbench_engine")
        .exists();
    let bundled_python_found = bundled_python_executable(&resource_dir).exists();

    if !src_python_found {
        return Err(format!(
            "Bundled src-python/pdf_workbench_engine was not found under {}.",
            resource_dir.display()
        ));
    }
    if !bundled_python_found {
        return Err(format!(
            "Bundled Python runtime was not found under {}.",
            resource_dir.join("python").display()
        ));
    }

    let worker_response = python_worker::run(
        serde_json::json!({
            "kind": "ping",
            "jobId": "toolhub-smoke"
        }),
        Some(resource_dir.clone()),
    )?;

    let worker_ok = worker_response
        .get("type")
        .and_then(Value::as_str)
        .is_some_and(|value| value == "result")
        && worker_response
            .get("data")
            .and_then(|data| data.get("ok"))
            .and_then(Value::as_bool)
            .unwrap_or(false);

    if !worker_ok {
        return Err(format!(
            "Worker ping did not return an ok result: {}",
            worker_response
        ));
    }

    Ok(ToolHubSmokeReport {
        ok: true,
        resource_dir: resource_dir.to_string_lossy().to_string(),
        src_python_found,
        bundled_python_found,
        worker_response,
    })
}

pub fn run_toolhub_smoke() -> i32 {
    match toolhub_smoke_report() {
        Ok(report) => match serde_json::to_string_pretty(&report) {
            Ok(text) => {
                println!("{text}");
                0
            }
            Err(error) => {
                eprintln!("Failed to encode ToolHub smoke report: {error}");
                1
            }
        },
        Err(error) => {
            eprintln!("ToolHub smoke failed: {error}");
            1
        }
    }
}

fn cleanup_stale_cache_sessions(root: &Path, max_age: Duration) {
    let Ok(entries) = std::fs::read_dir(root) else {
        return;
    };
    let now = SystemTime::now();

    for entry in entries.flatten() {
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        if !name.starts_with("session-") {
            continue;
        }
        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        if !metadata.is_dir() {
            continue;
        }
        let Ok(modified) = metadata.modified() else {
            continue;
        };
        let Ok(age) = now.duration_since(modified) else {
            continue;
        };
        if age >= max_age {
            let _ = std::fs::remove_dir_all(&path);
        }
    }
}

fn session_id() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();
    format!("session-{millis}")
}

#[tauri::command]
fn describe_input_files(paths: Vec<String>) -> Result<Vec<InputFileInfo>, String> {
    let mut files = Vec::with_capacity(paths.len());

    for path in paths {
        let file_path = Path::new(&path);
        let name = file_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or(&path)
            .to_string();
        let extension = file_path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase();
        let metadata = std::fs::metadata(file_path).ok();
        let size_bytes = metadata.as_ref().map(|meta| meta.len());
        let kind = kind_from_extension(&extension).to_string();
        let (available, validation_code, validation_message, signature_kind) =
            validate_input_file(file_path, &name, &extension, &kind, metadata.as_ref());

        files.push(InputFileInfo {
            path,
            name,
            extension,
            size_bytes,
            kind,
            available,
            validation_code,
            validation_message,
            signature_kind,
        });
    }

    Ok(files)
}

#[tauri::command]
fn prepare_cache_session() -> Result<CacheSessionInfo, String> {
    let id = session_id();
    let root = cache_root();
    cleanup_stale_cache_sessions(&root, Duration::from_secs(STALE_CACHE_SESSION_SECONDS));
    let path = root.join(&id);
    std::fs::create_dir_all(&path).map_err(|error| error.to_string())?;

    Ok(CacheSessionInfo {
        id,
        path: path.to_string_lossy().to_string(),
        initialized: true,
    })
}

#[tauri::command]
fn check_alpha_license() -> AlphaLicenseInfo {
    let checked_at_epoch_seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    let valid = checked_at_epoch_seconds < ALPHA_EXPIRY_UNIX_SECONDS;

    AlphaLicenseInfo {
        valid,
        expires_on: ALPHA_EXPIRES_ON,
        checked_at_epoch_seconds,
        message: if valid {
            "アルファ版ライセンスは有効です。".to_string()
        } else {
            "アルファ版ライセンスの有効期限が終了しました。".to_string()
        },
    }
}

#[tauri::command]
fn get_e2e_bootstrap() -> E2eBootstrapInfo {
    let enabled = std::env::var("PDF_WORKBENCH_E2E")
        .map(|value| value == "1" || value.eq_ignore_ascii_case("true"))
        .unwrap_or(false);
    if !enabled {
        return E2eBootstrapInfo {
            enabled: false,
            files: Vec::new(),
            output_path: None,
            auto_export: false,
        };
    }

    let files = std::env::var("PDF_WORKBENCH_E2E_FILES")
        .unwrap_or_default()
        .split('|')
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .collect();
    let output_path = std::env::var("PDF_WORKBENCH_E2E_OUTPUT")
        .ok()
        .filter(|value| !value.trim().is_empty());
    let auto_export = std::env::var("PDF_WORKBENCH_E2E_AUTORUN")
        .map(|value| value == "1" || value.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    E2eBootstrapInfo {
        enabled,
        files,
        output_path,
        auto_export,
    }
}

#[tauri::command]
fn write_e2e_result(payload: Value) -> Result<(), String> {
    let enabled = std::env::var("PDF_WORKBENCH_E2E")
        .map(|value| value == "1" || value.eq_ignore_ascii_case("true"))
        .unwrap_or(false);
    if !enabled {
        return Err("E2E bootstrap is not enabled.".to_string());
    }

    let path = std::env::var("PDF_WORKBENCH_E2E_DONE")
        .map_err(|_| "PDF_WORKBENCH_E2E_DONE is not set.".to_string())?;
    let target = PathBuf::from(path);
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let text = serde_json::to_string_pretty(&payload).map_err(|error| error.to_string())?;
    std::fs::write(target, text).map_err(|error| error.to_string())
}

fn preflight_error(
    code: &str,
    message: impl Into<String>,
    target: Option<String>,
) -> PreflightIssue {
    PreflightIssue {
        level: "error",
        code: code.to_string(),
        message: message.into(),
        target,
    }
}

fn validate_output_file_name(name: &str) -> Result<(), PreflightIssue> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(preflight_error(
            "invalid_output_name",
            "出力ファイル名が空です。",
            None,
        ));
    }
    if trimmed != name || trimmed.ends_with('.') || trimmed.ends_with(' ') {
        return Err(preflight_error(
            "invalid_output_name",
            "出力ファイル名の先頭/末尾の空白、末尾のドットは使用できません。",
            Some(name.to_string()),
        ));
    }
    if trimmed.chars().any(|char| {
        matches!(char, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*') || char < ' '
    }) {
        return Err(preflight_error(
            "invalid_output_name",
            "出力ファイル名に Windows で使用できない文字が含まれています。",
            Some(name.to_string()),
        ));
    }
    let normalized = if trimmed.to_ascii_lowercase().ends_with(".pdf") {
        &trimmed[..trimmed.len().saturating_sub(4)]
    } else {
        trimmed
    };
    if normalized.trim().is_empty() || normalized == "." || normalized == ".." {
        return Err(preflight_error(
            "invalid_output_name",
            "出力ファイル名が不正です。",
            Some(name.to_string()),
        ));
    }
    if is_reserved_windows_name(trimmed) {
        return Err(preflight_error(
            "invalid_output_name",
            "Windows の予約名は出力ファイル名に使用できません。",
            Some(name.to_string()),
        ));
    }
    Ok(())
}

fn validate_output_parent(parent: &Path) -> Result<(), PreflightIssue> {
    if parent.exists() && !parent.is_dir() {
        return Err(preflight_error(
            "invalid_output_dir",
            "保存先がフォルダではありません。",
            Some(parent.to_string_lossy().to_string()),
        ));
    }
    std::fs::create_dir_all(parent).map_err(|error| {
        preflight_error(
            "invalid_output_dir",
            format!("保存先フォルダを準備できません: {error}"),
            Some(parent.to_string_lossy().to_string()),
        )
    })?;

    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();
    let test_path = parent.join(format!(".pdf-workbench-write-test-{millis}.tmp"));
    let write_result = (|| -> std::io::Result<()> {
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&test_path)?;
        file.write_all(b"ok")?;
        file.flush()
    })();
    let _ = std::fs::remove_file(&test_path);
    write_result.map_err(|error| {
        preflight_error(
            "output_not_writable",
            format!("保存先に書き込めません: {error}"),
            Some(parent.to_string_lossy().to_string()),
        )
    })
}

fn validate_output_file(path: &Path) -> Result<(), PreflightIssue> {
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    validate_output_file_name(file_name)?;

    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    validate_output_parent(parent)?;

    if path.exists() {
        if path.is_dir() {
            return Err(preflight_error(
                "invalid_output_name",
                "同名のフォルダが存在するため PDF として保存できません。",
                Some(path.to_string_lossy().to_string()),
            ));
        }
        std::fs::OpenOptions::new()
            .write(true)
            .open(path)
            .map_err(|error| {
                preflight_error(
                    "output_file_locked",
                    format!("既存の出力ファイルに書き込めません。開いている場合は閉じてください: {error}"),
                    Some(path.to_string_lossy().to_string()),
                )
            })?;
    }
    Ok(())
}

fn preflight_from_issue(issue: PreflightIssue) -> PreflightResult {
    PreflightResult {
        ok: false,
        issues: vec![issue],
    }
}

#[tauri::command]
fn preflight_export_destination(destination: Value) -> Result<PreflightResult, String> {
    let Some(destination) = destination.as_object() else {
        return Ok(preflight_from_issue(preflight_error(
            "invalid_export_destination",
            "保存先指定が不正です。",
            None,
        )));
    };

    if let Some(output_path) = destination.get("outputPath").and_then(Value::as_str) {
        let path = PathBuf::from(output_path);
        return Ok(match validate_output_file(&path) {
            Ok(()) => PreflightResult {
                ok: true,
                issues: Vec::new(),
            },
            Err(issue) => preflight_from_issue(issue),
        });
    }

    let Some(output_dir) = destination.get("outputDir").and_then(Value::as_str) else {
        return Ok(preflight_from_issue(preflight_error(
            "invalid_output_dir",
            "保存先フォルダが指定されていません。",
            None,
        )));
    };
    let Some(output_names) = destination.get("outputNames").and_then(Value::as_array) else {
        return Ok(preflight_from_issue(preflight_error(
            "invalid_output_name",
            "出力ファイル名が指定されていません。",
            None,
        )));
    };
    if output_names.is_empty() {
        return Ok(preflight_from_issue(preflight_error(
            "invalid_output_name",
            "出力ファイル名が空です。",
            None,
        )));
    }

    let output_dir = PathBuf::from(output_dir);
    if let Err(issue) = validate_output_parent(&output_dir) {
        return Ok(preflight_from_issue(issue));
    }

    let mut seen = std::collections::HashSet::new();
    for raw_name in output_names {
        let Some(name) = raw_name.as_str() else {
            return Ok(preflight_from_issue(preflight_error(
                "invalid_output_name",
                "出力ファイル名が不正です。",
                None,
            )));
        };
        if let Err(issue) = validate_output_file_name(name) {
            return Ok(preflight_from_issue(issue));
        }
        let output_name = if name.to_ascii_lowercase().ends_with(".pdf") {
            name.to_string()
        } else {
            format!("{name}.pdf")
        };
        let key = output_name.to_ascii_lowercase();
        if !seen.insert(key) {
            return Ok(preflight_from_issue(preflight_error(
                "duplicate_output_name",
                "出力ファイル名が重複しています。",
                Some(output_name),
            )));
        }
        if let Err(issue) = validate_output_file(&output_dir.join(output_name)) {
            return Ok(preflight_from_issue(issue));
        }
    }

    Ok(PreflightResult {
        ok: true,
        issues: Vec::new(),
    })
}

#[tauri::command]
fn cleanup_cache_session(session_id: String) -> Result<(), String> {
    if !session_id.starts_with("session-") {
        return Ok(());
    }

    let root = cache_root();
    let target = root.join(session_id);
    if target.exists() {
        std::fs::remove_dir_all(&target).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn run_processing_engine(app: tauri::AppHandle, request: Value) -> Result<Value, String> {
    let resource_dir = app.path().resource_dir().ok();
    python_worker::run(request, resource_dir)
}

#[tauri::command]
fn start_processing_engine_job(
    app: tauri::AppHandle,
    registry: tauri::State<python_worker::EngineJobRegistry>,
    request: Value,
) -> Result<String, String> {
    let resource_dir = app.path().resource_dir().ok();
    python_worker::start_stream(app, request, resource_dir, registry.inner().clone())
}

#[tauri::command]
fn cancel_processing_engine_job(
    app: tauri::AppHandle,
    registry: tauri::State<python_worker::EngineJobRegistry>,
    job_id: String,
) -> Result<bool, String> {
    let cancelled = registry.cancel(&job_id)?;
    if cancelled {
        python_worker::emit_cancel(&app, &job_id);
    } else {
        let _ = app.emit(
            "processing-engine-event",
            serde_json::json!({
                "type": "log",
                "jobId": job_id,
                "level": "warn",
                "message": "キャンセル対象の処理はすでに終了しています。",
            }),
        );
    }
    Ok(cancelled)
}

#[tauri::command]
fn open_output_path(path: String) -> Result<(), String> {
    let target = PathBuf::from(path);
    if !target.exists() {
        return Err("出力ファイルが見つかりません。".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("rundll32")
            .arg("url.dll,FileProtocolHandler")
            .arg(&target)
            .spawn()
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&target)
            .spawn()
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(&target)
            .spawn()
            .map_err(|error| error.to_string())?;
        return Ok(());
    }
}

#[tauri::command]
fn reveal_output_path(path: String) -> Result<(), String> {
    let target = PathBuf::from(path);
    if !target.exists() {
        return Err("出力ファイルが見つかりません。".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        if target.is_file() {
            Command::new("explorer")
                .arg(format!("/select,{}", target.to_string_lossy()))
                .spawn()
                .map_err(|error| error.to_string())?;
        } else {
            Command::new("explorer")
                .arg(&target)
                .spawn()
                .map_err(|error| error.to_string())?;
        }
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(target.parent().unwrap_or(&target))
            .spawn()
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(target.parent().unwrap_or(&target))
            .spawn()
            .map_err(|error| error.to_string())?;
        return Ok(());
    }
}

fn dispose_splash_window_once(app: &tauri::AppHandle) {
    if let Some(splash_window) = app.get_webview_window("splashscreen") {
        let _ = splash_window.hide();
        if let Err(error) = splash_window.destroy() {
            eprintln!("Failed to destroy splash window: {error}");
            let _ = splash_window.close();
        }
    }
}

fn schedule_splash_disposal(app: &tauri::AppHandle) {
    let app_for_task = app.clone();
    if let Err(error) = app.run_on_main_thread(move || {
        dispose_splash_window_once(&app_for_task);
    }) {
        eprintln!("Failed to schedule splash window cleanup: {error}");
        dispose_splash_window_once(app);
    }
}

fn start_splash_cleanup(app: &tauri::AppHandle, startup: &StartupState) {
    if startup.splash_cleanup_started.swap(true, Ordering::AcqRel) {
        schedule_splash_disposal(app);
        return;
    }

    schedule_splash_disposal(app);

    let app_for_retry = app.clone();
    std::thread::spawn(move || {
        for _ in 0..40 {
            std::thread::sleep(Duration::from_millis(250));
            schedule_splash_disposal(&app_for_retry);
        }
    });
}

fn reveal_main_window(app: &tauri::AppHandle, focus: bool) -> Result<(), String> {
    let main_window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window was not found".to_string())?;

    main_window.show().map_err(|error| error.to_string())?;
    if focus {
        let _ = main_window.set_focus();
    }

    Ok(())
}

fn install_startup_watchdog(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(MAX_SPLASH_VISIBLE_MILLIS));
        let Some(startup) = app.try_state::<StartupState>() else {
            return;
        };
        if startup.completed.load(Ordering::Acquire) {
            return;
        }
        if reveal_main_window(&app, false).is_ok() {
            startup.completed.store(true, Ordering::Release);
            start_splash_cleanup(&app, startup.inner());
        }
    });
}

#[tauri::command]
fn complete_startup(
    app: tauri::AppHandle,
    startup: tauri::State<'_, StartupState>,
) -> Result<(), String> {
    let minimum_visible = Duration::from_millis(MIN_SPLASH_VISIBLE_MILLIS);
    let elapsed = startup.launched_at.elapsed();
    if elapsed < minimum_visible {
        std::thread::sleep(minimum_visible - elapsed);
    }

    if startup.completed.load(Ordering::Acquire) {
        start_splash_cleanup(&app, startup.inner());
        return Ok(());
    }

    reveal_main_window(&app, true)?;
    startup.completed.store(true, Ordering::Release);
    start_splash_cleanup(&app, startup.inner());

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cleanup_stale_cache_sessions_removes_only_session_directories() {
        let root =
            std::env::temp_dir().join(format!("pdf-workbench-cache-cleanup-test-{}", session_id()));
        let session_dir = root.join("session-remove");
        let unrelated_dir = root.join("not-a-session");
        let session_file = root.join("session-file");

        std::fs::create_dir_all(&session_dir).unwrap();
        std::fs::create_dir_all(&unrelated_dir).unwrap();
        std::fs::write(&session_file, b"keep").unwrap();

        cleanup_stale_cache_sessions(&root, Duration::from_secs(0));

        assert!(!session_dir.exists());
        assert!(unrelated_dir.exists());
        assert!(session_file.exists());

        let _ = std::fs::remove_dir_all(root);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(python_worker::EngineJobRegistry::default())
        .manage(StartupState {
            launched_at: Instant::now(),
            completed: AtomicBool::new(false),
            splash_cleanup_started: AtomicBool::new(false),
        })
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            install_startup_watchdog(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            describe_input_files,
            check_alpha_license,
            get_e2e_bootstrap,
            write_e2e_result,
            preflight_export_destination,
            prepare_cache_session,
            cleanup_cache_session,
            run_processing_engine,
            start_processing_engine_job,
            cancel_processing_engine_job,
            open_output_path,
            reveal_output_path,
            complete_startup
        ])
        .run(tauri::generate_context!())
        .expect("error while running PDF Workbench");
}

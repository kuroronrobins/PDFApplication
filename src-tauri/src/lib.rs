use serde::Serialize;
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::process::Command;
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

const ALPHA_EXPIRES_ON: &str = "2026-06-30";
const ALPHA_EXPIRY_UNIX_SECONDS: u64 = 1_782_831_600; // 2026-07-01 00:00:00 JST.
const MIN_SPLASH_VISIBLE_MILLIS: u64 = 4_000;

struct StartupClock {
    launched_at: Instant,
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

fn cache_root() -> PathBuf {
    std::env::temp_dir().join("pdf-workbench-sessions")
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
        let size_bytes = std::fs::metadata(file_path).map(|meta| meta.len()).ok();
        let kind = kind_from_extension(&extension).to_string();

        files.push(InputFileInfo {
            path,
            name,
            extension,
            size_bytes,
            kind,
        });
    }

    Ok(files)
}

#[tauri::command]
fn prepare_cache_session() -> Result<CacheSessionInfo, String> {
    let id = session_id();
    let path = cache_root().join(&id);
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
            "Alpha license is valid.".to_string()
        } else {
            "Alpha license has expired.".to_string()
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

#[tauri::command]
fn complete_startup(
    app: tauri::AppHandle,
    startup: tauri::State<'_, StartupClock>,
) -> Result<(), String> {
    let minimum_visible = Duration::from_millis(MIN_SPLASH_VISIBLE_MILLIS);
    let elapsed = startup.launched_at.elapsed();
    if elapsed < minimum_visible {
        std::thread::sleep(minimum_visible - elapsed);
    }

    let main_window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window was not found".to_string())?;

    main_window.show().map_err(|error| error.to_string())?;
    let _ = main_window.set_focus();

    if let Some(splash_window) = app.get_webview_window("splashscreen") {
        let _ = splash_window.close();
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(python_worker::EngineJobRegistry::default())
        .manage(StartupClock {
            launched_at: Instant::now(),
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            describe_input_files,
            check_alpha_license,
            get_e2e_bootstrap,
            write_e2e_result,
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

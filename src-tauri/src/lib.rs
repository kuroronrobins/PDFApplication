use serde::Serialize;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            describe_input_files,
            prepare_cache_session,
            cleanup_cache_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running PDF Workbench");
}

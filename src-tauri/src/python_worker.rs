use serde_json::Value;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

const ENGINE_EVENT: &str = "processing-engine-event";

struct PythonCandidate {
    executable: String,
    args: Vec<String>,
}

struct RunningJob {
    child: Arc<Mutex<Child>>,
    cancelled: Arc<AtomicBool>,
}

#[derive(Clone, Default)]
pub struct EngineJobRegistry {
    jobs: Arc<Mutex<HashMap<String, RunningJob>>>,
}

impl EngineJobRegistry {
    fn insert(&self, job_id: String, job: RunningJob) -> Result<(), String> {
        let mut jobs = self.jobs.lock().map_err(|error| error.to_string())?;
        jobs.insert(job_id, job);
        Ok(())
    }

    fn remove(&self, job_id: &str) {
        if let Ok(mut jobs) = self.jobs.lock() {
            jobs.remove(job_id);
        }
    }

    pub fn cancel(&self, job_id: &str) -> Result<bool, String> {
        let jobs = self.jobs.lock().map_err(|error| error.to_string())?;
        let Some(job) = jobs.get(job_id) else {
            return Ok(false);
        };
        job.cancelled.store(true, Ordering::SeqCst);
        let mut child = job.child.lock().map_err(|error| error.to_string())?;
        let _ = child.kill();
        Ok(true)
    }
}

fn worker_root(resource_dir: Option<PathBuf>) -> Result<PathBuf, String> {
    if let Ok(root) = std::env::var("PDF_WORKBENCH_PROJECT_ROOT") {
        let candidate = PathBuf::from(root).join("src-python");
        if candidate.join("pdf_workbench_engine").exists() {
            return Ok(candidate);
        }
    }

    if let Some(resource_dir) = resource_dir {
        let candidate = resource_dir.join("src-python");
        if candidate.join("pdf_workbench_engine").exists() {
            return Ok(candidate);
        }
    }

    let cwd = std::env::current_dir().map_err(|error| error.to_string())?;
    let mut candidates = vec![cwd.clone()];
    if let Some(parent) = cwd.parent() {
        candidates.push(parent.to_path_buf());
        if let Some(grandparent) = parent.parent() {
            candidates.push(grandparent.to_path_buf());
        }
    }

    for base in candidates {
        let candidate = base.join("src-python");
        if candidate.join("pdf_workbench_engine").exists() {
            return Ok(candidate);
        }
    }

    Err("src-python/pdf_workbench_engine が見つかりません。".to_string())
}

fn python_candidates() -> Vec<PythonCandidate> {
    let mut candidates = Vec::new();
    if let Ok(path) = std::env::var("PDF_WORKBENCH_PYTHON") {
        if !path.trim().is_empty() {
            candidates.push(PythonCandidate {
                executable: path,
                args: Vec::new(),
            });
        }
    }

    candidates.push(PythonCandidate {
        executable: "python".to_string(),
        args: Vec::new(),
    });
    candidates.push(PythonCandidate {
        executable: "py".to_string(),
        args: vec!["-3".to_string()],
    });
    candidates
}

fn command_for_candidate(candidate: &PythonCandidate, worker_root: &PathBuf) -> Command {
    let mut command = Command::new(&candidate.executable);
    command
        .args(&candidate.args)
        .arg("-m")
        .arg("pdf_workbench_engine.cli")
        .env("PYTHONPATH", worker_root)
        .env("PYTHONIOENCODING", "utf-8")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    command
}

pub fn run(request: Value, resource_dir: Option<PathBuf>) -> Result<Value, String> {
    let worker_root = worker_root(resource_dir)?;
    let request_json = serde_json::to_vec(&request).map_err(|error| error.to_string())?;
    let mut last_error = String::new();

    for candidate in python_candidates() {
        let mut command = command_for_candidate(&candidate, &worker_root);
        let mut child = match command.spawn() {
            Ok(child) => child,
            Err(error) => {
                last_error = format!("{}: {}", candidate.executable, error);
                continue;
            }
        };

        if let Some(stdin) = child.stdin.as_mut() {
            stdin.write_all(&request_json).map_err(|error| error.to_string())?;
        }

        let output = child.wait_with_output().map_err(|error| error.to_string())?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            last_error = format!("{} exited with {}: {}", candidate.executable, output.status, stderr);
            continue;
        }

        if output.stdout.is_empty() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Python worker returned empty output. {}", stderr));
        }

        return serde_json::from_slice::<Value>(&output.stdout)
            .map_err(|error| format!("Python worker JSON parse failed: {error}"));
    }

    Err(format!(
        "Python workerを起動できませんでした。PDF_WORKBENCH_PYTHONを設定してください。{}",
        last_error
    ))
}

fn generated_job_id() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();
    format!("worker-{millis}")
}

fn request_job_id(request: &Value) -> String {
    request
        .get("jobId")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(ToString::to_string)
        .unwrap_or_else(generated_job_id)
}

fn streaming_request(mut request: Value, job_id: &str) -> Result<Value, String> {
    let Value::Object(ref mut map) = request else {
        return Err("worker request must be an object".to_string());
    };
    map.insert("jobId".to_string(), Value::String(job_id.to_string()));
    map.insert("stream".to_string(), Value::Bool(true));
    Ok(request)
}

fn emit(app: &AppHandle, payload: Value) {
    let _ = app.emit(ENGINE_EVENT, payload);
}

fn emit_error(app: &AppHandle, job_id: &str, code: &str, message: String, detail: String) {
    emit(
        app,
        serde_json::json!({
            "type": "error",
            "jobId": job_id,
            "code": code,
            "message": message,
            "detail": detail,
        }),
    );
}

fn emit_cancelled(app: &AppHandle, job_id: &str) {
    emit(
        app,
        serde_json::json!({
            "type": "cancelled",
            "jobId": job_id,
            "message": "処理をキャンセルしました。",
        }),
    );
}

pub fn start_stream(
    app: AppHandle,
    request: Value,
    resource_dir: Option<PathBuf>,
    registry: EngineJobRegistry,
) -> Result<String, String> {
    let worker_root = worker_root(resource_dir)?;
    let job_id = request_job_id(&request);
    let request = streaming_request(request, &job_id)?;
    let request_json = serde_json::to_vec(&request).map_err(|error| error.to_string())?;
    let mut last_error = String::new();

    for candidate in python_candidates() {
        let mut command = command_for_candidate(&candidate, &worker_root);
        let mut child = match command.spawn() {
            Ok(child) => child,
            Err(error) => {
                last_error = format!("{}: {}", candidate.executable, error);
                continue;
            }
        };

        if let Some(stdin) = child.stdin.as_mut() {
            stdin.write_all(&request_json).map_err(|error| error.to_string())?;
        }
        drop(child.stdin.take());

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Python worker stdoutを取得できませんでした。".to_string())?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| "Python worker stderrを取得できませんでした。".to_string())?;
        let child = Arc::new(Mutex::new(child));
        let cancelled = Arc::new(AtomicBool::new(false));
        registry.insert(
            job_id.clone(),
            RunningJob {
                child: Arc::clone(&child),
                cancelled: Arc::clone(&cancelled),
            },
        )?;

        let app_for_thread = app.clone();
        let registry_for_thread = registry.clone();
        let job_id_for_thread = job_id.clone();
        std::thread::spawn(move || {
            let stderr_buffer = Arc::new(Mutex::new(String::new()));
            let stderr_for_thread = Arc::clone(&stderr_buffer);
            std::thread::spawn(move || {
                let mut text = String::new();
                let mut reader = BufReader::new(stderr);
                let _ = reader.read_to_string(&mut text);
                if let Ok(mut buffer) = stderr_for_thread.lock() {
                    *buffer = text;
                }
            });

            let mut saw_terminal_event = false;
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                let Ok(line) = line else {
                    continue;
                };
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                match serde_json::from_str::<Value>(trimmed) {
                    Ok(payload) => {
                        if matches!(
                            payload.get("type").and_then(Value::as_str),
                            Some("result" | "error" | "cancelled")
                        ) {
                            saw_terminal_event = true;
                        }
                        emit(&app_for_thread, payload);
                    }
                    Err(error) => emit(
                        &app_for_thread,
                        serde_json::json!({
                            "type": "log",
                            "jobId": job_id_for_thread,
                            "level": "warn",
                            "message": format!("worker出力をJSONとして解析できませんでした: {error}"),
                        }),
                    ),
                }
            }

            let status = child
                .lock()
                .map_err(|error| error.to_string())
                .and_then(|mut child| child.wait().map_err(|error| error.to_string()));
            let was_cancelled = cancelled.load(Ordering::SeqCst);
            registry_for_thread.remove(&job_id_for_thread);

            if was_cancelled {
                return;
            }

            let stderr_text = stderr_buffer
                .lock()
                .map(|buffer| buffer.clone())
                .unwrap_or_default();
            match status {
                Ok(status) if status.success() && saw_terminal_event => {}
                Ok(status) if status.success() => emit_error(
                    &app_for_thread,
                    &job_id_for_thread,
                    "missing_worker_result",
                    "Python workerが完了結果を返しませんでした。".to_string(),
                    stderr_text,
                ),
                Ok(status) => emit_error(
                    &app_for_thread,
                    &job_id_for_thread,
                    "worker_failed",
                    format!("Python workerが異常終了しました: {status}"),
                    stderr_text,
                ),
                Err(error) => emit_error(
                    &app_for_thread,
                    &job_id_for_thread,
                    "worker_wait_failed",
                    "Python workerの終了待機に失敗しました。".to_string(),
                    error,
                ),
            }
        });

        return Ok(job_id);
    }

    Err(format!(
        "Python workerを起動できませんでした。PDF_WORKBENCH_PYTHONを設定してください。{}",
        last_error
    ))
}

pub fn emit_cancel(app: &AppHandle, job_id: &str) {
    emit_cancelled(app, job_id);
}

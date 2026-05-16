use serde_json::Value;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

const ENGINE_EVENT: &str = "processing-engine-event";
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(windows)]
fn suppress_console_window(command: &mut Command) {
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn suppress_console_window(_command: &mut Command) {}

struct PythonCandidate {
    executable: String,
    args: Vec<String>,
    home: Option<PathBuf>,
    bundled: bool,
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

fn bool_env(name: &str) -> bool {
    std::env::var(name)
        .map(|value| value == "1" || value.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

fn worker_exe_name() -> &'static str {
    if cfg!(windows) {
        "pdf-workbench-engine.exe"
    } else {
        "pdf-workbench-engine"
    }
}

fn worker_exe_candidates(resource_dir: Option<&PathBuf>) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(path) = std::env::var("PDF_WORKBENCH_ENGINE_EXE") {
        if !path.trim().is_empty() {
            candidates.push(PathBuf::from(path));
        }
    }

    if let Some(resource_dir) = resource_dir {
        candidates.push(
            resource_dir
                .join("pdf-workbench-engine")
                .join(worker_exe_name()),
        );
        candidates.push(resource_dir.join(worker_exe_name()));
    }

    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(
            cwd.join("build")
                .join("python-worker")
                .join("pdf-workbench-engine")
                .join(worker_exe_name()),
        );
        if let Some(parent) = cwd.parent() {
            candidates.push(
                parent
                    .join("build")
                    .join("python-worker")
                    .join("pdf-workbench-engine")
                    .join(worker_exe_name()),
            );
        }
    }

    let mut unique = Vec::new();
    for candidate in candidates {
        if candidate.exists() && !unique.iter().any(|item| item == &candidate) {
            unique.push(candidate);
        }
    }
    unique
}

fn python_fallback_disabled() -> bool {
    bool_env("PDF_WORKBENCH_DISABLE_PYTHON_FALLBACK")
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

    Err("src-python/pdf_workbench_engine was not found.".to_string())
}

fn bundled_python_candidates(resource_dir: Option<&PathBuf>) -> Vec<PythonCandidate> {
    let mut candidates = Vec::new();

    if let Some(resource_dir) = resource_dir {
        let home = resource_dir.join("python");
        let executable = home.join(if cfg!(windows) {
            "python.exe"
        } else {
            "bin/python"
        });
        if executable.exists() {
            candidates.push(PythonCandidate {
                executable: executable.to_string_lossy().to_string(),
                args: Vec::new(),
                home: Some(home),
                bundled: true,
            });
        }
    }

    if let Ok(cwd) = std::env::current_dir() {
        for base in [
            cwd.clone(),
            cwd.parent().map(Path::to_path_buf).unwrap_or(cwd),
        ] {
            let home = base.join("build").join("python-runtime").join("python");
            let executable = home.join(if cfg!(windows) {
                "python.exe"
            } else {
                "bin/python"
            });
            if executable.exists() {
                candidates.push(PythonCandidate {
                    executable: executable.to_string_lossy().to_string(),
                    args: Vec::new(),
                    home: Some(home),
                    bundled: true,
                });
            }
        }
    }

    let mut unique = Vec::new();
    for candidate in candidates {
        if !unique
            .iter()
            .any(|item: &PythonCandidate| item.executable == candidate.executable)
        {
            unique.push(candidate);
        }
    }
    unique
}

fn external_python_candidates() -> Vec<PythonCandidate> {
    let mut candidates = Vec::new();
    if let Ok(path) = std::env::var("PDF_WORKBENCH_PYTHON") {
        if !path.trim().is_empty() {
            candidates.push(PythonCandidate {
                executable: path,
                args: Vec::new(),
                home: None,
                bundled: false,
            });
        }
    }

    candidates.push(PythonCandidate {
        executable: "python".to_string(),
        args: Vec::new(),
        home: None,
        bundled: false,
    });
    candidates.push(PythonCandidate {
        executable: "py".to_string(),
        args: vec!["-3".to_string()],
        home: None,
        bundled: false,
    });
    candidates
}

fn command_for_python(candidate: &PythonCandidate, worker_root: &PathBuf) -> Command {
    let mut command = Command::new(&candidate.executable);
    suppress_console_window(&mut command);
    command
        .args(&candidate.args)
        .arg("-m")
        .arg("pdf_workbench_engine.cli")
        .env("PYTHONPATH", worker_root)
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONNOUSERSITE", "1")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(home) = &candidate.home {
        command.env("PYTHONHOME", home);
        let mut path_parts = vec![
            home.to_string_lossy().to_string(),
            home.join("DLLs").to_string_lossy().to_string(),
            home.join("Lib")
                .join("site-packages")
                .join("pywin32_system32")
                .to_string_lossy()
                .to_string(),
        ];
        if let Ok(path) = std::env::var("PATH") {
            path_parts.push(path);
        }
        command.env("PATH", path_parts.join(";"));
    }

    command
}

fn command_for_worker_exe(worker_exe: &Path) -> Command {
    let mut command = Command::new(worker_exe);
    suppress_console_window(&mut command);
    command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    command
}

fn truncate_for_error(text: &str, max_chars: usize) -> String {
    let mut value: String = text.chars().take(max_chars).collect();
    if text.chars().count() > max_chars {
        value.push_str("...");
    }
    value
}

fn parse_worker_json(label: &str, stdout: &[u8], stderr: &[u8]) -> Result<Value, String> {
    match serde_json::from_slice::<Value>(stdout) {
        Ok(value) => return Ok(value),
        Err(initial_error) => {
            let stdout_text = String::from_utf8_lossy(stdout);
            if let Some(start) = stdout_text.find('{') {
                let candidate = &stdout_text[start..];
                let mut stream = serde_json::Deserializer::from_str(candidate).into_iter::<Value>();
                if let Some(Ok(value)) = stream.next() {
                    return Ok(value);
                }
            }

            let stderr_text = String::from_utf8_lossy(stderr);
            Err(format!(
                "{label} worker_protocol_error: JSON parse failed: {initial_error}. stdout prefix: {} stderr prefix: {}",
                truncate_for_error(&stdout_text, 240),
                truncate_for_error(&stderr_text, 240),
            ))
        }
    }
}

fn run_command(mut command: Command, label: &str, request_json: &[u8]) -> Result<Value, String> {
    let mut child = command
        .spawn()
        .map_err(|error| format!("{label}: {error}"))?;

    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(request_json)
            .map_err(|error| error.to_string())?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("{label} exited with {}: {stderr}", output.status));
    }

    if output.stdout.is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("{label} returned empty output. {stderr}"));
    }

    parse_worker_json(label, &output.stdout, &output.stderr)
}

pub fn run(request: Value, resource_dir: Option<PathBuf>) -> Result<Value, String> {
    let request_json = serde_json::to_vec(&request).map_err(|error| error.to_string())?;
    let mut last_error = String::new();

    for worker_exe in worker_exe_candidates(resource_dir.as_ref()) {
        let label = worker_exe.display().to_string();
        match run_command(command_for_worker_exe(&worker_exe), &label, &request_json) {
            Ok(value) => return Ok(value),
            Err(error) => last_error = error,
        }
    }

    let worker_root = worker_root(resource_dir.clone())?;
    let mut python_candidates = bundled_python_candidates(resource_dir.as_ref());
    if !python_fallback_disabled() {
        python_candidates.extend(external_python_candidates());
    }

    for candidate in python_candidates {
        let label = if candidate.bundled {
            format!("bundled Python runtime {}", candidate.executable)
        } else {
            candidate.executable.clone()
        };
        match run_command(
            command_for_python(&candidate, &worker_root),
            &label,
            &request_json,
        ) {
            Ok(value) => return Ok(value),
            Err(error) => last_error = error,
        }
    }

    Err(format!("Python worker could not be started. {last_error}"))
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
            "message": "Processing was cancelled.",
        }),
    );
}

fn spawn_stream_reader(
    app: AppHandle,
    registry: EngineJobRegistry,
    job_id: String,
    child: Arc<Mutex<Child>>,
    cancelled: Arc<AtomicBool>,
    stdout: impl Read + Send + 'static,
    stderr: impl Read + Send + 'static,
) {
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
                    emit(&app, payload);
                }
                Err(error) => emit(
                    &app,
                    serde_json::json!({
                        "type": "log",
                        "jobId": job_id,
                        "level": "warn",
                        "message": format!("Worker output was not valid JSON: {error}"),
                    }),
                ),
            }
        }

        let status = child
            .lock()
            .map_err(|error| error.to_string())
            .and_then(|mut child| child.wait().map_err(|error| error.to_string()));
        let was_cancelled = cancelled.load(Ordering::SeqCst);
        registry.remove(&job_id);

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
                &app,
                &job_id,
                "missing_worker_result",
                "Python worker did not return a terminal result.".to_string(),
                stderr_text,
            ),
            Ok(status) => emit_error(
                &app,
                &job_id,
                "worker_failed",
                format!("Python worker exited with {status}"),
                stderr_text,
            ),
            Err(error) => emit_error(
                &app,
                &job_id,
                "worker_wait_failed",
                "Failed while waiting for Python worker to exit.".to_string(),
                error,
            ),
        }
    });
}

fn start_stream_from_command(
    app: AppHandle,
    registry: EngineJobRegistry,
    job_id: &str,
    mut command: Command,
    request_json: &[u8],
) -> Result<String, String> {
    let mut child = command.spawn().map_err(|error| error.to_string())?;

    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(request_json)
            .map_err(|error| error.to_string())?;
    }
    drop(child.stdin.take());

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Python worker stdout is unavailable.".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Python worker stderr is unavailable.".to_string())?;
    let child = Arc::new(Mutex::new(child));
    let cancelled = Arc::new(AtomicBool::new(false));

    registry.insert(
        job_id.to_string(),
        RunningJob {
            child: Arc::clone(&child),
            cancelled: Arc::clone(&cancelled),
        },
    )?;
    spawn_stream_reader(
        app,
        registry,
        job_id.to_string(),
        child,
        cancelled,
        stdout,
        stderr,
    );

    Ok(job_id.to_string())
}

pub fn start_stream(
    app: AppHandle,
    request: Value,
    resource_dir: Option<PathBuf>,
    registry: EngineJobRegistry,
) -> Result<String, String> {
    let job_id = request_job_id(&request);
    let request = streaming_request(request, &job_id)?;
    let request_json = serde_json::to_vec(&request).map_err(|error| error.to_string())?;
    let mut last_error = String::new();

    for worker_exe in worker_exe_candidates(resource_dir.as_ref()) {
        match start_stream_from_command(
            app.clone(),
            registry.clone(),
            &job_id,
            command_for_worker_exe(&worker_exe),
            &request_json,
        ) {
            Ok(value) => return Ok(value),
            Err(error) => last_error = format!("{}: {error}", worker_exe.display()),
        }
    }

    let worker_root = worker_root(resource_dir.clone())?;
    let mut python_candidates = bundled_python_candidates(resource_dir.as_ref());
    if !python_fallback_disabled() {
        python_candidates.extend(external_python_candidates());
    }

    for candidate in python_candidates {
        match start_stream_from_command(
            app.clone(),
            registry.clone(),
            &job_id,
            command_for_python(&candidate, &worker_root),
            &request_json,
        ) {
            Ok(value) => return Ok(value),
            Err(error) => {
                let label = if candidate.bundled {
                    format!("bundled Python runtime {}", candidate.executable)
                } else {
                    candidate.executable
                };
                last_error = format!("{label}: {error}");
            }
        }
    }

    Err(format!("Python worker could not be started. {last_error}"))
}

pub fn emit_cancel(app: &AppHandle, job_id: &str) {
    emit_cancelled(app, job_id);
}

from __future__ import annotations

import json
import os
import socket
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pdf_app.services.github_log_sink import append_jsonl_to_github

DEFAULT_LOG_PATH = Path("./logs/usage_events.jsonl")
DEFAULT_SPOOL_PATH = Path("./logs/usage_spool.jsonl")
BASELINE_SECONDS: dict[str, float | None] = {
    "merge": 120.0,
    "split": 90.0,
    "reorder": 150.0,
    "convert": 180.0,
    "header_footer": 120.0,
    "text_edit": 180.0,
    "watermark": 90.0,
    "encrypt": 60.0,
    "workspace_load": 30.0,
    "workspace_export": 90.0,
    "workspace_split": 90.0,
    "inspect": None,
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _append_line(path: Path, line: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fp:
        fp.write(line)
        fp.write("\n")


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _calculate_saved_seconds(action: str, duration_ms: float, status: str) -> tuple[float | None, float | None, float | None]:
    baseline = _to_float(os.getenv(f"PDFAPP_BASELINE_{action.upper()}"))
    if baseline is None:
        baseline = BASELINE_SECONDS.get(action)

    actual = duration_ms / 1000.0
    if baseline is None or status != "success":
        return baseline, actual, None
    return baseline, actual, max(0.0, baseline - actual)


def _build_event(
    *,
    action: str,
    status: str,
    duration_ms: float,
    input_count: int,
    output_count: int,
    error_message: str,
    details: dict[str, Any],
) -> dict[str, Any]:
    baseline, actual, saved = _calculate_saved_seconds(action, duration_ms, status)
    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": _now_iso(),
        "action": action,
        "status": status,
        "duration_ms": round(duration_ms, 3),
        "input_count": input_count,
        "output_count": output_count,
        "error_message": error_message,
        "user_id": os.getenv("PDFAPP_USER_ID") or os.getenv("USER") or "unknown",
        "host": socket.gethostname(),
        "app_version": os.getenv("PDFAPP_VERSION", "1.0.0"),
        "baseline_seconds": baseline,
        "actual_seconds": round(actual, 3) if actual is not None else None,
        "saved_seconds": round(saved, 3) if saved is not None else None,
        "details": details,
    }


def _flush_spool() -> None:
    repo = os.getenv("PDFAPP_LOG_REPO", "")
    path = os.getenv("PDFAPP_LOG_PATH", "")
    token = os.getenv("GITHUB_TOKEN", "")
    branch = os.getenv("PDFAPP_LOG_BRANCH", "main")
    if not (repo and path and token):
        return

    spool_path = Path(os.getenv("PDFAPP_USAGE_SPOOL_PATH", str(DEFAULT_SPOOL_PATH)))
    if not spool_path.exists():
        return

    remaining: list[str] = []
    for line in spool_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            append_jsonl_to_github(repo, path, token, branch, line)
        except Exception:
            remaining.append(line)

    if remaining:
        spool_path.write_text("\n".join(remaining) + "\n", encoding="utf-8")
    else:
        spool_path.unlink(missing_ok=True)


def record_usage_event(
    *,
    action: str,
    started_at: float,
    status: str,
    input_count: int = 0,
    output_count: int = 0,
    error_message: str = "",
    details: dict[str, Any] | None = None,
) -> None:
    duration_ms = (time.perf_counter() - started_at) * 1000.0
    event = _build_event(
        action=action,
        status=status,
        duration_ms=duration_ms,
        input_count=input_count,
        output_count=output_count,
        error_message=error_message,
        details=details or {},
    )
    line = json.dumps(event, ensure_ascii=False)

    local_path = Path(os.getenv("PDFAPP_USAGE_LOG_PATH", str(DEFAULT_LOG_PATH)))
    _append_line(local_path, line)

    repo = os.getenv("PDFAPP_LOG_REPO", "")
    path = os.getenv("PDFAPP_LOG_PATH", "")
    token = os.getenv("GITHUB_TOKEN", "")
    branch = os.getenv("PDFAPP_LOG_BRANCH", "main")

    if repo and path and token:
        try:
            append_jsonl_to_github(repo, path, token, branch, line)
            _flush_spool()
        except Exception:
            spool_path = Path(os.getenv("PDFAPP_USAGE_SPOOL_PATH", str(DEFAULT_SPOOL_PATH)))
            _append_line(spool_path, line)

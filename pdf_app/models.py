from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class JobRequest:
    job_type: str
    input_files: list[Path]
    output_dir: Path
    options: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class JobResult:
    success: bool
    message: str
    output_files: list[Path] = field(default_factory=list)
    details: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ProgressEvent:
    step: str
    current: int
    total: int


class PDFApplicationError(Exception):
    """Domain level error for predictable user-facing failures."""

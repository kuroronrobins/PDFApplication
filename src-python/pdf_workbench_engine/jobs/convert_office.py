from __future__ import annotations

from pathlib import Path
from typing import Any

from ..schemas import as_path
from ..services.office_com import convert_to_pdf


def handle(request: dict[str, Any]) -> dict[str, Any]:
    source = as_path(request.get("sourcePath"), "sourcePath")
    session_dir = as_path(request.get("sessionDir"), "sessionDir")
    output_name = request.get("outputName")
    if not isinstance(output_name, str) or not output_name:
        output_name = f"{source.stem}.pdf"

    target = session_dir / "office-cache" / output_name
    converted = convert_to_pdf(source, target)
    return {
        "sourcePath": str(source),
        "cachePath": str(converted),
        "outputPath": str(converted),
        "outputName": converted.name,
        "kind": source.suffix.lower().lstrip("."),
    }

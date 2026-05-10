from __future__ import annotations

from typing import Any

from ..schemas import as_path
from ..services.pdf_document import render_thumbnails


def handle(request: dict[str, Any]) -> dict[str, Any]:
    source = as_path(request.get("sourcePath"), "sourcePath")
    output_dir = as_path(request.get("outputDir"), "outputDir")
    password = request.get("password") if isinstance(request.get("password"), str) else ""
    page_numbers = request.get("pageNumbers")
    if not isinstance(page_numbers, list):
        page_numbers = []
    normalized_pages = [int(page) for page in page_numbers if isinstance(page, int)]
    return {
        "thumbnails": render_thumbnails(
            source,
            output_dir,
            normalized_pages,
            password=password,
        )
    }

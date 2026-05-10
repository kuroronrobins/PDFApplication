from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from .pdf_document import open_fitz_document


def _point_for_position(page_rect: Any, position: str, font_size: float) -> tuple[float, float]:
    margin = 28
    positions = {
        "top-left": (margin, margin),
        "top": (page_rect.width * 0.42, margin),
        "top-right": (page_rect.width - 160, margin),
        "center": (page_rect.width * 0.34, page_rect.height * 0.50),
        "bottom-left": (margin, page_rect.height - margin),
        "bottom": (page_rect.width * 0.42, page_rect.height - margin),
        "bottom-right": (page_rect.width - 160, page_rect.height - margin),
    }
    return positions.get(position, (margin, page_rect.height - margin - font_size))


def _text_for(decoration: dict[str, Any], page_index: int, total: int) -> str:
    text = str(decoration.get("text") or "")
    if decoration.get("kind") == "page-number":
        text = text or "{page} / {total}"
    return text.replace("{page}", str(page_index + 1)).replace("{total}", str(total))


def _applies_to_page(
    decoration: dict[str, Any],
    page_context: dict[str, Any] | None,
    output_index: int | None,
) -> bool:
    if page_context is None:
        return True

    page_id = page_context.get("pageId")
    target = decoration.get("target")
    decoration_page_id = decoration.get("pageId")
    if decoration_page_id:
        return decoration_page_id == page_id
    if target == "selected":
        return bool(page_context.get("selected"))
    if target == "output":
        decoration_output = decoration.get("outputIndex")
        return decoration_output in (None, output_index)
    return True


def apply_decorations(
    input_file: Path,
    output_file: Path,
    decorations: list[dict[str, Any]],
    password: str = "",
    page_contexts: list[dict[str, Any]] | None = None,
    output_index: int | None = None,
) -> Path:
    if not decorations:
        if input_file != output_file:
            output_file.write_bytes(input_file.read_bytes())
        return output_file

    doc = open_fitz_document(input_file, password=password)
    try:
        total = len(doc)
        for page_index, page in enumerate(doc):
            rect = page.rect
            page_context = page_contexts[page_index] if page_contexts and page_index < len(page_contexts) else None
            for decoration in decorations:
                if not _applies_to_page(decoration, page_context, output_index):
                    continue
                text = _text_for(decoration, page_index, total)
                if not text:
                    continue

                kind = decoration.get("kind")
                position = str(decoration.get("position") or "bottom-right")
                font_size = float(decoration.get("fontSize") or (28 if kind == "watermark" else 10))
                opacity = max(0.05, min(1.0, float(decoration.get("opacity") or 1)))
                color_value = 1.0 - (0.8 * opacity)
                color = (color_value, color_value, color_value) if kind == "watermark" else (0.15, 0.22, 0.33)
                point = _point_for_position(rect, position, font_size)

                page.insert_text(point, text, fontsize=font_size, color=color, overlay=True)

        output_file.parent.mkdir(parents=True, exist_ok=True)
        tmp_file = output_file.with_suffix(output_file.suffix + ".decor.tmp")
        doc.save(str(tmp_file), garbage=4, deflate=True)
    finally:
        doc.close()

    os.replace(tmp_file, output_file)
    return output_file

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from .pdf_fonts import PDF_WORKBENCH_FALLBACK_FONT, text_insert_kwargs, text_width
from .pdf_document import _import_fitz, open_fitz_document


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


def _color_from_hex(value: Any, fallback: tuple[float, float, float]) -> tuple[float, float, float]:
    text = str(value or "").strip()
    if text.startswith("#") and len(text) == 7:
        try:
            return tuple(int(text[index : index + 2], 16) / 255 for index in (1, 3, 5))  # type: ignore[return-value]
        except ValueError:
            return fallback
    return fallback


def _watermark_font_size(page_rect: Any, text: str) -> float:
    length = max(6, len(text))
    base = min(page_rect.width, page_rect.height) * 0.11
    return max(18, min(54, base * (12 / length)))


def _text_for(
    decoration: dict[str, Any],
    page_index: int,
    total: int,
    page_context: dict[str, Any] | None = None,
) -> str:
    text = str(decoration.get("text") or "")
    if decoration.get("kind") == "page-number":
        text = text or "{page} / {total}"
    output_page_number = page_index + 1
    output_page_total = total
    if page_context:
        if isinstance(page_context.get("outputPageNumber"), int):
            output_page_number = int(page_context["outputPageNumber"])
        if isinstance(page_context.get("outputPageTotal"), int):
            output_page_total = int(page_context["outputPageTotal"])
    return text.replace("{page}", str(output_page_number)).replace("{total}", str(output_page_total))


def _text_width(text: str, font_size: float) -> float:
    return text_width(text, font_size)


def _insert_text(
    page: Any,
    point: Any,
    text: str,
    font_size: float,
    color: tuple[float, float, float],
    morph: Any | None = None,
) -> None:
    kwargs: dict[str, Any] = {
        "fontsize": font_size,
        "color": color,
        "overlay": True,
        **text_insert_kwargs(),
    }
    if morph is not None:
        kwargs["morph"] = morph

    try:
        page.insert_text(point, text, **kwargs)
        return
    except TypeError:
        if morph is not None:
            kwargs.pop("morph", None)
            try:
                page.insert_text(point, text, **kwargs)
                return
            except Exception:
                pass
    except Exception:
        pass

    fallback_kwargs: dict[str, Any] = {
        "fontsize": font_size,
        "color": color,
        "overlay": True,
        "fontname": PDF_WORKBENCH_FALLBACK_FONT,
    }
    if morph is not None:
        fallback_kwargs["morph"] = morph
    try:
        page.insert_text(point, text, **fallback_kwargs)
        return
    except TypeError:
        if morph is not None:
            fallback_kwargs.pop("morph", None)
            try:
                page.insert_text(point, text, **fallback_kwargs)
                return
            except Exception:
                pass
    except Exception:
        pass

    page.insert_text(point, text, fontsize=font_size, color=color, overlay=True)


def _applies_to_page(
    decoration: dict[str, Any],
    page_context: dict[str, Any] | None,
    output_index: int | None,
) -> bool:
    if page_context is None:
        return True

    page_id = page_context.get("pageId")
    if page_id and page_id in set(decoration.get("excludedPageIds") or []):
        return False
    target = decoration.get("target")
    decoration_page_id = decoration.get("pageId")
    if decoration_page_id:
        return decoration_page_id == page_id
    if target == "file":
        decoration_file_id = decoration.get("fileId")
        if not decoration_file_id:
            return False
        return decoration_file_id == page_context.get("fileId")
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
                text = _text_for(decoration, page_index, total, page_context)
                if not text:
                    continue

                kind = decoration.get("kind")
                position = "center" if kind == "watermark" else str(decoration.get("position") or "bottom-right")
                font_size = (
                    _watermark_font_size(rect, text)
                    if kind == "watermark"
                    else float(decoration.get("fontSize") or 10)
                )
                fallback_color = (0.84, 0.42, 0.42) if kind == "watermark" else (0.21, 0.37, 0.57)
                color = _color_from_hex(decoration.get("color"), fallback_color)
                point = _point_for_position(rect, position, font_size)

                if kind == "watermark":
                    fitz = _import_fitz()
                    text_width = _text_width(text, font_size)
                    center = fitz.Point(rect.width / 2, rect.height / 2)
                    point = fitz.Point(center.x - text_width / 2, center.y)
                    matrix = fitz.Matrix(1, 1).prerotate(-25)
                    _insert_text(page, point, text, font_size, color, morph=(center, matrix))
                    continue

                _insert_text(page, point, text, font_size, color)

        output_file.parent.mkdir(parents=True, exist_ok=True)
        tmp_file = output_file.with_suffix(output_file.suffix + ".decor.tmp")
        doc.save(str(tmp_file), garbage=4, deflate=True)
    finally:
        doc.close()

    os.replace(tmp_file, output_file)
    return output_file

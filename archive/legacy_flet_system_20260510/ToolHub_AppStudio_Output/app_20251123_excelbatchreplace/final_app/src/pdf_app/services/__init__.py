from __future__ import annotations

from importlib import import_module
from typing import Any

_EXPORTS: dict[str, tuple[str, str]] = {
    "merge_pdfs": ("pdf_app.services.pdf_ops", "merge_pdfs"),
    "split_pdf": ("pdf_app.services.pdf_ops", "split_pdf"),
    "reorder_pages": ("pdf_app.services.pdf_ops", "reorder_pages"),
    "convert_files_to_pdf": ("pdf_app.services.convert", "convert_files_to_pdf"),
    "add_header_footer": ("pdf_app.services.header_footer", "add_header_footer"),
    "replace_text_with_overlay": ("pdf_app.services.text_edit", "replace_text_with_overlay"),
    "encrypt_pdf": ("pdf_app.services.business", "encrypt_pdf"),
    "add_watermark_text": ("pdf_app.services.business", "add_watermark_text"),
    "inspect_pdf": ("pdf_app.services.business", "inspect_pdf"),
    "apply_page_plan": ("pdf_app.services.page_workspace", "apply_page_plan"),
    "split_by_markers": ("pdf_app.services.page_workspace", "split_by_markers"),
}

__all__ = list(_EXPORTS.keys())


def __getattr__(name: str) -> Any:
    if name not in _EXPORTS:
        raise AttributeError(name)
    module_name, attr_name = _EXPORTS[name]
    module = import_module(module_name)
    value = getattr(module, attr_name)
    globals()[name] = value
    return value

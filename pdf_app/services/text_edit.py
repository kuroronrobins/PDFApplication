from __future__ import annotations

from pathlib import Path

from pdf_app.models import JobResult, PDFApplicationError
from pdf_app.services.common import open_fitz_document


def replace_text_with_overlay(
    input_file: Path,
    output_file: Path,
    search: str,
    replace: str,
    password: str = "",
) -> JobResult:
    if not search:
        raise PDFApplicationError("検索文字列を入力してください。")

    doc = open_fitz_document(input_file, password=password)
    replacements = 0

    for page in doc:
        areas = page.search_for(search)
        for rect in areas:
            page.add_redact_annot(rect, fill=(1, 1, 1))
        if areas:
            page.apply_redactions()
            for rect in areas:
                page.insert_text((rect.x0, rect.y1 - 2), replace, fontsize=11, color=(0, 0, 0))
            replacements += len(areas)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_file))
    doc.close()

    return JobResult(True, f"{replacements} 箇所の文字列を置換しました。", [output_file], {"replacements": replacements})

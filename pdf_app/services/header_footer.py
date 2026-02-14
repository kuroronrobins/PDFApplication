from __future__ import annotations

from pathlib import Path

from pdf_app.models import JobResult
from pdf_app.services.common import open_fitz_document


def add_header_footer(
    input_file: Path,
    output_file: Path,
    header: str = "",
    footer: str = "",
    add_page_numbers: bool = True,
    password: str = "",
) -> JobResult:
    doc = open_fitz_document(input_file, password=password)
    try:
        for i, page in enumerate(doc, start=1):
            rect = page.rect
            if header:
                page.insert_text((40, 24), header, fontsize=10, color=(0.2, 0.2, 0.2))
            if footer:
                page.insert_text((40, rect.height - 20), footer, fontsize=10, color=(0.2, 0.2, 0.2))
            if add_page_numbers:
                page.insert_text(
                    (rect.width - 70, rect.height - 20),
                    f"{i}/{len(doc)}",
                    fontsize=10,
                    color=(0.2, 0.2, 0.2),
                )

        output_file.parent.mkdir(parents=True, exist_ok=True)
        doc.save(str(output_file))
    finally:
        doc.close()

    return JobResult(True, "ヘッダー/フッター・ページ番号を追加しました。", [output_file])

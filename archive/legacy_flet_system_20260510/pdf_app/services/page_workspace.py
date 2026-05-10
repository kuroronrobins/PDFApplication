from __future__ import annotations

from pathlib import Path

from pypdf import PdfWriter

from pdf_app.models import JobResult, PDFApplicationError
from pdf_app.services.common import open_pdf_reader


def apply_page_plan(
    input_file: Path, page_order: list[int], output_file: Path, password: str = ""
) -> JobResult:
    reader = open_pdf_reader(input_file, password=password)
    total = len(reader.pages)
    if not page_order:
        raise PDFApplicationError("少なくとも1ページは残してください。")

    for page_no in page_order:
        if page_no < 1 or page_no > total:
            raise PDFApplicationError(f"不正なページ番号です: {page_no}")

    writer = PdfWriter()
    for page_no in page_order:
        writer.add_page(reader.pages[page_no - 1])

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with output_file.open("wb") as fp:
        writer.write(fp)

    return JobResult(True, "ページ編集結果を出力しました。", [output_file])


def split_by_markers(
    input_file: Path,
    page_order: list[int],
    split_after_original_pages: set[int],
    output_dir: Path,
    password: str = "",
) -> JobResult:
    reader = open_pdf_reader(input_file, password=password)
    total = len(reader.pages)
    if not page_order:
        raise PDFApplicationError("分割するページがありません。")
    for page_no in page_order:
        if page_no < 1 or page_no > total:
            raise PDFApplicationError(f"不正なページ番号です: {page_no}")

    output_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []
    writer = PdfWriter()
    part = 1

    for i, page_no in enumerate(page_order, start=1):
        writer.add_page(reader.pages[page_no - 1])
        if page_no in split_after_original_pages and i != len(page_order):
            output = output_dir / f"{input_file.stem}_part{part}.pdf"
            with output.open("wb") as fp:
                writer.write(fp)
            outputs.append(output)
            writer = PdfWriter()
            part += 1

    output = output_dir / f"{input_file.stem}_part{part}.pdf"
    with output.open("wb") as fp:
        writer.write(fp)
    outputs.append(output)

    return JobResult(True, f"{len(outputs)}ファイルに分割しました。", outputs)

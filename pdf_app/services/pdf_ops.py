from __future__ import annotations

from io import BytesIO
from pathlib import Path

from pypdf import PdfWriter

from pdf_app.models import JobResult, PDFApplicationError
from pdf_app.services.common import open_pdf_reader


def merge_pdfs(input_files: list[Path], output_file: Path, password: str = "") -> JobResult:
    if len(input_files) < 2:
        raise PDFApplicationError("結合には2つ以上のPDFが必要です。")

    writer = PdfWriter()
    for pdf in input_files:
        reader = open_pdf_reader(pdf, password=password)
        for page in reader.pages:
            writer.add_page(page)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with output_file.open("wb") as fp:
        writer.write(fp)

    return JobResult(True, "PDFを結合しました。", [output_file])


def split_pdf(
    input_file: Path,
    output_dir: Path,
    pages_per_file: int = 1,
    max_size_mb: float | None = None,
    password: str = "",
) -> JobResult:
    if pages_per_file < 1:
        raise PDFApplicationError("分割単位は1以上を指定してください。")
    if max_size_mb is not None and max_size_mb <= 0:
        raise PDFApplicationError("分割サイズ上限は0より大きい値を指定してください。")

    reader = open_pdf_reader(input_file, password=password)
    output_dir.mkdir(parents=True, exist_ok=True)

    if max_size_mb is not None:
        return _split_pdf_by_max_size(input_file, output_dir, reader.pages, max_size_mb)

    outputs: list[Path] = []
    page_index = 0
    part = 1
    total_pages = len(reader.pages)

    while page_index < total_pages:
        writer = PdfWriter()
        for _ in range(pages_per_file):
            if page_index >= total_pages:
                break
            writer.add_page(reader.pages[page_index])
            page_index += 1

        output = output_dir / f"{input_file.stem}_part{part}.pdf"
        with output.open("wb") as fp:
            writer.write(fp)
        outputs.append(output)
        part += 1

    return JobResult(True, f"{len(outputs)}ファイルに分割しました。", outputs)


def _writer_size(writer: PdfWriter) -> int:
    buff = BytesIO()
    writer.write(buff)
    return buff.tell()


def _split_pdf_by_max_size(input_file: Path, output_dir: Path, pages: list, max_size_mb: float) -> JobResult:
    max_bytes = int(max_size_mb * 1024 * 1024)
    outputs: list[Path] = []

    writer = PdfWriter()
    part = 1

    for page in pages:
        candidate = PdfWriter()
        for existing in writer.pages:
            candidate.add_page(existing)
        candidate.add_page(page)

        if len(writer.pages) > 0 and _writer_size(candidate) > max_bytes:
            output = output_dir / f"{input_file.stem}_part{part}.pdf"
            with output.open("wb") as fp:
                writer.write(fp)
            outputs.append(output)
            part += 1

            writer = PdfWriter()
            writer.add_page(page)
        else:
            writer = candidate

    if len(writer.pages) > 0:
        output = output_dir / f"{input_file.stem}_part{part}.pdf"
        with output.open("wb") as fp:
            writer.write(fp)
        outputs.append(output)

    return JobResult(
        True,
        f"{len(outputs)}ファイルに分割しました（上限: {max_size_mb}MB）。",
        outputs,
        {"max_size_mb": max_size_mb},
    )


def reorder_pages(input_file: Path, order: list[int], output_file: Path, password: str = "") -> JobResult:
    reader = open_pdf_reader(input_file, password=password)
    page_count = len(reader.pages)

    if sorted(order) != list(range(1, page_count + 1)):
        raise PDFApplicationError(f"ページ順は1..{page_count}を重複なく指定してください。")

    writer = PdfWriter()
    for index in order:
        writer.add_page(reader.pages[index - 1])

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with output_file.open("wb") as fp:
        writer.write(fp)

    return JobResult(True, "ページを入れ替えました。", [output_file])

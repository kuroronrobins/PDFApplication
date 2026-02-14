from __future__ import annotations

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


def split_pdf(input_file: Path, output_dir: Path, password: str = "") -> JobResult:
    reader = open_pdf_reader(input_file, password=password)
    output_dir.mkdir(parents=True, exist_ok=True)

    outputs: list[Path] = []
    for i, page in enumerate(reader.pages, start=1):
        writer = PdfWriter()
        writer.add_page(page)
        output = output_dir / f"{input_file.stem}_p{i}.pdf"
        with output.open("wb") as fp:
            writer.write(fp)
        outputs.append(output)

    return JobResult(True, f"{len(outputs)}ページに分割しました。", outputs)


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

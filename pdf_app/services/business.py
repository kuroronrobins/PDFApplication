from __future__ import annotations

from pathlib import Path

from pypdf import PdfWriter

from pdf_app.models import JobResult
from pdf_app.services.common import open_fitz_document, open_pdf_reader


def encrypt_pdf(input_file: Path, output_file: Path, password: str, open_password: str = "") -> JobResult:
    reader = open_pdf_reader(input_file, password=open_password)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)

    writer.encrypt(password)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with output_file.open("wb") as fp:
        writer.write(fp)

    return JobResult(True, "PDFにパスワードを設定しました。", [output_file])


def add_watermark_text(
    input_file: Path, output_file: Path, watermark: str, password: str = ""
) -> JobResult:
    doc = open_fitz_document(input_file, password=password)
    try:
        for page in doc:
            rect = page.rect
            page.insert_text(
                (rect.width * 0.25, rect.height * 0.5),
                watermark,
                fontsize=32,
                # PyMuPDF insert_text only supports right-angle rotation values
                # (0, 90, 180, 270).
                rotate=0,
                color=(0.7, 0.7, 0.7),
                overlay=True,
            )
        output_file.parent.mkdir(parents=True, exist_ok=True)
        doc.save(str(output_file))
    finally:
        doc.close()
    return JobResult(True, "透かしを追加しました。", [output_file])


def inspect_pdf(input_file: Path, password: str = "") -> JobResult:
    reader = open_pdf_reader(input_file, password=password)
    details = {
        "pages": len(reader.pages),
        "encrypted": reader.is_encrypted,
        "metadata": dict(reader.metadata or {}),
    }
    return JobResult(True, "PDF情報を取得しました。", [], details)

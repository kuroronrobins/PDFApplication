from __future__ import annotations

from pathlib import Path

import fitz
from pypdf import PdfReader

from pdf_app.models import PDFApplicationError


def ensure_input_file(path: Path) -> None:
    if not path.exists():
        raise PDFApplicationError(f"入力ファイルが存在しません: {path}")
    if not path.is_file():
        raise PDFApplicationError(f"入力パスがファイルではありません: {path}")


def open_pdf_reader(path: Path, password: str = "") -> PdfReader:
    ensure_input_file(path)
    reader = PdfReader(str(path))
    if reader.is_encrypted:
        if not password:
            raise PDFApplicationError(
                f"PDFは暗号化されています。パスワードを入力してください: {path.name}"
            )
        status = reader.decrypt(password)
        if status == 0:
            raise PDFApplicationError(f"PDFのパスワードが正しくありません: {path.name}")
    return reader


def open_fitz_document(path: Path, password: str = "") -> fitz.Document:
    ensure_input_file(path)
    doc = fitz.open(str(path))
    if doc.needs_pass:
        if not password:
            doc.close()
            raise PDFApplicationError(
                f"PDFは暗号化されています。パスワードを入力してください: {path.name}"
            )
        if not doc.authenticate(password):
            doc.close()
            raise PDFApplicationError(f"PDFのパスワードが正しくありません: {path.name}")
    return doc

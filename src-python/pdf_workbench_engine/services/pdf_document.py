from __future__ import annotations

from pathlib import Path
from typing import Any

from ..errors import EngineError, dependency_missing


def _import_pypdf() -> Any:
    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError as exc:  # pragma: no cover - depends on local env
        raise dependency_missing("pypdf", "PDFの読み書き") from exc
    return PdfReader, PdfWriter


def _import_fitz() -> Any:
    try:
        import fitz
    except ImportError as exc:  # pragma: no cover - depends on local env
        raise dependency_missing("PyMuPDF", "PDFの描画/検索") from exc
    return fitz


def ensure_input_file(path: Path) -> None:
    if not path.exists():
        raise EngineError("input_not_found", f"入力ファイルが存在しません: {path}", target=str(path))
    if not path.is_file():
        raise EngineError("input_not_file", f"入力パスがファイルではありません: {path}", target=str(path))


def open_pdf_reader(path: Path, password: str = "") -> Any:
    ensure_input_file(path)
    PdfReader, _ = _import_pypdf()
    reader = PdfReader(str(path))
    if reader.is_encrypted:
        if not password:
            raise EngineError(
                "pdf_password_required",
                f"PDFは暗号化されています。パスワードを入力してください: {path.name}",
                target=str(path),
            )
        status = reader.decrypt(password)
        if status == 0:
            raise EngineError("pdf_password_invalid", f"PDFのパスワードが正しくありません: {path.name}", target=str(path))
    return reader


def open_fitz_document(path: Path, password: str = "") -> Any:
    ensure_input_file(path)
    fitz = _import_fitz()
    doc = fitz.open(str(path))
    if doc.needs_pass:
        if not password:
            doc.close()
            raise EngineError(
                "pdf_password_required",
                f"PDFは暗号化されています。パスワードを入力してください: {path.name}",
                target=str(path),
            )
        if not doc.authenticate(password):
            doc.close()
            raise EngineError("pdf_password_invalid", f"PDFのパスワードが正しくありません: {path.name}", target=str(path))
    return doc


def inspect_pdf(input_file: Path, password: str = "") -> dict[str, Any]:
    reader = open_pdf_reader(input_file, password=password)
    metadata = {}
    for key, value in dict(reader.metadata or {}).items():
        metadata[str(key).lstrip("/")] = str(value)

    return {
        "path": str(input_file),
        "pageCount": len(reader.pages),
        "encrypted": reader.is_encrypted,
        "metadata": metadata,
    }


def render_thumbnail(
    input_file: Path,
    output_dir: Path,
    page_number: int,
    password: str = "",
    zoom: float = 0.22,
) -> dict[str, Any]:
    if page_number < 1:
        raise EngineError("invalid_page", "pageNumber は1以上を指定してください。", target=str(input_file))

    doc = open_fitz_document(input_file, password=password)
    try:
        if page_number > len(doc):
            raise EngineError(
                "invalid_page",
                f"ページ番号がPDFのページ数を超えています: {page_number}",
                target=str(input_file),
            )
        page = doc[page_number - 1]
        fitz = _import_fitz()
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        output_dir.mkdir(parents=True, exist_ok=True)
        out_path = output_dir / f"{input_file.stem}-p{page_number}.png"
        pix.save(str(out_path))
        return {
            "thumbnailPath": str(out_path),
            "pageNumber": page_number,
            "width": pix.width,
            "height": pix.height,
        }
    finally:
        doc.close()


def render_thumbnails(
    input_file: Path,
    output_dir: Path,
    page_numbers: list[int],
    password: str = "",
    zoom: float = 0.22,
) -> list[dict[str, Any]]:
    if not page_numbers:
        return []

    doc = open_fitz_document(input_file, password=password)
    try:
        fitz = _import_fitz()
        output_dir.mkdir(parents=True, exist_ok=True)
        thumbnails: list[dict[str, Any]] = []
        for page_number in page_numbers:
            if page_number < 1:
                raise EngineError("invalid_page", "pageNumber は1以上を指定してください。", target=str(input_file))
            if page_number > len(doc):
                raise EngineError(
                    "invalid_page",
                    f"ページ番号がPDFのページ数を超えています: {page_number}",
                    target=str(input_file),
                )
            page = doc[page_number - 1]
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            out_path = output_dir / f"{input_file.stem}-p{page_number}.png"
            pix.save(str(out_path))
            thumbnails.append(
                {
                    "thumbnailPath": str(out_path),
                    "pageNumber": page_number,
                    "width": pix.width,
                    "height": pix.height,
                }
            )
        return thumbnails
    finally:
        doc.close()

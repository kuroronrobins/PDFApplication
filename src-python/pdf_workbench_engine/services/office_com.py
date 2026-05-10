from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from ..errors import EngineError, dependency_missing
from .pdf_document import ensure_input_file


SUPPORTED_OFFICE = {
    ".doc",
    ".docx",
    ".docm",
    ".xls",
    ".xlsx",
    ".xlsm",
    ".xlsb",
    ".ppt",
    ".pptx",
    ".pptm",
    ".pdf",
}


def _import_office_modules() -> tuple[Any, Any]:
    try:
        import pythoncom
        import win32com.client
    except ImportError as exc:  # pragma: no cover - depends on Windows/Office env
        raise dependency_missing("pywin32", "Microsoft Office COM変換") from exc
    return pythoncom, win32com.client


def _convert_word(src: Path, out_pdf: Path) -> None:
    pythoncom, win32com_client = _import_office_modules()
    pythoncom.CoInitialize()
    app = None
    doc = None
    try:
        app = win32com_client.DispatchEx("Word.Application")
        app.Visible = False
        app.DisplayAlerts = 0
        doc = app.Documents.Open(str(src.resolve()), ReadOnly=True)
        doc.ExportAsFixedFormat(str(out_pdf.resolve()), 17)
    except Exception as exc:
        raise EngineError("office_com_failed", f"Word変換に失敗しました: {src.name}", target=str(src), detail=str(exc)) from exc
    finally:
        if doc is not None:
            doc.Close(False)
        if app is not None:
            app.Quit()
        pythoncom.CoUninitialize()


def _convert_excel(src: Path, out_pdf: Path) -> None:
    pythoncom, win32com_client = _import_office_modules()
    pythoncom.CoInitialize()
    app = None
    workbook = None
    try:
        app = win32com_client.DispatchEx("Excel.Application")
        app.Visible = False
        app.DisplayAlerts = False
        workbook = app.Workbooks.Open(str(src.resolve()), ReadOnly=True)
        workbook.ExportAsFixedFormat(0, str(out_pdf.resolve()))
    except Exception as exc:
        raise EngineError("office_com_failed", f"Excel変換に失敗しました: {src.name}", target=str(src), detail=str(exc)) from exc
    finally:
        if workbook is not None:
            workbook.Close(False)
        if app is not None:
            app.Quit()
        pythoncom.CoUninitialize()


def _convert_powerpoint(src: Path, out_pdf: Path) -> None:
    pythoncom, win32com_client = _import_office_modules()
    pythoncom.CoInitialize()
    app = None
    presentation = None
    try:
        app = win32com_client.DispatchEx("PowerPoint.Application")
        presentation = app.Presentations.Open(
            str(src.resolve()),
            ReadOnly=True,
            Untitled=False,
            WithWindow=False,
        )
        presentation.SaveAs(str(out_pdf.resolve()), 32)
    except Exception as exc:
        raise EngineError(
            "office_com_failed",
            f"PowerPoint変換に失敗しました: {src.name}",
            target=str(src),
            detail=str(exc),
        ) from exc
    finally:
        if presentation is not None:
            presentation.Close()
        if app is not None:
            app.Quit()
        pythoncom.CoUninitialize()


def convert_to_pdf(src: Path, out_pdf: Path) -> Path:
    ensure_input_file(src)
    suffix = src.suffix.lower()
    if suffix not in SUPPORTED_OFFICE:
        raise EngineError("unsupported_format", f"未対応形式です: {src.name}", target=str(src))

    out_pdf.parent.mkdir(parents=True, exist_ok=True)
    if suffix == ".pdf":
        shutil.copy2(src, out_pdf)
        return out_pdf
    if suffix in {".doc", ".docx", ".docm"}:
        _convert_word(src, out_pdf)
    elif suffix in {".xls", ".xlsx", ".xlsm", ".xlsb"}:
        _convert_excel(src, out_pdf)
    elif suffix in {".ppt", ".pptx", ".pptm"}:
        _convert_powerpoint(src, out_pdf)

    if not out_pdf.exists():
        raise EngineError("office_output_missing", f"変換結果のPDFが見つかりませんでした: {out_pdf.name}", target=str(src))
    return out_pdf

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from pdf_app.models import JobResult, PDFApplicationError
from pdf_app.services.common import ensure_input_file
from pdf_app.services.pdf_ops import merge_pdfs

SUPPORTED_OFFICE = {".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".pdf"}


def _import_office_modules() -> tuple[Any, Any]:
    try:
        import pythoncom
        import win32com.client
    except ImportError as exc:
        raise PDFApplicationError(
            "Office変換の実行に必要な依存関係が見つかりません。`pip install pywin32` を実行してください。"
        ) from exc
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
        # 17 = wdExportFormatPDF
        doc.ExportAsFixedFormat(str(out_pdf.resolve()), 17)
    except Exception as exc:
        raise PDFApplicationError(f"Word変換に失敗しました: {src.name}\n{exc}") from exc
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
        # 0 = xlTypePDF
        workbook.ExportAsFixedFormat(0, str(out_pdf.resolve()))
    except Exception as exc:
        raise PDFApplicationError(f"Excel変換に失敗しました: {src.name}\n{exc}") from exc
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
        # 32 = ppSaveAsPDF
        presentation.SaveAs(str(out_pdf.resolve()), 32)
    except Exception as exc:
        raise PDFApplicationError(f"PowerPoint変換に失敗しました: {src.name}\n{exc}") from exc
    finally:
        if presentation is not None:
            presentation.Close()
        if app is not None:
            app.Quit()
        pythoncom.CoUninitialize()


def _convert_office_file(src: Path, out_pdf: Path) -> None:
    suffix = src.suffix.lower()
    if suffix in {".doc", ".docx"}:
        _convert_word(src, out_pdf)
        return
    if suffix in {".xls", ".xlsx"}:
        _convert_excel(src, out_pdf)
        return
    if suffix in {".ppt", ".pptx"}:
        _convert_powerpoint(src, out_pdf)
        return
    raise PDFApplicationError(f"未対応形式です: {src.name}")


def convert_files_to_pdf(
    input_files: list[Path],
    output_dir: Path,
    merge: bool = False,
    merged_output_file: Path | None = None,
) -> JobResult:
    if not input_files:
        raise PDFApplicationError("入力ファイルを指定してください。")

    output_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []

    for src in input_files:
        ensure_input_file(src)
        suffix = src.suffix.lower()
        if suffix not in SUPPORTED_OFFICE:
            raise PDFApplicationError(f"未対応形式です: {src.name}")

        if suffix == ".pdf":
            target = output_dir / src.name
            shutil.copy2(src, target)
            outputs.append(target)
            continue

        converted = output_dir / f"{src.stem}.pdf"
        _convert_office_file(src, converted)
        if not converted.exists():
            raise PDFApplicationError(
                f"変換結果のPDFが見つかりませんでした: {converted.name}"
            )
        outputs.append(converted)

    if merge and len(outputs) > 1:
        merged_file = merged_output_file or (output_dir / "merged_converted.pdf")
        merge_result = merge_pdfs(outputs, merged_file)
        return JobResult(True, "変換して結合しました。", merge_result.output_files, {"converted": outputs})

    return JobResult(True, "PDFへ変換しました。", outputs)

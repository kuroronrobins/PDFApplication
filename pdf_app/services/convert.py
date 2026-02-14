from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from pdf_app.models import JobResult, PDFApplicationError
from pdf_app.services.common import ensure_input_file
from pdf_app.services.pdf_ops import merge_pdfs

SUPPORTED_OFFICE = {".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".pdf"}


def convert_files_to_pdf(
    input_files: list[Path], output_dir: Path, merge: bool = False
) -> JobResult:
    if not input_files:
        raise PDFApplicationError("入力ファイルを指定してください。")

    output_dir.mkdir(parents=True, exist_ok=True)
    soffice = shutil.which("soffice")
    outputs: list[Path] = []

    for src in input_files:
        ensure_input_file(src)
        suffix = src.suffix.lower()
        if suffix not in SUPPORTED_OFFICE:
            raise PDFApplicationError(f"未対応形式です: {src.name}")

        if suffix == ".pdf":
            target = output_dir / src.name
            target.write_bytes(src.read_bytes())
            outputs.append(target)
            continue

        if not soffice:
            raise PDFApplicationError("LibreOffice(soffice) が見つからないためOffice変換を実行できません。")

        cmd = [
            soffice,
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            str(output_dir),
            str(src),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise PDFApplicationError(f"変換失敗: {src.name}\n{result.stderr.strip() or result.stdout.strip()}")
        outputs.append(output_dir / f"{src.stem}.pdf")

    if merge and len(outputs) > 1:
        merged_file = output_dir / "merged_converted.pdf"
        merge_result = merge_pdfs(outputs, merged_file)
        return JobResult(True, "変換して結合しました。", merge_result.output_files, {"converted": outputs})

    return JobResult(True, "PDFへ変換しました。", outputs)

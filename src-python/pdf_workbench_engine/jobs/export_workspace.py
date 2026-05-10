from __future__ import annotations

from pathlib import Path
from typing import Any

from ..errors import EngineError
from ..schemas import as_path
from ..services.pdf_decorations import apply_decorations
from ..services.pdf_pages import write_page_sequence
from ..services.pdf_security import encrypt_pdf
from ..services.text_overlay import replace_text_with_overlay


def _emit_progress(
    emit: Any,
    job_id: str | None,
    step: str,
    progress: int,
    message: str,
) -> None:
    if callable(emit):
        emit(
            {
                "type": "progress",
                "jobId": job_id,
                "step": step,
                "progress": max(0, min(99, progress)),
                "message": message,
            }
        )


def _file_source(file_info: dict[str, Any]) -> str:
    source = file_info.get("cachePath") or file_info.get("sourcePath")
    if not isinstance(source, str) or not source:
        raise EngineError("missing_source", "ファイルのPDFソースが見つかりません。", target=str(file_info.get("name") or "unknown"))
    if source.startswith("sample://") or source.startswith("session://"):
        raise EngineError("virtual_source", "サンプル/仮想ファイルは実出力できません。", target=source)
    return source


def _build_groups(workspace: dict[str, Any]) -> list[list[dict[str, Any]]]:
    files = workspace.get("files")
    pages_by_file = workspace.get("pagesByFile")
    if not isinstance(files, list) or not isinstance(pages_by_file, dict):
        raise EngineError("invalid_workspace", "workspace.files と workspace.pagesByFile が必要です。")

    file_map = {
        file_info.get("id"): file_info
        for file_info in files
        if isinstance(file_info, dict) and isinstance(file_info.get("id"), str)
    }
    groups: list[list[dict[str, Any]]] = [[]]
    for file_info in files:
        if not isinstance(file_info, dict) or file_info.get("excluded"):
            continue

        file_id = file_info.get("id")
        if not isinstance(file_id, str):
            continue
        pages = pages_by_file.get(file_id) or []
        if not isinstance(pages, list):
            continue

        for page in pages:
            if not isinstance(page, dict) or page.get("excluded"):
                continue
            source_file_id = page.get("sourceFileId") if isinstance(page.get("sourceFileId"), str) else file_id
            source_file_info = file_map.get(source_file_id) or file_info
            if not isinstance(source_file_info, dict):
                source_file_info = file_info
            source = _file_source(source_file_info)
            page_number = page.get("originalPageNumber") or page.get("pageNumber")
            if not isinstance(page_number, int):
                raise EngineError("invalid_page", "ページ番号が不正です。", target=str(file_info.get("name") or file_id))

            groups[-1].append(
                {
                    "sourcePath": source,
                    "pageNumber": page_number,
                    "pageId": page.get("id"),
                    "fileId": file_id,
                    "sourceFileId": source_file_id,
                    "selected": bool(page.get("selected")),
                }
            )
            if page.get("splitAfter"):
                groups.append([])

    groups = [group for group in groups if group]
    if not groups:
        raise EngineError("empty_output", "出力対象ページがありません。")
    return groups


def _apply_post_processing(
    output_file: Path,
    workspace: dict[str, Any],
    output_dir: Path,
    index: int,
    group: list[dict[str, Any]],
    emit: Any = None,
    job_id: str | None = None,
    base_progress: int = 55,
) -> Path:
    current = output_file
    decorations = workspace.get("decorations")
    if isinstance(decorations, list) and decorations:
        _emit_progress(emit, job_id, "装飾", base_progress, f"出力{index}へ装飾を反映しています。")
        decorated = output_dir / f".decorated-{index:03}.pdf"
        current = apply_decorations(
            current,
            decorated,
            decorations,
            page_contexts=group,
            output_index=index,
        )

    search_replace = workspace.get("searchReplace")
    search = ""
    replacement = ""
    if isinstance(search_replace, dict):
        search = str(search_replace.get("search") or search_replace.get("query") or "").strip()
        replacement = str(search_replace.get("replacement") or "")
    if search:
        _emit_progress(emit, job_id, "検索置換", base_progress + 12, f"出力{index}の検索置換を反映しています。")
        replaced = output_dir / f".replaced-{index:03}.pdf"
        replace_text_with_overlay(
            current,
            replaced,
            search,
            replacement,
        )
        current = replaced

    security = workspace.get("security")
    encrypt_output = isinstance(security, dict) and bool(security.get("encryptOutput") or security.get("outputEncrypted"))
    if isinstance(security, dict) and encrypt_output:
        _emit_progress(emit, job_id, "暗号化", base_progress + 24, f"出力{index}を暗号化しています。")
        password = str(security.get("userPassword") or security.get("outputPassword") or security.get("ownerPassword") or "")
        if not password:
            raise EngineError("missing_password", "暗号化にはパスワードが必要です。")
        encrypted = output_dir / f".encrypted-{index:03}.pdf"
        current = encrypt_pdf(
            current,
            encrypted,
            user_password=password,
            owner_password=str(security.get("ownerPassword") or password),
        )

    final_file = output_dir / f"result_{index:03}.pdf"
    if current != final_file:
        final_file.write_bytes(current.read_bytes())
    return final_file


def handle(request: dict[str, Any]) -> dict[str, Any]:
    output_dir = as_path(request.get("outputDir"), "outputDir")
    workspace = request.get("workspace")
    if not isinstance(workspace, dict):
        raise EngineError("invalid_workspace", "workspace を指定してください。")

    emit = request.get("_emit")
    job_id = request.get("jobId") if isinstance(request.get("jobId"), str) else None
    output_dir.mkdir(parents=True, exist_ok=True)
    password_map = request.get("passwordMap") if isinstance(request.get("passwordMap"), dict) else {}
    _emit_progress(emit, job_id, "PDF解析", 8, "ワークスペースから出力対象ページを解析しています。")
    groups = _build_groups(workspace)
    _emit_progress(emit, job_id, "分割", 16, f"{len(groups)}個の出力PDFへ分割計画を作成しました。")

    outputs: list[str] = []
    for index, group in enumerate(groups, start=1):
        group_progress = 20 + int(((index - 1) / max(1, len(groups))) * 38)
        _emit_progress(
            emit,
            job_id,
            "結合",
            group_progress,
            f"出力{index}/{len(groups)}のページ列を作成しています。",
        )
        raw_output = output_dir / f".pages-{index:03}.pdf"
        write_page_sequence(group, raw_output, password_map={str(Path(key).resolve()): str(value) for key, value in password_map.items()})
        final_file = _apply_post_processing(
            raw_output,
            workspace,
            output_dir,
            index,
            group,
            emit=emit,
            job_id=job_id,
            base_progress=58 + int((index / max(1, len(groups))) * 18),
        )
        outputs.append(str(final_file))

    _emit_progress(emit, job_id, "保存", 96, "出力PDFを保存しました。")
    return {
        "outputFiles": outputs,
        "outputCount": len(outputs),
    }

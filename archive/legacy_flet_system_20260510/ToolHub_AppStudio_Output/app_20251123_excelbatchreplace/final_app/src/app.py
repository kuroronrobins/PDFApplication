from __future__ import annotations

import base64
import json
import os
import socket
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import fitz
import flet as ft
from pypdf import PdfReader

from pdf_app.models import PDFApplicationError
from pdf_app.services import (
    add_header_footer,
    add_watermark_text,
    apply_page_plan,
    convert_files_to_pdf,
    encrypt_pdf,
    inspect_pdf,
    merge_pdfs,
    reorder_pages,
    replace_text_with_overlay,
    split_by_markers,
    split_pdf,
)
from pdf_app.services.common import open_fitz_document
from pdf_app.services.usage_log import BASELINE_SECONDS, record_usage_event

if not hasattr(ft, "colors"):
    ft.colors = ft.Colors  # type: ignore[attr-defined]
if not hasattr(ft, "icons"):
    ft.icons = ft.Icons  # type: ignore[attr-defined]


ACTION_DISPLAY_NAMES: dict[str, str] = {
    "merge": "PDF結合",
    "split": "PDF分割",
    "convert": "Office/PDF変換",
    "reorder": "ページ入れ替え",
    "header_footer": "ヘッダー/フッター",
    "text_edit": "文字置換",
    "watermark": "透かし追加",
    "encrypt": "パスワード設定",
    "inspect": "PDF情報表示",
    "workspace_load": "ページ読み込み",
    "workspace_export": "編集結果出力",
    "workspace_split": "ワークスペース分割",
}


@dataclass
class PageTileState:
    original_page: int
    thumbnail_b64: str
    deleted: bool = False
    split_after: bool = False


@dataclass
class InputFileItem:
    item_id: int
    path: Path


def _parse_paths(raw: str) -> list[Path]:
    return [Path(x.strip()) for x in raw.splitlines() if x.strip()]


def _parse_order(raw: str) -> list[int]:
    try:
        return [int(x.strip()) for x in raw.split(",") if x.strip()]
    except ValueError as exc:
        raise PDFApplicationError("ページ順はカンマ区切りの数字で指定してください。") from exc


def _parse_positive_int(raw: str, *, field_name: str) -> int:
    try:
        value = int(raw.strip())
    except ValueError as exc:
        raise PDFApplicationError(f"{field_name}は整数で指定してください。") from exc
    if value < 1:
        raise PDFApplicationError(f"{field_name}は1以上を指定してください。")
    return value


def _parse_positive_float(raw: str, *, field_name: str) -> float:
    try:
        value = float(raw.strip())
    except ValueError as exc:
        raise PDFApplicationError(f"{field_name}は数値で指定してください。") from exc
    if value <= 0:
        raise PDFApplicationError(f"{field_name}は0より大きい値を指定してください。")
    return value


def _show_result(page: ft.Page, msg: str, error: bool = False) -> None:
    color = ft.colors.RED_600 if error else ft.colors.GREEN_700
    page.snack_bar = ft.SnackBar(ft.Text(msg, color=color), open=True)
    page.update()


def _make_thumbnail(doc_page: fitz.Page, zoom: float = 0.18) -> str:
    pix = doc_page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
    return base64.b64encode(pix.tobytes("png")).decode("utf-8")


def _serialize_usage_details(details: dict[str, Any]) -> dict[str, Any]:
    def _default(value: Any) -> str:
        return str(value)

    return json.loads(json.dumps(details, ensure_ascii=False, default=_default))


def main(page: ft.Page) -> None:
    page.title = "PDF統合アプリケーション"
    page.theme_mode = ft.ThemeMode.LIGHT
    page.padding = 16
    page.scroll = ft.ScrollMode.AUTO

    output_dir = ft.TextField(label="出力フォルダ", value="./output")
    output_name = ft.TextField(
        label="出力ファイル名",
        value="result.pdf",
        helper_text="1ファイル出力時に使用します。",
    )

    reorder_order = ft.TextField(label="ページ順（例: 2,1,3）", value="1,2")
    header_text = ft.TextField(label="ヘッダー")
    footer_text = ft.TextField(label="フッター")
    search_text = ft.TextField(label="検索文字列")
    replace_text = ft.TextField(label="置換文字列")
    watermark_text = ft.TextField(label="透かし文字", value="CONFIDENTIAL")
    encrypt_password = ft.TextField(label="設定するパスワード", password=True, can_reveal_password=True)
    merge_after_convert = ft.Checkbox(label="変換後に結合", value=False)
    split_mode = ft.Dropdown(
        label="分割モード",
        value="pages",
        options=[
            ft.dropdown.Option("pages", "ページ数で分割"),
            ft.dropdown.Option("size", "ファイルサイズで分割"),
        ],
    )
    split_unit = ft.TextField(
        label="分割単位（Nページごと）",
        value="1",
        helper_text="例: 10",
        keyboard_type=ft.KeyboardType.NUMBER,
    )
    split_max_size_mb = ft.TextField(
        label="分割サイズ上限（MB）",
        value="",
        helper_text="例: 2.5",
        keyboard_type=ft.KeyboardType.NUMBER,
    )
    split_mode_hint = ft.Text(size=11, color=ft.colors.BLUE_GREY_500)

    inspect_result = ft.Text(selectable=True)
    workspace_hint = ft.Text("PDFを読み込むとタイルが表示されます。", color=ft.colors.BLUE_GREY_600)

    workspace_tiles: list[PageTileState] = []
    tile_scale_slider = ft.Slider(
        min=60,
        max=180,
        divisions=12,
        value=100,
        label="{value}%",
        expand=1,
    )
    tile_scale_label = ft.Text("タイルサイズ: 100%", size=12, color=ft.colors.BLUE_GREY_700)
    workspace_grid = ft.GridView(
        controls=[],
        height=620,
        spacing=12,
        run_spacing=12,
        max_extent=220,
        child_aspect_ratio=0.65,
        padding=8,
    )

    progress_title = ft.Text("実行状況: 待機中", weight=ft.FontWeight.BOLD)
    progress_detail = ft.Text("開始前", size=11, color=ft.colors.BLUE_GREY_600)
    progress_percent = ft.Text("0%", weight=ft.FontWeight.BOLD)
    progress_bar = ft.ProgressBar(value=0.0, bar_height=10, color=ft.colors.BLUE_600, bgcolor=ft.colors.BLUE_GREY_100, expand=1)

    input_file_items: list[InputFileItem] = []
    selected_input_ids: set[int] = set()
    input_selection_anchor_id: int | None = None
    selected_workspace_pages: set[int] = set()
    workspace_selection_anchor_page: int | None = None
    active_selection_scope = {"value": "input"}
    pdf_password_cache: dict[str, str] = {}
    next_input_item_id = 1
    key_state = {"ctrl": False, "shift": False}
    input_files_list = ft.ReorderableListView(
        height=220,
        controls=[],
        show_default_drag_handles=True,
    )

    def _safe_page_update() -> None:
        try:
            page.update()
        except Exception:
            pass

    def _print_console(action: str, message: str) -> None:
        now = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now}] [{action}] {message}", flush=True)

    def _resolve_estimated_seconds(action: str, input_count: int = 1) -> float:
        override = os.environ.get(f"PDFAPP_BASELINE_{action.upper()}", "").strip()
        base_seconds: float | None = None
        if override:
            try:
                base_seconds = float(override)
            except ValueError:
                _print_console(action, f"invalid baseline override: {override}")
        if base_seconds is None:
            base_seconds = BASELINE_SECONDS.get(action)
        if base_seconds is None:
            base_seconds = 20.0
        if action in {"merge", "convert"} and input_count > 1:
            base_seconds *= max(1.0, input_count / 2.0)
        return max(2.0, base_seconds)

    def _execute_with_progress(action: str, input_count: int, task: Callable[[], Any]) -> Any:
        label = ACTION_DISPLAY_NAMES.get(action, action)
        estimated = _resolve_estimated_seconds(action, input_count)
        progress_title.value = f"実行状況: {label} を実行中"
        progress_detail.value = f"見積り {estimated:.1f}秒で進捗表示中"
        progress_percent.value = "0%"
        progress_bar.value = 0.0
        progress_bar.color = ft.colors.BLUE_600
        _safe_page_update()
        _print_console(action, f"START (estimated {estimated:.1f}s, inputs={input_count})")

        stop_event = threading.Event()

        def _ticker() -> None:
            started = time.perf_counter()
            last_bucket = -1
            while not stop_event.wait(0.25):
                ratio = min(0.95, (time.perf_counter() - started) / estimated)
                progress_bar.value = ratio
                progress_percent.value = f"{int(ratio * 100)}%"
                progress_detail.value = f"処理中... {int(ratio * 100)}%（見積り）"
                bucket = int(ratio * 100) // 10
                if bucket > last_bucket:
                    last_bucket = bucket
                    _print_console(action, f"RUNNING {int(ratio * 100)}%")
                _safe_page_update()

        ticker = threading.Thread(target=_ticker, daemon=True)
        ticker.start()
        started_at = time.perf_counter()
        try:
            result = task()
            elapsed = time.perf_counter() - started_at
            progress_bar.value = 1.0
            progress_bar.color = ft.colors.GREEN_700
            progress_percent.value = "100%"
            progress_title.value = f"実行状況: {label} 完了"
            progress_detail.value = f"完了 {elapsed:.2f}秒"
            _safe_page_update()
            _print_console(action, f"DONE ({elapsed:.2f}s)")
            return result
        except Exception as exc:
            elapsed = time.perf_counter() - started_at
            progress_bar.color = ft.colors.RED_600
            progress_title.value = f"実行状況: {label} エラー"
            progress_detail.value = f"失敗 {elapsed:.2f}秒: {exc}"
            _safe_page_update()
            _print_console(action, f"ERROR ({elapsed:.2f}s): {exc}")
            raise
        finally:
            stop_event.set()
            ticker.join(timeout=0.6)

    def _path_key(path: Path) -> str:
        try:
            return str(path.resolve())
        except Exception:
            return str(path)

    def _is_pdf_encrypted(path: Path) -> bool:
        reader = PdfReader(str(path))
        return bool(reader.is_encrypted)

    def _is_valid_pdf_password(path: Path, password: str) -> bool:
        reader = PdfReader(str(path))
        if not reader.is_encrypted:
            return True
        if not password:
            return False
        return reader.decrypt(password) != 0

    def _get_pdf_password(path: Path) -> str:
        return pdf_password_cache.get(_path_key(path), "")

    def _ensure_pdf_passwords(
        paths: list[Path],
        on_ready: Callable[[], None],
        on_cancel: Callable[[], None] | None = None,
    ) -> None:
        targets: list[Path] = []
        seen: set[str] = set()
        for src in paths:
            if src.suffix.lower() != ".pdf":
                continue
            key = _path_key(src)
            if key in seen:
                continue
            seen.add(key)
            targets.append(src)

        def _step(index: int) -> None:
            if index >= len(targets):
                on_ready()
                return

            target = targets[index]
            target_key = _path_key(target)
            try:
                encrypted = _is_pdf_encrypted(target)
            except Exception as exc:
                _show_result(page, str(exc), error=True)
                if on_cancel:
                    on_cancel()
                return

            if not encrypted:
                _step(index + 1)
                return

            cached = pdf_password_cache.get(target_key, "")
            if cached and _is_valid_pdf_password(target, cached):
                _step(index + 1)
                return

            password_input = ft.TextField(
                label=f"{target.name} のパスワード",
                password=True,
                can_reveal_password=True,
                autofocus=True,
                on_submit=lambda _: submit_password(None),
            )
            password_error = ft.Text(size=12, color=ft.colors.RED_600)

            def close_dialog() -> None:
                if page.dialog is not None:
                    page.dialog.open = False
                    page.update()

            def cancel_password(_: ft.ControlEvent | None) -> None:
                close_dialog()
                if on_cancel:
                    on_cancel()

            def submit_password(_: ft.ControlEvent | None) -> None:
                value = (password_input.value or "").strip()
                if not value:
                    password_error.value = "パスワードを入力してください。"
                    page.update()
                    return
                if not _is_valid_pdf_password(target, value):
                    password_error.value = "パスワードが正しくありません。"
                    page.update()
                    return
                pdf_password_cache[target_key] = value
                close_dialog()
                _step(index + 1)

            dialog = ft.AlertDialog(
                modal=True,
                title=ft.Text("PDFパスワード入力"),
                content=ft.Column(
                    [
                        ft.Text(f"暗号化PDFを検知しました: {target.name}"),
                        password_input,
                        password_error,
                    ],
                    tight=True,
                    spacing=8,
                ),
                actions=[
                    ft.TextButton("キャンセル", on_click=cancel_password),
                    ft.ElevatedButton("OK", on_click=submit_password),
                ],
                actions_alignment=ft.MainAxisAlignment.END,
            )
            page.dialog = dialog
            dialog.open = True
            page.update()

        _step(0)

    def active_order() -> list[int]:
        return [tile.original_page for tile in workspace_tiles if not tile.deleted]

    def active_split_markers() -> set[int]:
        return {tile.original_page for tile in workspace_tiles if not tile.deleted and tile.split_after}

    def _tile_layout_metrics() -> tuple[int, int, int, float]:
        scale = (tile_scale_slider.value or 100) / 100.0
        image_w = int(160 * scale)
        image_h = int(220 * scale)
        max_extent = max(140, image_w + 36)
        child_aspect = (image_w + 20) / max(80.0, image_h + 126.0)
        return image_w, image_h, max_extent, child_aspect

    def _move_tile(src_page: int, dst_page: int) -> None:
        src_idx = next((i for i, item in enumerate(workspace_tiles) if item.original_page == src_page), None)
        dst_idx = next((i for i, item in enumerate(workspace_tiles) if item.original_page == dst_page), None)
        if src_idx is None or dst_idx is None or src_idx == dst_idx:
            return
        moved = workspace_tiles.pop(src_idx)
        if src_idx < dst_idx:
            dst_idx -= 1
        workspace_tiles.insert(dst_idx, moved)

    def _move_tile_block(src_pages: set[int], dst_page: int) -> None:
        if not src_pages:
            return
        if dst_page in src_pages:
            return
        moving = [tile for tile in workspace_tiles if tile.original_page in src_pages]
        if not moving:
            return
        remaining = [tile for tile in workspace_tiles if tile.original_page not in src_pages]
        dst_idx = next((i for i, tile in enumerate(remaining) if tile.original_page == dst_page), len(remaining))
        workspace_tiles[:] = remaining[:dst_idx] + moving + remaining[dst_idx:]

    def _workspace_index(page_no: int) -> int | None:
        return next((i for i, item in enumerate(workspace_tiles) if item.original_page == page_no), None)

    def _set_workspace_deleted(target_pages: set[int], deleted: bool = True) -> None:
        if not target_pages:
            return
        for tile in workspace_tiles:
            if tile.original_page in target_pages:
                tile.deleted = deleted
                if deleted:
                    tile.split_after = False

    def refresh_workspace() -> None:
        image_w, image_h, max_extent, child_aspect = _tile_layout_metrics()
        workspace_grid.max_extent = max_extent
        workspace_grid.child_aspect_ratio = child_aspect
        workspace_grid.controls = [tile_control(tile, image_w, image_h) for tile in workspace_tiles]
        enabled_count = len([x for x in workspace_tiles if not x.deleted])
        selected_count = len(selected_workspace_pages)
        workspace_hint.value = f"総ページ: {len(workspace_tiles)} / 出力対象: {enabled_count} / 選択: {selected_count}"
        tile_scale_label.value = f"タイルサイズ: {int(tile_scale_slider.value or 100)}%"
        page.update()

    def tile_control(tile: PageTileState, image_w: int, image_h: int) -> ft.Control:
        is_selected = tile.original_page in selected_workspace_pages

        def select_tile(_: ft.ControlEvent) -> None:
            nonlocal workspace_selection_anchor_page
            active_selection_scope["value"] = "workspace"
            page_no = tile.original_page
            if key_state["shift"] and workspace_selection_anchor_page is not None:
                start_idx = _workspace_index(workspace_selection_anchor_page)
                end_idx = _workspace_index(page_no)
                if start_idx is None or end_idx is None:
                    selected_workspace_pages.clear()
                    selected_workspace_pages.add(page_no)
                else:
                    lo = min(start_idx, end_idx)
                    hi = max(start_idx, end_idx)
                    selected_workspace_pages.clear()
                    selected_workspace_pages.update(x.original_page for x in workspace_tiles[lo : hi + 1])
            elif key_state["ctrl"]:
                if page_no in selected_workspace_pages:
                    selected_workspace_pages.remove(page_no)
                else:
                    selected_workspace_pages.add(page_no)
                workspace_selection_anchor_page = page_no
            else:
                selected_workspace_pages.clear()
                selected_workspace_pages.add(page_no)
                workspace_selection_anchor_page = page_no
            refresh_workspace()

        def toggle_delete(_: ft.ControlEvent) -> None:
            active_selection_scope["value"] = "workspace"
            tile.deleted = not tile.deleted
            if tile.deleted:
                tile.split_after = False
            refresh_workspace()

        def toggle_split(_: ft.ControlEvent) -> None:
            tile.split_after = not tile.split_after
            refresh_workspace()

        tile_box = ft.Container(
            border=ft.border.all(2 if is_selected else 1, ft.colors.BLUE_400 if is_selected else ft.colors.BLUE_GREY_200),
            border_radius=10,
            padding=8,
            bgcolor=ft.colors.BLUE_50 if is_selected else (ft.colors.RED_50 if tile.deleted else ft.colors.WHITE),
            on_click=select_tile,
            content=ft.Column(
                [
                    ft.Stack(
                        [
                            ft.Image(src_base64=tile.thumbnail_b64, width=image_w, height=image_h, fit=ft.ImageFit.CONTAIN),
                            ft.Row(
                                [
                                    ft.IconButton(
                                        icon=ft.icons.CLOSE,
                                        icon_color=ft.colors.RED_500,
                                        tooltip="ページ削除/復帰",
                                        on_click=toggle_delete,
                                    )
                                ],
                                alignment=ft.MainAxisAlignment.END,
                            ),
                        ]
                    ),
                    ft.Text(f"ページ {tile.original_page}", weight=ft.FontWeight.BOLD),
                    ft.Switch(
                        label="このページの後で分割",
                        value=tile.split_after,
                        disabled=tile.deleted,
                        on_change=toggle_split,
                    ),
                    ft.Text("ドラッグで並び替え", size=12, color=ft.colors.BLUE_GREY_500),
                ],
                tight=True,
                spacing=6,
            ),
        )

        def reset_highlight() -> None:
            tile_box.border = ft.border.all(2 if is_selected else 1, ft.colors.BLUE_400 if is_selected else ft.colors.BLUE_GREY_200)

        def on_will_accept(event: ft.ControlEvent) -> None:
            tile_box.border = ft.border.all(2, ft.colors.BLUE_400 if event.data == "true" else ft.colors.RED_300)
            page.update()

        def on_leave(_: ft.ControlEvent) -> None:
            reset_highlight()
            page.update()

        def on_accept(event: ft.DragTargetEvent) -> None:
            reset_highlight()
            src_control = page.get_control(event.src_id)
            if src_control is None or src_control.data is None:
                page.update()
                return
            src_page = int(src_control.data)
            if src_page in selected_workspace_pages and len(selected_workspace_pages) > 1:
                _move_tile_block(set(selected_workspace_pages), tile.original_page)
            else:
                _move_tile(src_page, tile.original_page)
            refresh_workspace()

        def on_drag_start(_: ft.ControlEvent) -> None:
            nonlocal workspace_selection_anchor_page
            active_selection_scope["value"] = "workspace"
            if tile.original_page not in selected_workspace_pages:
                selected_workspace_pages.clear()
                selected_workspace_pages.add(tile.original_page)
                workspace_selection_anchor_page = tile.original_page
                refresh_workspace()

        draggable = ft.Draggable(
            group="workspace-page-grid",
            data=tile.original_page,
            content=tile_box,
            on_drag_start=on_drag_start,
            content_feedback=ft.Container(
                border=ft.border.all(2, ft.colors.BLUE_300),
                border_radius=10,
                bgcolor=ft.colors.WHITE,
                padding=4,
                content=ft.Image(src_base64=tile.thumbnail_b64, width=max(64, int(image_w * 0.6)), height=max(80, int(image_h * 0.6)), fit=ft.ImageFit.CONTAIN),
            ),
        )

        return ft.DragTarget(
            group="workspace-page-grid",
            content=draggable,
            on_will_accept=on_will_accept,
            on_leave=on_leave,
            on_accept=on_accept,
        )

    def on_tile_scale_change(_: ft.ControlEvent) -> None:
        refresh_workspace()

    tile_scale_slider.on_change = on_tile_scale_change

    def require_single_input() -> Path:
        inputs = current_input_paths()
        if len(inputs) != 1:
            raise PDFApplicationError("この操作は1ファイル入力のみ対応です。")
        return inputs[0]

    def load_workspace(_: ft.ControlEvent) -> None:
        try:
            src = require_single_input()
        except Exception as exc:
            _show_result(page, str(exc), error=True)
            return

        def run_with_password() -> None:
            started_at = time.perf_counter()
            try:
                def _task() -> int:
                    doc = open_fitz_document(src, password=_get_pdf_password(src))
                    try:
                        workspace_tiles.clear()
                        for i, doc_page in enumerate(doc, start=1):
                            workspace_tiles.append(PageTileState(original_page=i, thumbnail_b64=_make_thumbnail(doc_page)))
                    finally:
                        doc.close()
                    return len(workspace_tiles)

                loaded_count = _execute_with_progress("workspace_load", 1, _task)
                refresh_workspace()
                _show_result(page, f"{loaded_count}ページを読み込みました。")
                record_usage_event(
                    action="workspace_load",
                    started_at=started_at,
                    status="success",
                    input_count=1,
                    output_count=len(workspace_tiles),
                )
            except Exception as exc:
                record_usage_event(
                    action="workspace_load",
                    started_at=started_at,
                    status="error",
                    input_count=1,
                    error_message=str(exc),
                )
                _show_result(page, str(exc), error=True)

        _ensure_pdf_passwords([src], run_with_password)

    def export_workspace(_: ft.ControlEvent) -> None:
        try:
            src = require_single_input()
        except Exception as exc:
            _show_result(page, str(exc), error=True)
            return

        def run_with_password() -> None:
            started_at = time.perf_counter()
            try:
                out = Path(output_dir.value or "./output") / (output_name.value or "edited.pdf")
                result = _execute_with_progress(
                    "workspace_export",
                    1,
                    lambda: apply_page_plan(src, active_order(), out, password=_get_pdf_password(src)),
                )
                record_usage_event(
                    action="workspace_export",
                    started_at=started_at,
                    status="success",
                    input_count=1,
                    output_count=len(result.output_files),
                    details=_serialize_usage_details(result.details),
                )
                _show_result(page, result.message)
            except Exception as exc:
                record_usage_event(
                    action="workspace_export",
                    started_at=started_at,
                    status="error",
                    input_count=1,
                    error_message=str(exc),
                )
                _show_result(page, str(exc), error=True)

        _ensure_pdf_passwords([src], run_with_password)

    def split_workspace(_: ft.ControlEvent) -> None:
        try:
            src = require_single_input()
        except Exception as exc:
            _show_result(page, str(exc), error=True)
            return

        def run_with_password() -> None:
            started_at = time.perf_counter()
            try:
                out_dir_path = Path(output_dir.value or "./output")
                result = _execute_with_progress(
                    "workspace_split",
                    1,
                    lambda: split_by_markers(
                        src,
                        active_order(),
                        active_split_markers(),
                        out_dir_path,
                        password=_get_pdf_password(src),
                    ),
                )
                record_usage_event(
                    action="workspace_split",
                    started_at=started_at,
                    status="success",
                    input_count=1,
                    output_count=len(result.output_files),
                    details=_serialize_usage_details(result.details),
                )
                _show_result(page, result.message)
            except Exception as exc:
                record_usage_event(
                    action="workspace_split",
                    started_at=started_at,
                    status="error",
                    input_count=1,
                    error_message=str(exc),
                )
                _show_result(page, str(exc), error=True)

        _ensure_pdf_passwords([src], run_with_password)

    def refresh_split_inputs(_: ft.ControlEvent | None = None) -> None:
        is_pages = split_mode.value == "pages"
        split_unit.disabled = not is_pages
        split_max_size_mb.disabled = is_pages
        if is_pages:
            split_mode_hint.value = "ページ数で均等に分割します。例: 10 なら10ページごと。"
        else:
            split_mode_hint.value = "ファイルサイズ上限(MB)を目安に分割します。"
        page.update()

    split_mode.on_change = refresh_split_inputs
    refresh_split_inputs()

    def run(action: str) -> None:
        inputs = current_input_paths()
        single_input_actions = {
            "split",
            "reorder",
            "header_footer",
            "text_edit",
            "watermark",
            "encrypt",
            "inspect",
        }

        single_input_path: Path | None = None
        if action in single_input_actions:
            try:
                single_input_path = require_single_input()
            except Exception as exc:
                _show_result(page, str(exc), error=True)
                return

        password_targets: list[Path] = []
        if action == "merge":
            password_targets = inputs
        elif single_input_path is not None:
            password_targets = [single_input_path]

        def execute_action() -> None:
            started_at = time.perf_counter()
            try:
                def _task() -> Any:
                    out_dir_path = Path(output_dir.value or "./output")
                    out_file = out_dir_path / (output_name.value or "result.pdf")

                    if action == "merge":
                        password_map = {_path_key(src): _get_pdf_password(src) for src in inputs}
                        return merge_pdfs(inputs, out_file, password_map=password_map)
                    if action == "split":
                        assert single_input_path is not None
                        pwd = _get_pdf_password(single_input_path)
                        if split_mode.value == "size":
                            size_raw = (split_max_size_mb.value or "").strip()
                            if not size_raw:
                                raise PDFApplicationError("サイズ分割では分割サイズ上限(MB)を入力してください。")
                            max_size_mb = _parse_positive_float(
                                size_raw,
                                field_name="分割サイズ上限",
                            )
                            return split_pdf(
                                single_input_path,
                                out_dir_path,
                                max_size_mb=max_size_mb,
                                password=pwd,
                            )

                        pages_per_file = _parse_positive_int(
                            split_unit.value or "1",
                            field_name="分割単位",
                        )
                        return split_pdf(
                            single_input_path,
                            out_dir_path,
                            pages_per_file=pages_per_file,
                            password=pwd,
                        )
                    if action == "reorder":
                        assert single_input_path is not None
                        return reorder_pages(single_input_path, _parse_order(reorder_order.value or ""), out_file, password=_get_pdf_password(single_input_path))
                    if action == "convert":
                        merge_converted = bool(merge_after_convert.value)
                        merged_output_file: Path | None = None
                        if merge_converted:
                            output_filename = (output_name.value or "").strip()
                            if not output_filename:
                                raise PDFApplicationError("Office/PDF変換で「変換後に結合」を使う場合は出力ファイル名を入力してください。")
                            merged_output_file = out_dir_path / output_filename
                        return convert_files_to_pdf(inputs, out_dir_path, merge_converted, merged_output_file)
                    if action == "header_footer":
                        assert single_input_path is not None
                        return add_header_footer(single_input_path, out_file, header_text.value or "", footer_text.value or "", password=_get_pdf_password(single_input_path))
                    if action == "text_edit":
                        assert single_input_path is not None
                        return replace_text_with_overlay(single_input_path, out_file, search_text.value or "", replace_text.value or "", password=_get_pdf_password(single_input_path))
                    if action == "watermark":
                        assert single_input_path is not None
                        return add_watermark_text(single_input_path, out_file, watermark_text.value or "CONFIDENTIAL", password=_get_pdf_password(single_input_path))
                    if action == "encrypt":
                        assert single_input_path is not None
                        if not encrypt_password.value:
                            raise PDFApplicationError("設定するパスワードを入力してください。")
                        return encrypt_pdf(single_input_path, out_file, encrypt_password.value, open_password=_get_pdf_password(single_input_path))
                    if action == "inspect":
                        assert single_input_path is not None
                        inspect = inspect_pdf(single_input_path, password=_get_pdf_password(single_input_path))
                        inspect_result.value = str(inspect.details)
                        page.update()
                        return inspect
                    raise PDFApplicationError("未対応アクションです。")

                result = _execute_with_progress(action, len(inputs), _task)

                record_usage_event(
                    action=action,
                    started_at=started_at,
                    status="success",
                    input_count=len(inputs),
                    output_count=len(result.output_files),
                    details=_serialize_usage_details(result.details),
                )
                _show_result(page, result.message)
            except Exception as exc:
                record_usage_event(
                    action=action,
                    started_at=started_at,
                    status="error",
                    input_count=len(inputs),
                    error_message=str(exc),
                )
                _show_result(page, str(exc), error=True)

        if password_targets:
            _ensure_pdf_passwords(
                password_targets,
                execute_action,
                on_cancel=lambda: _show_result(page, "パスワード入力をキャンセルしました。", error=True),
            )
        else:
            execute_action()

    input_summary = ft.Text(size=11, color=ft.colors.BLUE_GREY_600)

    def _trim_path_from_start(path_text: str, max_chars: int = 96) -> str:
        if len(path_text) <= max_chars:
            return path_text
        return f"...{path_text[-(max_chars - 3):]}"

    def current_input_paths() -> list[Path]:
        return [item.path for item in input_file_items]

    def refresh_input_summary() -> None:
        paths = current_input_paths()
        if not paths:
            input_summary.value = "入力ファイル: 未指定"
        elif len(paths) == 1:
            input_summary.value = f"入力ファイル: 1件（{paths[0].name}）"
        else:
            input_summary.value = f"入力ファイル: {len(paths)}件"

    def _rebuild_input_files_list(update_page: bool = True) -> None:
        rows: list[ft.Control] = []

        for item in input_file_items:
            path_text = str(item.path)
            selected = item.item_id in selected_input_ids

            def on_row_click(_: ft.ControlEvent, row_id: int = item.item_id) -> None:
                nonlocal input_selection_anchor_id
                active_selection_scope["value"] = "input"

                if key_state["shift"] and input_selection_anchor_id is not None:
                    row_idx = next((i for i, x in enumerate(input_file_items) if x.item_id == row_id), None)
                    anchor_idx = next((i for i, x in enumerate(input_file_items) if x.item_id == input_selection_anchor_id), None)
                    if row_idx is None or anchor_idx is None:
                        selected_input_ids.clear()
                        selected_input_ids.add(row_id)
                    else:
                        lo = min(row_idx, anchor_idx)
                        hi = max(row_idx, anchor_idx)
                        selected_input_ids.clear()
                        selected_input_ids.update(x.item_id for x in input_file_items[lo : hi + 1])
                elif key_state["ctrl"]:
                    if row_id in selected_input_ids:
                        selected_input_ids.remove(row_id)
                    else:
                        selected_input_ids.add(row_id)
                    input_selection_anchor_id = row_id
                else:
                    selected_input_ids.clear()
                    selected_input_ids.add(row_id)
                    input_selection_anchor_id = row_id

                _rebuild_input_files_list()

            def remove_single_row(_: ft.ControlEvent, row_id: int = item.item_id) -> None:
                remove_input_items({row_id})

            row = ft.Container(
                key=f"input-item-{item.item_id}",
                padding=ft.padding.symmetric(horizontal=10, vertical=8),
                border=ft.border.all(1, ft.colors.BLUE_200 if selected else ft.colors.BLUE_GREY_200),
                border_radius=8,
                bgcolor=ft.colors.BLUE_50 if selected else ft.colors.WHITE,
                on_click=on_row_click,
                content=ft.Row(
                    [
                        ft.Icon(ft.icons.DRAG_INDICATOR, size=16, color=ft.colors.BLUE_GREY_400),
                        ft.Text(_trim_path_from_start(path_text), no_wrap=True, expand=1),
                        ft.IconButton(
                            icon=ft.icons.CLOSE,
                            icon_size=16,
                            tooltip="この行を削除",
                            on_click=remove_single_row,
                        ),
                    ],
                    spacing=8,
                    vertical_alignment=ft.CrossAxisAlignment.CENTER,
                ),
            )
            rows.append(row)

        input_files_list.controls = rows
        refresh_input_summary()
        if update_page:
            page.update()

    def remove_input_items(target_ids: set[int], *, show_result: bool = False) -> int:
        nonlocal input_selection_anchor_id

        if not target_ids:
            return 0
        before = len(input_file_items)
        input_file_items[:] = [item for item in input_file_items if item.item_id not in target_ids]
        removed = before - len(input_file_items)
        selected_input_ids.difference_update(target_ids)
        if input_selection_anchor_id in target_ids:
            input_selection_anchor_id = None
        _rebuild_input_files_list()
        if show_result and removed > 0:
            _show_result(page, f"{removed}件を入力ファイルから削除しました。")
        return removed

    def add_input_items(paths: list[str]) -> int:
        nonlocal next_input_item_id

        added = 0
        for raw in paths:
            raw = raw.strip()
            if not raw:
                continue
            input_file_items.append(InputFileItem(item_id=next_input_item_id, path=Path(raw)))
            next_input_item_id += 1
            added += 1
        if added > 0:
            _rebuild_input_files_list()
        return added

    def on_input_reorder(event: ft.OnReorderEvent) -> None:
        active_selection_scope["value"] = "input"
        old = event.old_index
        new = event.new_index
        if old == new:
            return
        if old < new:
            new -= 1
        moved = input_file_items.pop(old)
        input_file_items.insert(new, moved)
        _rebuild_input_files_list()

    input_files_list.on_reorder = on_input_reorder

    def on_page_keyboard(event: ft.KeyboardEvent) -> None:
        key_state["ctrl"] = bool(event.ctrl)
        key_state["shift"] = bool(event.shift)
        if event.key == "Delete":
            if active_selection_scope["value"] == "workspace" and selected_workspace_pages:
                _set_workspace_deleted(set(selected_workspace_pages), deleted=True)
                refresh_workspace()
                _show_result(page, f"{len(selected_workspace_pages)}ページを削除状態にしました。")
                return
            if selected_input_ids:
                remove_input_items(set(selected_input_ids), show_result=True)

    page.on_keyboard_event = on_page_keyboard

    def suggest_initial_directory() -> str | None:
        for src in current_input_paths():
            if src.exists():
                return str(src.parent if src.is_file() else src)
        out_dir = Path(output_dir.value or "").expanduser()
        if str(out_dir).strip() and out_dir.exists():
            return str(out_dir)
        return str(Path.cwd())

    def on_pick_input_files(event: ft.FilePickerResultEvent) -> None:
        if not event.files:
            return
        picked_paths = [x.path for x in event.files if x.path]
        if not picked_paths:
            _show_result(
                page,
                "この起動モードではファイルの絶対パスを取得できません。デスクトップモードで起動してください。",
                error=True,
            )
            return
        added = add_input_items(picked_paths)
        if added > 0:
            _show_result(page, f"入力ファイルを{added}件追加しました。")

    def on_pick_output_dir(event: ft.FilePickerResultEvent) -> None:
        if not event.path:
            return
        output_dir.value = event.path
        page.update()
        _show_result(page, f"出力フォルダを設定しました: {event.path}")

    def on_pick_output_file(event: ft.FilePickerResultEvent) -> None:
        if not event.path:
            return
        selected = Path(event.path)
        output_dir.value = str(selected.parent)
        output_name.value = selected.name
        page.update()
        _show_result(page, f"出力先ファイルを設定しました: {selected.name}")

    input_file_picker = ft.FilePicker(on_result=on_pick_input_files)
    output_dir_picker = ft.FilePicker(on_result=on_pick_output_dir)
    output_file_picker = ft.FilePicker(on_result=on_pick_output_file)
    page.overlay.extend([input_file_picker, output_dir_picker, output_file_picker])

    pick_input_button = ft.OutlinedButton(
        "入力ファイルを選択",
        on_click=lambda _: input_file_picker.pick_files(
            dialog_title="入力ファイルを選択",
            initial_directory=suggest_initial_directory(),
            allow_multiple=True,
        ),
    )
    pick_output_dir_button = ft.OutlinedButton(
        "出力フォルダを選択",
        on_click=lambda _: output_dir_picker.get_directory_path(
            dialog_title="出力フォルダを選択",
            initial_directory=suggest_initial_directory(),
        ),
    )
    pick_output_file_button = ft.OutlinedButton(
        "出力ファイルを選択",
        on_click=lambda _: output_file_picker.save_file(
            dialog_title="出力ファイルを選択",
            initial_directory=suggest_initial_directory(),
            file_name=output_name.value or "result.pdf",
        ),
    )
    picker_mode_hint = ft.Text(size=11, color=ft.colors.BLUE_GREY_600)

    if page.web:
        pick_input_button.disabled = True
        pick_output_dir_button.disabled = True
        pick_output_file_button.disabled = True
        picker_mode_hint.value = "Web起動ではローカルパス取得不可のためGUI選択は無効です。デスクトップ起動を使用してください。"
    else:
        picker_mode_hint.value = "エクスプローラーで選択できます（入力は複数選択可）。"

    input_picker_buttons = ft.Row([pick_input_button, picker_mode_hint], wrap=True)
    input_selection_hint = ft.Text(
        "操作: クリックで選択 / Ctrl+クリックで複数選択 / Shift+クリックで範囲選択 / Deleteで削除 / 右端×で行削除 / ドラッグで並び替え",
        size=11,
        color=ft.colors.BLUE_GREY_600,
    )
    _rebuild_input_files_list(update_page=False)

    output_picker_buttons = ft.Row([pick_output_dir_button, pick_output_file_button], wrap=True)

    action_labels = {k: ACTION_DISPLAY_NAMES[k] for k in ("merge", "split", "convert", "reorder", "header_footer", "text_edit", "watermark", "encrypt", "inspect")}
    action_descriptions = {
        "merge": "複数のPDFを1つのPDFにまとめます。",
        "split": "1つのPDFをページ数またはサイズ上限で分割します。",
        "convert": "Office文書やPDFをPDFに変換します。必要なら変換後に結合できます。",
        "reorder": "ページ順を番号で指定して入れ替えます（視覚編集は「ページ編集」タブ推奨）。",
        "header_footer": "各ページへヘッダーとフッター、ページ番号を追記します。",
        "text_edit": "検索文字列を見つけて置換文字列を上書きします。",
        "watermark": "全ページへ透かし文字を追加します。",
        "encrypt": "PDFに閲覧パスワードを設定します。",
        "inspect": "ページ数、暗号化状態、メタデータを確認します。",
    }
    single_input_actions = {
        "split",
        "reorder",
        "header_footer",
        "text_edit",
        "watermark",
        "encrypt",
        "inspect",
    }
    action_controls: dict[str, list[ft.Control]] = {
        "merge": [],
        "split": [split_mode, split_unit, split_max_size_mb, split_mode_hint],
        "convert": [merge_after_convert],
        "reorder": [reorder_order],
        "header_footer": [header_text, footer_text],
        "text_edit": [search_text, replace_text],
        "watermark": [watermark_text],
        "encrypt": [encrypt_password],
        "inspect": [inspect_result],
    }

    action_select = ft.Dropdown(
        label="Step 2: 操作を選択",
        value="merge",
        options=[ft.dropdown.Option(key, label) for key, label in action_labels.items()],
    )
    action_description = ft.Text(size=13)
    action_requirement = ft.Text(size=11, color=ft.colors.BLUE_GREY_600)
    action_fields = ft.Column(spacing=8)
    run_selected_button = ft.ElevatedButton(
        "実行",
        on_click=lambda _: run(action_select.value or "merge"),
    )

    def refresh_action_panel(event: ft.ControlEvent | None = None) -> None:
        action = action_select.value or "merge"
        action_description.value = action_descriptions[action]
        if action in single_input_actions:
            action_requirement.value = "入力条件: 1ファイル入力"
        else:
            action_requirement.value = "入力条件: 複数ファイル入力可"
        action_fields.controls = action_controls[action]
        run_selected_button.text = f"{action_labels[action]}を実行"
        if action == "inspect":
            output_name.disabled = True
            output_name.helper_text = "この操作では出力ファイルを作成しません。"
        elif action == "split":
            output_name.disabled = True
            output_name.helper_text = "この操作では出力名は自動決定されます。"
        elif action == "convert":
            if merge_after_convert.value:
                output_name.disabled = False
                output_name.helper_text = "変換後に結合する場合の出力ファイル名です（必須）。"
            else:
                output_name.disabled = True
                output_name.helper_text = "変換のみの場合は出力名は入力ごとに自動決定されます。"
        else:
            output_name.disabled = False
            output_name.helper_text = "1ファイル出力時に使用します。"

        if event is not None:
            page.update()

    action_select.on_change = refresh_action_panel
    merge_after_convert.on_change = refresh_action_panel
    refresh_action_panel()

    common_form = ft.Card(
        content=ft.Container(
            padding=14,
            content=ft.Column(
                [
                    ft.Text("Step 1: 入出力を設定", size=18, weight=ft.FontWeight.BOLD),
                    ft.Text("入力ファイル一覧を編集できます。分割/変換では出力名が自動付与される場合があります。", size=12),
                    input_picker_buttons,
                    input_files_list,
                    input_selection_hint,
                    input_summary,
                    ft.ResponsiveRow(
                        [
                            ft.Container(output_dir, col={"sm": 12, "md": 6}),
                            ft.Container(output_name, col={"sm": 12, "md": 6}),
                        ]
                    ),
                    output_picker_buttons,
                ],
                spacing=10,
            ),
        ),
    )

    progress_card = ft.Card(
        content=ft.Container(
            padding=12,
            content=ft.Column(
                [
                    progress_title,
                    ft.Row([progress_bar, progress_percent], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                    progress_detail,
                ],
                spacing=8,
            ),
        ),
    )

    quick_tab = ft.Column(
        [
            ft.Card(
                content=ft.Container(
                    padding=14,
                    content=ft.Column(
                        [
                            ft.Text("Step 2: 操作を選んで実行", size=18, weight=ft.FontWeight.BOLD),
                            action_select,
                            action_description,
                            action_requirement,
                            ft.Divider(),
                            action_fields,
                            ft.Row([run_selected_button], alignment=ft.MainAxisAlignment.END),
                        ],
                        spacing=10,
                    ),
                ),
            ),
        ],
        scroll=ft.ScrollMode.AUTO,
    )

    workspace_tab = ft.Column(
        [
            ft.Card(
                content=ft.Container(
                    padding=14,
                    content=ft.Column(
                        [
                            ft.Text("ページ編集の使い方", size=16, weight=ft.FontWeight.BOLD),
                            ft.Text("1) ページ読み込み 2) タイルをドラッグで並び替え / ×で除外 3) 出力ボタンを実行", size=12),
                        ],
                        spacing=6,
                    ),
                ),
            ),
            ft.Text("ページ編集ワークスペース", size=18, weight=ft.FontWeight.BOLD),
            workspace_hint,
            ft.Row(
                [
                    ft.ElevatedButton("ページ読み込み", on_click=load_workspace),
                    ft.ElevatedButton("編集結果を1ファイル出力", on_click=export_workspace),
                    ft.ElevatedButton("分割出力", on_click=split_workspace),
                ],
                wrap=True,
            ),
            ft.Row(
                [
                    ft.Text("表示倍率", size=12, color=ft.colors.BLUE_GREY_700),
                    tile_scale_slider,
                    tile_scale_label,
                ],
                alignment=ft.MainAxisAlignment.START,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            workspace_grid,
        ],
        scroll=ft.ScrollMode.AUTO,
    )

    tabs = ft.Tabs(
        selected_index=0,
        tabs=[
            ft.Tab(text="かんたん操作", content=quick_tab),
            ft.Tab(text="ページ編集", content=workspace_tab),
        ],
        expand=1,
    )

    page.add(
        ft.Text("PDF統合アプリケーション", size=30, weight=ft.FontWeight.BOLD),
        ft.Text("初めての方は「Step 1」→「かんたん操作」でそのまま実行できます。", size=13),
        progress_card,
        common_form,
        tabs,
    )


def _is_port_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(("0.0.0.0", port))
            return True
        except OSError:
            return False


def _resolve_port(default_port: int = 8550, max_scan: int = 20) -> int:
    raw = os.environ.get("PDF_APP_PORT", "").strip()
    if raw:
        try:
            forced = int(raw)
            if 1 <= forced <= 65535:
                return forced
            print(f"[WARN] PDF_APP_PORT out of range: {forced}.")
        except ValueError:
            print(f"[WARN] Invalid PDF_APP_PORT='{raw}'.")

    if _is_port_available(default_port):
        return default_port

    for candidate in range(default_port + 1, default_port + max_scan + 1):
        if _is_port_available(candidate):
            print(f"[INFO] Port {default_port} is in use. Starting on port {candidate}.")
            return candidate

    raise RuntimeError(f"No available port found in range {default_port}-{default_port + max_scan}")


def _resolve_app_view() -> ft.AppView:
    raw = os.environ.get("PDF_APP_VIEW", "").strip().lower()
    if not raw:
        return ft.AppView.FLET_APP

    aliases = {
        "desktop": ft.AppView.FLET_APP,
        "flet_app": ft.AppView.FLET_APP,
        "web": ft.AppView.WEB_BROWSER,
        "web_browser": ft.AppView.WEB_BROWSER,
        "browser": ft.AppView.WEB_BROWSER,
        "flet_app_web": ft.AppView.FLET_APP_WEB,
        "hidden": ft.AppView.FLET_APP_HIDDEN,
        "flet_app_hidden": ft.AppView.FLET_APP_HIDDEN,
    }
    resolved = aliases.get(raw)
    if resolved is None:
        print(f"[WARN] Invalid PDF_APP_VIEW='{raw}'. Using desktop mode.")
        return ft.AppView.FLET_APP
    return resolved


if __name__ == "__main__":
    ft.app(target=main, view=_resolve_app_view(), port=_resolve_port(8550))

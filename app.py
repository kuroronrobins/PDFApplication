from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import fitz
import flet as ft

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
from pdf_app.services.usage_log import record_usage_event


@dataclass
class PageTileState:
    original_page: int
    thumbnail_b64: str
    deleted: bool = False
    split_after: bool = False


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

    input_paths = ft.TextField(label="入力ファイル（1行1ファイル）", multiline=True, min_lines=4, max_lines=6)
    output_dir = ft.TextField(label="出力フォルダ", value="./output")
    output_name = ft.TextField(label="出力ファイル名", value="result.pdf")
    open_password = ft.TextField(label="入力PDFパスワード（必要時）", password=True, can_reveal_password=True)

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
    workspace_list = ft.ReorderableListView(height=540, spacing=8, controls=[])

    def active_order() -> list[int]:
        return [tile.original_page for tile in workspace_tiles if not tile.deleted]

    def active_split_markers() -> set[int]:
        return {tile.original_page for tile in workspace_tiles if not tile.deleted and tile.split_after}

    def refresh_workspace() -> None:
        workspace_list.controls = [tile_control(tile) for tile in workspace_tiles]
        enabled_count = len([x for x in workspace_tiles if not x.deleted])
        workspace_hint.value = f"総ページ: {len(workspace_tiles)} / 出力対象: {enabled_count}"
        page.update()

    def tile_control(tile: PageTileState) -> ft.Control:
        def toggle_delete(_: ft.ControlEvent) -> None:
            tile.deleted = not tile.deleted
            if tile.deleted:
                tile.split_after = False
            refresh_workspace()

        def toggle_split(_: ft.ControlEvent) -> None:
            tile.split_after = not tile.split_after
            refresh_workspace()

        return ft.Container(
            key=f"tile-{tile.original_page}",
            border=ft.border.all(1, ft.colors.BLUE_GREY_200),
            border_radius=10,
            padding=8,
            bgcolor=ft.colors.RED_50 if tile.deleted else ft.colors.WHITE,
            content=ft.Column(
                [
                    ft.Stack(
                        [
                            ft.Image(src_base64=tile.thumbnail_b64, width=180, height=240, fit=ft.ImageFit.CONTAIN),
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
            ),
        )

    def on_reorder(event: ft.OnReorderEvent) -> None:
        old = event.old_index
        new = event.new_index
        if old < new:
            new -= 1
        moved = workspace_tiles.pop(old)
        workspace_tiles.insert(new, moved)
        refresh_workspace()

    workspace_list.on_reorder = on_reorder

    def require_single_input() -> Path:
        inputs = _parse_paths(input_paths.value or "")
        if len(inputs) != 1:
            raise PDFApplicationError("この操作は1ファイル入力のみ対応です。")
        return inputs[0]

    def load_workspace(_: ft.ControlEvent) -> None:
        started_at = time.perf_counter()
        try:
            src = require_single_input()
            doc = open_fitz_document(src, password=open_password.value or "")
            try:
                workspace_tiles.clear()
                for i, doc_page in enumerate(doc, start=1):
                    workspace_tiles.append(PageTileState(original_page=i, thumbnail_b64=_make_thumbnail(doc_page)))
            finally:
                doc.close()
            refresh_workspace()
            _show_result(page, f"{len(workspace_tiles)}ページを読み込みました。")
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

    def export_workspace(_: ft.ControlEvent) -> None:
        started_at = time.perf_counter()
        try:
            src = require_single_input()
            out = Path(output_dir.value or "./output") / (output_name.value or "edited.pdf")
            result = apply_page_plan(src, active_order(), out, password=open_password.value or "")
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

    def split_workspace(_: ft.ControlEvent) -> None:
        started_at = time.perf_counter()
        try:
            src = require_single_input()
            out_dir_path = Path(output_dir.value or "./output")
            result = split_by_markers(
                src,
                active_order(),
                active_split_markers(),
                out_dir_path,
                password=open_password.value or "",
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
        started_at = time.perf_counter()
        inputs = _parse_paths(input_paths.value or "")
        try:
            out_dir_path = Path(output_dir.value or "./output")
            out_file = out_dir_path / (output_name.value or "result.pdf")
            pwd = open_password.value or ""

            if action == "merge":
                result = merge_pdfs(inputs, out_file, password=pwd)
            elif action == "split":
                if split_mode.value == "size":
                    size_raw = (split_max_size_mb.value or "").strip()
                    if not size_raw:
                        raise PDFApplicationError("サイズ分割では分割サイズ上限(MB)を入力してください。")
                    max_size_mb = _parse_positive_float(
                        size_raw,
                        field_name="分割サイズ上限",
                    )
                    result = split_pdf(
                        require_single_input(),
                        out_dir_path,
                        max_size_mb=max_size_mb,
                        password=pwd,
                    )
                else:
                    pages_per_file = _parse_positive_int(
                        split_unit.value or "1",
                        field_name="分割単位",
                    )
                    result = split_pdf(
                        require_single_input(),
                        out_dir_path,
                        pages_per_file=pages_per_file,
                        password=pwd,
                    )
            elif action == "reorder":
                result = reorder_pages(require_single_input(), _parse_order(reorder_order.value or ""), out_file, password=pwd)
            elif action == "convert":
                result = convert_files_to_pdf(inputs, out_dir_path, bool(merge_after_convert.value))
            elif action == "header_footer":
                result = add_header_footer(require_single_input(), out_file, header_text.value or "", footer_text.value or "", password=pwd)
            elif action == "text_edit":
                result = replace_text_with_overlay(require_single_input(), out_file, search_text.value or "", replace_text.value or "", password=pwd)
            elif action == "watermark":
                result = add_watermark_text(require_single_input(), out_file, watermark_text.value or "CONFIDENTIAL", password=pwd)
            elif action == "encrypt":
                if not encrypt_password.value:
                    raise PDFApplicationError("設定するパスワードを入力してください。")
                result = encrypt_pdf(require_single_input(), out_file, encrypt_password.value, open_password=pwd)
            elif action == "inspect":
                result = inspect_pdf(require_single_input(), password=pwd)
                inspect_result.value = str(result.details)
                page.update()
            else:
                raise PDFApplicationError("未対応アクションです。")

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

    common_form = ft.Card(
        content=ft.Container(
            padding=12,
            content=ft.Column(
                [
                    ft.Text("共通設定", size=18, weight=ft.FontWeight.BOLD),
                    input_paths,
                    ft.ResponsiveRow(
                        [
                            ft.Container(output_dir, col={"sm": 12, "md": 4}),
                            ft.Container(output_name, col={"sm": 12, "md": 4}),
                            ft.Container(open_password, col={"sm": 12, "md": 4}),
                        ]
                    ),
                ]
            ),
        ),
    )

    workspace_tab = ft.Column(
        [
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
            workspace_list,
        ],
        scroll=ft.ScrollMode.AUTO,
    )

    standard_tab = ft.Column(
        [
            ft.ResponsiveRow(
                [
                    ft.Container(ft.Card(ft.Container(ft.Column([ft.Text("PDF結合"), ft.ElevatedButton("実行", on_click=lambda _: run("merge"))]), padding=10)), col={"sm": 12, "md": 4}),
                    ft.Container(ft.Card(ft.Container(ft.Column([ft.Text("PDF分割"), split_mode, split_unit, split_max_size_mb, split_mode_hint, ft.ElevatedButton("実行", on_click=lambda _: run("split"))]), padding=10)), col={"sm": 12, "md": 4}),
                    ft.Container(ft.Card(ft.Container(ft.Column([ft.Text("ページ入れ替え"), reorder_order, ft.ElevatedButton("実行", on_click=lambda _: run("reorder"))]), padding=10)), col={"sm": 12, "md": 4}),
                    ft.Container(ft.Card(ft.Container(ft.Column([ft.Text("Office/PDF変換"), merge_after_convert, ft.ElevatedButton("実行", on_click=lambda _: run("convert"))]), padding=10)), col={"sm": 12, "md": 4}),
                    ft.Container(ft.Card(ft.Container(ft.Column([ft.Text("ヘッダー/フッター"), header_text, footer_text, ft.ElevatedButton("実行", on_click=lambda _: run("header_footer"))]), padding=10)), col={"sm": 12, "md": 4}),
                    ft.Container(ft.Card(ft.Container(ft.Column([ft.Text("文字置換"), search_text, replace_text, ft.ElevatedButton("実行", on_click=lambda _: run("text_edit"))]), padding=10)), col={"sm": 12, "md": 4}),
                ]
            )
        ]
    )

    security_tab = ft.Column(
        [
            ft.ResponsiveRow(
                [
                    ft.Container(ft.Card(ft.Container(ft.Column([ft.Text("透かし追加"), watermark_text, ft.ElevatedButton("実行", on_click=lambda _: run("watermark"))]), padding=10)), col={"sm": 12, "md": 4}),
                    ft.Container(ft.Card(ft.Container(ft.Column([ft.Text("パスワード設定"), encrypt_password, ft.ElevatedButton("実行", on_click=lambda _: run("encrypt"))]), padding=10)), col={"sm": 12, "md": 4}),
                    ft.Container(ft.Card(ft.Container(ft.Column([ft.Text("PDF情報表示"), ft.ElevatedButton("実行", on_click=lambda _: run("inspect")), inspect_result]), padding=10)), col={"sm": 12, "md": 4}),
                ]
            )
        ]
    )

    tabs = ft.Tabs(
        selected_index=0,
        tabs=[
            ft.Tab(text="ページ編集", content=workspace_tab),
            ft.Tab(text="標準機能", content=standard_tab),
            ft.Tab(text="セキュリティ/情報", content=security_tab),
        ],
        expand=1,
    )

    page.add(
        ft.Text("PDF統合アプリケーション", size=30, weight=ft.FontWeight.BOLD),
        ft.Text("堅牢性と操作性を重視したUI。暗号化PDFもパスワード入力で安全に処理できます。"),
        common_form,
        tabs,
    )


if __name__ == "__main__":
    ft.app(target=main, view=ft.AppView.WEB_BROWSER, port=8550)

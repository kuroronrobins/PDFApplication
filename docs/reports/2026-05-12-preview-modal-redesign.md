# 2026-05-12 Preview Modal Redesign

## Scope

- 書き出し前プレビューを大型中央ページ表示と横スクロール式フィルムストリップへ刷新。
- ファイル単位装飾のページ単位解除を `excludedPageIds` として実装し、実PDF装飾処理にも反映。
- 書き出し完了後に、生成PDFを開くボタンと出力フォルダを表示するボタンを追加。

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/types.ts`
- `src/features/workbench/store.ts`
- `src/features/workbench/backend.ts`
- `src-tauri/src/lib.rs`
- `src-python/pdf_workbench_engine/services/pdf_decorations.py`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## User-Visible Behavior

- プレビューは除外ページを表示せず、出力後のページだけを中央の大きなページと下部サムネイルで確認できる。
- 分割後のファイル境界は、下部フィルムストリップのハサミ区切りで確認できる。
- ファイル一括装飾後にページをクリックすると、重複追加ではなくそのページだけ一括装飾から外れる。もう一度クリックすると復帰する。
- 書き出し成功後、下部バーから出力PDFを直接開く、またはエクスプローラーで表示できる。

## Verification Commands

- `npm run typecheck` passed.
- `python -m compileall src-python` passed.
- `npm run build` passed after running outside the sandbox because Vite config loading hit `spawn EPERM` in the sandbox.
- `npm run tauri build` passed and produced release bundles.
- Python `_applies_to_page` smoke passed for file-level decoration with one excluded page.
- Browser visual check passed with no console errors.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-12-preview-modal-redesign-1280x720.png`

## Known Limitations

- Browser visual verification used the available in-app browser viewport of 1280x720. This is slightly stricter than 1366x768 in both width and height, but a dedicated 1366x768 automated viewport is still desirable.
- The visual fixture uses synthetic sample pages, so pages without generated thumbnails still show the document placeholder. Real loaded PDFs continue to use generated page thumbnails.

## Next Recommended Step

- Run a Tauri manual check with actual PDF files and confirm the new preview with real thumbnails, split markers, and output open/reveal buttons after export.

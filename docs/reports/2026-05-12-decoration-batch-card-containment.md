# 2026-05-12 Decoration Batch and Card Containment

## Scope

Implemented the latest UI revisions for decoration tools, file/page exclusion display, file-card density, and overall conversion progress.

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/types.ts`
- `src/features/workbench/store.ts`
- `src/features/workbench/sampleData.ts`
- `src-python/pdf_workbench_engine/services/pdf_decorations.py`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## User-Visible Behavior

- Removed the four decoration shortcut icons from each file card.
- Header/footer/watermark tools now apply from the selected toolbar tool to a clicked file or page.
- Re-clicking the same target with the same decoration setting toggles it off.
- File cards show full or partial decoration marks for header, footer/page tokens, and watermark.
- Page number is now handled inside header/footer text with `{page}` and `{total}` tokens.
- Header/footer settings support left, center, and right positions independently.
- Watermark is center-only, diagonal, auto-sized, and supports light red, gray, or a custom color.
- The decoration panel follows the active tool rather than the last clicked page.
- File-level exclusion now asks for confirmation and removes the file from the workspace view.
- Page-level exclusion labels were removed; excluded pages remain visually dimmed.
- Persistent `PDF準備完了` and `待機中` labels were removed from the main UI.
- Per-file conversion progress bars were removed; overall conversion progress is handled by the bottom job bar.
- Added explicit browser-only fixture loading via `?fixture=workbench`, plus optional `tool=` for visual verification.

## Verification Commands

- `npm run typecheck` - passed
- `python -m compileall src-python\pdf_workbench_engine` - passed
- `npm run build` - passed
- `npm run tauri build` - passed

## Screenshot Paths

- `docs/reports/screenshots/2026-05-12-decoration-batch-toggle-1366x768.png`
- `docs/reports/screenshots/2026-05-12-decoration-tool-panel-1366x768.png`

## Known Limitations

- The visual fixture is for browser verification only and must not be treated as production startup data.
- Real pointer D&D should still be regression-tested in the Tauri window with real user files.
- The Python watermark writer attempts arbitrary rotation through PyMuPDF `morph`; if an older PyMuPDF build rejects it, it falls back to non-rotated centered text.

## Next Recommended Step

Run a Tauri-window interaction pass with real PDF/Office files, focusing on file D&D, page D&D, file removal, and export output bytes.

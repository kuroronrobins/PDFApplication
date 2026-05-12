# 2026-05-12 Decoration Slots and Output File Path

## Scope

- Replace file-card `H/F/W` decoration badges with direct thumbnail decoration rendering.
- Prevent header/footer text overlap by grouping decorations into left/center/right slots.
- Make file-card expand action more prominent while keeping the 1366x768 layout contained.
- Change export destination from directory selection to PDF file selection.
- Keep export intermediates out of final output by deleting random-prefixed temporary PDFs.
- Enable Japanese text rendering for header/footer/watermark/search-overlay output.

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/fileInput.ts`
- `src/features/workbench/backend.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src/features/workbench/store.ts`
- `src-python/pdf_workbench_engine/jobs/export_workspace.py`
- `src-python/pdf_workbench_engine/services/pdf_decorations.py`
- `src-python/pdf_workbench_engine/services/text_overlay.py`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## User-Visible Behavior

- File cards no longer show separate `H/F/W` badges.
- File and page thumbnails show the actual decoration text in header/footer/watermark positions.
- Header/footer decorations are split into left, center, and right visual slots, so multiple placements do not cover each other.
- File cards keep the larger representative thumbnail but no longer overflow the file-order area at 1366x768.
- The top action is now `出力ファイル`; it opens a file-save dialog and stores the intended PDF file path.
- If split output produces multiple PDFs, the worker writes `name_001.pdf`, `name_002.pdf`, and so on.
- Export leaves only the final output PDFs; random-prefixed intermediate PDFs are removed.
- Japanese decoration text is written using PyMuPDF's `japan` font.

## Verification Commands

- `npm run typecheck` passed.
- `python -m compileall src-python` passed.
- `npm run build` passed after rerunning outside the sandbox because the first sandboxed run failed with `spawn EPERM`.
- `npm run tauri build` passed and produced release bundles.
- Python worker smoke passed: a two-page input split to `pdfwb_smoke_final_001.pdf` and `pdfwb_smoke_final_002.pdf`, with no `.pdf-workbench-*` temporary files remaining.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-12-decoration-slots-output-file-1366x768.png`

## Known Limitations

- The save-file dialog was build-verified but not manually exercised inside the packaged Tauri window in this pass.
- Header/footer slot clearing is still based on selecting the slot in the floating panel and clicking the same file/page target again. A direct per-slot clear affordance can be added later.

## Next Recommended Step

- Run a packaged-app E2E with real PDFs: add files, set `出力ファイル`, apply Japanese header/footer/watermark, split once, export, and inspect the resulting PDFs.

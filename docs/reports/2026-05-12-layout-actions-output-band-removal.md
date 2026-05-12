# 2026-05-12 Layout Actions and Output Band Removal

## Scope

- Removed the fixed `出力 1` / `出力 2` page timeline background bands.
- Reworked file-card and page-card layout so loading/converting states stay inside their parent containers.
- Changed the reorder tool icon to a hand icon.
- Added separate top-bar `プレビュー` and direct `書き出し` actions.
- Replaced the write-out icon with `FileOutput`.
- Added file-card-level decoration shortcuts for header, footer, page number, and watermark.
- Added `file` decoration scope support in the frontend model and Python decoration filter.

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/types.ts`
- `src/features/workbench/store.ts`
- `src-python/pdf_workbench_engine/services/pdf_decorations.py`
- `docs/implementation_roadmap.md`
- `docs/tauri_ui_redesign_plan.md`

## User-Visible Behavior

- The page timeline no longer shows non-functional `出力 1` / `出力 2` labels.
- Split state is represented by the scissors marker on the page card and by the output count/preview/export plan.
- File cards keep conversion progress inside the card instead of extending below the file-order section.
- Page cards keep their page label inside the timeline container.
- The first toolbar action reads as drag/reorder through a hand icon.
- Users can open preview from the top bar or write directly without first opening the preview modal.
- File cards now expose compact decoration buttons, allowing per-file header/footer/page-number/watermark setup.

## Verification Commands

- `npm run typecheck` passed.
- `npm run build` passed outside the sandbox after sandboxed Vite failed with `spawn EPERM`.
- `python -m compileall src-python\pdf_workbench_engine` passed.
- `npm run tauri build` passed.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-12-layout-actions-1366x768.png`

## Visual Verification

1366x768 headless Chromium check:

- `hasOutputBands`: `false`
- app actions include `プレビュー` and `書き出し`
- file cards remained inside the file strip with `bottomInside: 14`
- page cards remained inside the timeline with `bottomInside: 9`
- body scroll size matched viewport: `1366x768`

## Known Limitations

- This change removes the misleading visual output bands. Actual split export behavior remains represented by split markers, output count, preview grouping, and the processing engine's `splitAfter` handling.
- Explorer-to-Tauri OS drag was not manually re-tested in a real desktop window during this pass.

## Next Recommended Step

- Run a real PDF export case with a split marker and file-scoped decoration to confirm byte-level output names, page grouping, and decoration targeting end to end.

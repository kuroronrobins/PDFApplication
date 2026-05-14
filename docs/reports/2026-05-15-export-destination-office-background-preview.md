# 2026-05-15 Export Destination, Office Background Conversion, and Preview Sizing

## Scope

- Remove the persistent output-file button.
- Ask for the output PDF path on every export.
- Derive planned output names from the first active input file.
- Prevent Python worker console windows in installed builds.
- Move Office conversion onto the streaming worker path so the UI remains usable.
- Make preview page sizing match the rendered page image without doing slow pre-preview export rendering.

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/backend.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src/features/workbench/outputPlan.ts`
- `src/features/workbench/types.ts`
- `src-python/pdf_workbench_engine/jobs/convert_office.py`
- `src-tauri/src/python_worker.rs`
- `docs/implementation_roadmap.md`
- `docs/reports/2026-05-15-export-destination-office-background-preview.md`

## User-Visible Behavior

- The top-bar `出力ファイル` button is removed.
- Clicking `書き出し` or confirming from preview opens the save-file dialog every time.
- The default save name and bottom output chips use the first non-excluded input file name plus `_PDF化`.
- Split output names use the same stem with `_001`, `_002`, etc.
- Office conversion runs through an event-streamed worker job, keeping the frontend responsive while progress is reflected on the file card and bottom progress area.
- Installed Windows builds should launch Python/worker child processes without a black console window.
- The preview modal sizes page wrappers from actual rendered image dimensions, so side whitespace from a fixed A4 wrapper is removed.

## Verification Commands

- `npm run typecheck`: passed.
- `python -m compileall src-python\pdf_workbench_engine`: passed.
- `cargo fmt --check`: passed.
- `cargo check`: passed.
- `npm run build`: failed inside sandbox with the known Vite/Rolldown `spawn EPERM` issue.
- `npm run tauri build`: passed outside sandbox and regenerated:
  - `src-tauri/target/release/pdf-workbench.exe`
  - `src-tauri/target/release/bundle/nsis/PDF Workbench_0.1.0_x64-setup.exe`
  - `src-tauri/target/release/bundle/msi/PDF Workbench_0.1.0_x64_ja-JP.msi`

## Screenshot Paths

- `docs/reports/screenshots/2026-05-15-output-save-preview-main-1366x768.png`

## Known Limitations

- The installed-build black-console fix is implemented at the Windows process-creation layer and the release build passed, but it still needs a manual installed-build smoke test while converting real Office files.
- The Office conversion job now streams and returns immediately to the UI after launch, but Microsoft Office COM itself does not provide fine-grained document progress. Progress is staged around worker start, Office launch, PDF completion, inspection, and thumbnail generation.
- A headless DevTools attempt to click the preview button and screenshot the modal timed out in this environment. The main workbench screenshot was captured; final preview visual confirmation should be done in the running app with a non-A4-ratio PDF.

## Next Recommended Step

- Install the regenerated NSIS build on the target Office-equipped environment and verify: no black terminal during Office conversion, UI remains operable during conversion, save dialog appears on every export, and preview page boundaries match the actual output page.

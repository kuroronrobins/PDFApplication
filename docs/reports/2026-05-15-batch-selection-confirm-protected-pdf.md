# 2026-05-15 Batch Selection, Confirmation, and Protected PDF Handling

## Scope

- Added file/page modifier selection for batch operations.
- Routed reorder, scissors, trash/page exclusion, and header/footer/watermark application through selected batches when the direct target is selected.
- Replaced file-removal `window.confirm` with an in-app confirmation dialog that supports Enter, Esc, and arrow-key action switching.
- Removed search/replace from the active React state, toolbar, export snapshot, and Python export pipeline.
- Allowed copy-protected PDFs with an empty user password to be opened by the processing engine without prompting for a password.

## Changed files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/types.ts`
- `src/features/workbench/sampleData.ts`
- `src/features/workbench/outputPlan.ts`
- `src/features/workbench/store.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src-python/pdf_workbench_engine/jobs/export_workspace.py`
- `src-python/pdf_workbench_engine/services/pdf_document.py`
- Deleted `src-python/pdf_workbench_engine/services/text_overlay.py`
- `src-python/README.md`
- `docs/processing_engine_plan.md`
- `docs/tauri_ui_redesign_plan.md`
- `docs/reports/2026-05-15-batch-selection-confirm-protected-pdf.md`

## User-visible behavior

- `Ctrl`/`Cmd` click toggles file/page selection. `Shift` click selects a contiguous range.
- Changing tools clears current selections.
- Drag reorder and arrow reorder move selected file/page groups when the dragged target is selected.
- Scissors, trash/page exclusion, and decorations apply to selected pages as a batch when the clicked page is selected.
- Header, footer, and watermark application on selected file cards applies to all selected files.
- File-level removal asks for confirmation inside the app and removes files from the workspace after confirmation.
- Search/replace is no longer shown.
- Copy-protected PDFs that open with an empty password should be handled as normal PDFs.

## Verification commands

- `npx tsc --noEmit` passed.
- `python -m py_compile src-python\pdf_workbench_engine\jobs\export_workspace.py src-python\pdf_workbench_engine\services\pdf_document.py` passed.
- `npm run build` first failed inside sandbox with Vite `spawn EPERM`, then passed with approved elevated execution.

## Screenshot paths

- Not captured in this change. The behavior is interaction-heavy and should be checked in the Tauri window during the next UI smoke pass.

## Known limitations

- Full password-entry UX for PDFs that truly require a user password remains out of scope for this change.
- Batch decoration behavior is state-based; users must select the intended file/page group before applying the tool.

## Next recommended step

- Run a Tauri UI smoke check at 1366x768 and verify modifier selection, file confirmation dialog keyboard behavior, and selected-group D&D with real pointer input.

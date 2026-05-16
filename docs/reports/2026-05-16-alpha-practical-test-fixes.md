# 2026-05-16 Alpha Practical-Test Fixes

## Scope

- Fixed bottom output-bar wrapping after export completion.
- Fixed log drawer stacking/opacity over page header/footer preview labels.
- Added split-output name and save-destination editing from the bottom output-name area.
- Connected custom output names to the Python export worker through `outputDir` and `outputNames[]`.

## Changed files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/backend.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src/features/workbench/fileInput.ts`
- `src/features/workbench/outputPlan.ts`
- `src/features/workbench/store.ts`
- `src/features/workbench/types.ts`
- `src-python/pdf_workbench_engine/jobs/export_workspace.py`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## User-visible behavior

- The bottom output area now includes an edit icon next to planned output names.
- The output-name editor lets users set the save destination folder and every split output PDF name together.
- Applying those settings makes export use the saved destination and names directly, without asking for a file name or folder again at export time.
- Reset requires confirmation and restores automatic names/destination handling.
- If all file cards are removed and the workspace becomes blank, custom output settings reset.
- The completed export status and `開く` / `フォルダ` / `ログ` buttons stay on one line at 1366x768.
- The log drawer is opaque and layered above page decoration labels.

## Verification commands

- `npm run typecheck`  
  Result: passed.
- `npm run build`  
  Result: initial sandbox run failed with Vite/Rolldown `spawn EPERM`; unsandboxed rerun passed.
- `python -m py_compile src-python\pdf_workbench_engine\jobs\export_workspace.py`  
  Result: passed.
- Browser visual check at `http://127.0.0.1:5173/?fixture=workbench` with 1366x768 viewport.  
  Result: passed for log drawer stacking, output-name editor apply/reset, and completed-status bottom bar density.

## Screenshot paths

- `docs/reports/screenshots/2026-05-16-output-log-layout-1366x768.png`
- `docs/reports/screenshots/2026-05-16-output-name-editor-applied-1366x768.png`
- `docs/reports/screenshots/2026-05-16-output-bar-complete-1366x768.png`

## Known limitations

- Browser mode validates UI state and layout only. The OS folder picker and actual custom output file writes should be verified in the Tauri executable with real PDFs/Office files.
- Browser-mode export completion does not produce `lastOutputFiles`, so the `開く` and `フォルダ` buttons were covered by layout CSS/build checks, not by a browser-mode click path.

## Next recommended step

- Run a Tauri executable smoke test using two or more split outputs, set a custom destination and names, export, and confirm the exact files are written without a second export-time destination prompt.

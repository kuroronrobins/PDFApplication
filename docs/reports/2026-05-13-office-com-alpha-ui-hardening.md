# Office COM / Alpha License / UI Hardening

## Scope

Implemented the requested file-order layout hardening, loading-card containment, log wrapping, selected startup picture crop adjustment, alpha expiration check, and Office COM conversion bridge fix.

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/backend.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src-python/pdf_workbench_engine/jobs/convert_office.py`
- `src-tauri/src/lib.rs`
- `public/assets/splash-workbench-a.png`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`
- `docs/processing_engine_plan.md`
- `docs/reports/2026-05-13-office-com-alpha-ui-hardening.md`
- `docs/reports/screenshots/2026-05-13-office-ui-layout-1366x768.png`
- `docs/reports/screenshots/2026-05-13-startup-splash-a-picture.png`

## User-Visible Behavior

- The file-order tray now visually extends to the right edge instead of leaving a plain empty area.
- The `D&D対応` header chip is removed.
- Loading/converting file cards keep their spinner, status badge, error text, metadata, and buttons inside the card.
- Long startup/session paths in the log drawer wrap inside the panel.
- Office conversion results now flow back into the real PDF processing path through `outputPath` / `cachePath`.
- The splash A picture is shown more pulled back without exposing blank margins.
- Alpha builds are valid through 2026-06-30. From 2026-07-01 00:00:00 JST, startup shows an expiration screen instead of the workbench.

## Verification Commands

- `npm run typecheck`: passed.
- `python -m compileall src-python\pdf_workbench_engine`: passed.
- `cargo check`: passed.
- `npm run build`: failed inside the sandbox with Vite `spawn EPERM`; rerun outside the sandbox passed.
- `python -c "import win32com.client; print('pywin32 ok')"` with `PYTHONPATH=src-python`: passed.
- Office worker smoke with a missing `.docx`: returned expected `input_not_found`, confirming `sourcePath` is passed to the worker.
- `npm run tauri build`: passed outside the sandbox and produced release exe plus MSI/NSIS bundles.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-13-office-ui-layout-1366x768.png`
- `docs/reports/screenshots/2026-05-13-startup-splash-a-picture.png`

## Known Limitations

- Real Word/Excel/PowerPoint COM conversion was later exercised with actual Office documents in `docs/reports/2026-05-13-office-com-e2e.md`.
- Python runtime and dependency packaging for distribution PCs remains a release task.
- The alpha check is intentionally simple local time checking. It is not a tamper-resistant licensing system.

## Next Recommended Step

Run the same Office scenario from the generated release executable and verify Explorer drag-and-drop plus UI logs.

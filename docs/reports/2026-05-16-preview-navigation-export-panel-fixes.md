# 2026-05-16 Preview Navigation, Export, and Panel Fixes

## Scope

- Remove the one-beat delay from export preview page navigation.
- Fix decorated export failure: `NameError: name 'os' is not defined`.
- Restore immediate header/footer settings panel visibility when the tool is clicked.

## Changed files

- `src/App.tsx`
- `src/features/workbench/store.ts`
- `src-python/pdf_workbench_engine/services/pdf_decorations.py`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## User-visible behavior

- Preview page changes update the current page, header text, and selected filmstrip card immediately.
- The large preview displays the lightweight thumbnail first and swaps to the high-resolution preview after it has loaded.
- Filmstrip current-page scrolling is immediate rather than animated.
- Header/footer/watermark settings reopen even when the same already-selected tool is clicked again.
- Decorated export no longer fails at `os.replace`.

## Verification commands

- `npm run typecheck` - passed.
- `python -m py_compile src-python\pdf_workbench_engine\services\pdf_decorations.py src-python\pdf_workbench_engine\jobs\export_workspace.py src-python\pdf_workbench_engine\jobs\render_decoration_overlay_page.py src-python\pdf_workbench_engine\cli.py` - passed.
- Decorated export smoke through `export_workspace` - passed. Summary: `docs/reports/e2e/2026-05-16-preview-panel-export-fixes/summary.json`.
- `npm run build` - passed outside the sandbox after sandbox `spawn EPERM`.
- Browser visual check at 1366x768 using `?fixture=workbench` - passed for header panel reopen and preview p1 to p2 navigation.

## Screenshot paths

- `docs/reports/screenshots/2026-05-16-preview-navigation-panel-fixes-1366x768.png`

## Known limitations

- Browser fixture mode cannot validate the Tauri Python worker directly. The decorated export failure is covered by the direct Python worker smoke.

## Next recommended step

- Re-check the same behavior in the packaged Tauri app with a real PDF/Office mixed workspace.

# 2026-05-16 Exact Export Preview

## Scope

Implement a completed-state export preview for header/footer/page-number output without freezing editing operations.

## Changed Files

- `src-python/pdf_workbench_engine/jobs/render_export_preview_page.py`
- `src-python/pdf_workbench_engine/cli.py`
- `src/features/workbench/backend.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src/App.tsx`
- `src/styles.css`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## User-Visible Behavior

- In Tauri runtime, the export preview renders each viewed page through the same worker-side page extraction and decoration pipeline used by export.
- The current preview page is requested first; neighboring pages are prefetched afterward.
- The edit screen does not wait for preview rendering. Header/footer edits remain normal state updates.
- If the preview page is still being rendered, the modal keeps showing the available thumbnail and displays a short status message.
- If Office/PDF preparation is still pending, the preview makes that wait explicit rather than appearing frozen.

## Verification Commands

- `python -m py_compile src-python\pdf_workbench_engine\jobs\render_export_preview_page.py src-python\pdf_workbench_engine\cli.py`: passed.
- Python worker smoke test comparing preview PNG against rendered final export output: passed. Two split output previews matched rendered final PDFs pixel-for-pixel at 2.25x zoom.
- `npm run typecheck`: passed.
- `npm run build`: passed outside sandbox after the known Vite/Rolldown `spawn EPERM` limitation was avoided.
- Headless Edge visual check at 1366x768 using `?fixture=workbench`: passed. The preview modal opened, had no body overflow, and kept stage/filmstrip/actions within the viewport.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-16-exact-preview-ui-1366x768.png`

## Evidence

- Worker smoke summary: `docs/reports/e2e/2026-05-16-exact-export-preview/summary.json`
- Browser UI summary: `docs/reports/e2e/2026-05-16-exact-export-preview/browser-ui-summary.json`
- Preview/final-render comparison PNGs: `docs/reports/e2e/2026-05-16-exact-export-preview/`

## Known Limitations

- Exact completed preview requires the Tauri worker runtime. Browser fixture mode validates layout only.
- The preview is exact for the visual page output. Output encryption is not visually represented because it does not change page pixels.

## Next Recommended Step

Run the installed/release Tauri executable with a real Office-derived workspace and confirm that the modal status appears only inside preview, while the main editing screen stays interactive.

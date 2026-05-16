# 2026-05-16 Exact Preview Speed-Up

## Scope

Make exact completed-state preview appear much faster without lowering output fidelity or blocking editing.

## Changed Files

- `src-python/pdf_workbench_engine/jobs/render_export_preview_page.py`
- `src/features/workbench/backend.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src/App.tsx`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## User-Visible Behavior

- The app starts preparing the first completed preview page after editing settles and all files are ready.
- If that prewarm has completed, opening export preview shows the exact completed page immediately from the React session cache.
- Reopening or revisiting the same exact preview page reuses deterministic PNGs from the session preview cache.
- The current page render skips filmstrip-thumbnail generation first, so the large page view is prioritized.
- Editing remains the priority path. Prewarm is delayed and skipped while export is running or files are still being prepared.

## Verification Commands

- `python -m py_compile src-python\pdf_workbench_engine\jobs\render_export_preview_page.py src-python\pdf_workbench_engine\cli.py`: passed.
- `npm run typecheck`: passed.
- Python speed smoke test: passed.
- `npm run build`: passed outside sandbox after the known Vite/Rolldown `spawn EPERM` limitation was avoided.

## Measured Result

Using the existing decorated split-output PDF fixture:

- Cold large-preview render, thumbnail skipped: 510.9 ms.
- Repeated large-preview cache hit: 31.9 ms.
- Add thumbnail after large preview was cached: 404.3 ms.
- Repeated preview plus thumbnail cache hit: 33.7 ms.
- First-output preview remained pixel-exact against the rendered final export PDF.

The most important user-facing path is stronger than the worker-only number: if prewarm finished before the user opens preview, the modal reads from the React session cache and does not make a worker call for that first page.

## Evidence

- Speed summary: `docs/reports/e2e/2026-05-16-exact-preview-speed/summary.json`

## Known Limitations

- The very first exact render after a fresh edit still needs worker time if the user opens preview before the 650 ms prewarm delay plus render time has elapsed.
- Prewarm intentionally covers only the first output page to avoid stealing resources from editing.

## Next Recommended Step

If this still feels slow on very large real PDFs, add a persistent worker process for preview jobs so even cold renders avoid Python process startup cost.

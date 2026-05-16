# 2026-05-16 Preview Navigation Queue

## Scope

- Make export-preview page navigation remain fast before decoration preview generation completes.
- Avoid launching Python worker jobs and high-resolution image decoding for every intermediate page during rapid arrow-key movement.
- Keep completed-state decoration refinement available shortly after the user stops on a page.

## Changed files

- `src/App.tsx`
- `src/features/workbench/backend.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src-python/pdf_workbench_engine/cli.py`
- `src-python/pdf_workbench_engine/jobs/render_decoration_overlay_page.py`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## User-visible behavior

- Arrow-key movement updates the current page and active filmstrip item immediately from lightweight preview images.
- Decoration manifest and transparent PNG generation wait until navigation settles, then run current page first.
- Adjacent page refinement runs later and sequentially, reducing CPU, disk, and process-start pressure.
- Transparent PNG overlay generation reuses the already-generated manifest, so the exact overlay arrives with less repeated work.

## Verification commands

- `npm run typecheck` - passed.
- `python -m py_compile src-python\pdf_workbench_engine\jobs\render_decoration_overlay_page.py src-python\pdf_workbench_engine\cli.py` - passed.
- Python manifest-to-overlay smoke - passed. Summary: `docs/reports/e2e/2026-05-16-preview-navigation-queue/summary.json`.
- `npm run build` - passed outside the sandbox after sandbox `spawn EPERM`.
- Browser fixture check at 1366x768 - passed. 12 rapid ArrowRight presses completed in 253ms; 60ms later the modal meta and active filmstrip item both showed `p13`.

## Screenshot paths

- `docs/reports/screenshots/2026-05-16-preview-navigation-queue-1366x768.png`

## Known limitations

- Browser fixture mode validates the fast navigation path and layout, but it cannot execute Tauri Python worker calls from the UI. The new overlay-manifest worker command is covered by the direct Python smoke.

## Next recommended step

- Re-check in the packaged Tauri runtime with a large mixed PDF/Office workspace to confirm the same responsiveness while real worker jobs are available.

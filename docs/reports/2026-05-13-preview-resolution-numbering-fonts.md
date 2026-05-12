# 2026-05-13 Preview Resolution, Numbering, and Fonts

## Scope

- Raised export-preview render quality by generating a dedicated high-resolution preview PNG alongside the smaller thumbnail PNG.
- Changed preview and main decoration rendering so `{page}` / `{total}` use the post-merge output page sequence.
- Reworked the preview filmstrip row so thumbnails are contained by the modal grid row instead of being clipped by a tight fixed-height strip.
- Connected the preview info icon to an explanatory popover.
- Updated UI/PDF decoration font selection to prefer gothic/sans Japanese-compatible fonts.

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/backend.ts`
- `src/features/workbench/types.ts`
- `src/features/workbench/store.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src-python/pdf_workbench_engine/jobs/export_workspace.py`
- `src-python/pdf_workbench_engine/jobs/render_thumbnail.py`
- `src-python/pdf_workbench_engine/jobs/render_thumbnails.py`
- `src-python/pdf_workbench_engine/services/pdf_document.py`
- `src-python/pdf_workbench_engine/services/pdf_decorations.py`
- `src-python/pdf_workbench_engine/services/pdf_fonts.py`
- `src-python/pdf_workbench_engine/services/text_overlay.py`

## User-Visible Behavior

- The large export-preview page uses `previewPath` when available, with a higher PDF render zoom than the compact thumbnail strip.
- Preview thumbnails sit inside a dedicated grid row and no longer have their top edge hidden by the modal.
- The top info icon opens and closes a compact explanation popover.
- Header/footer/page-number placeholders render with output PDF numbering after merge and split.
- Decorations use a gothic/sans font stack in the UI and prefer Windows gothic fonts for PDF output.

## Verification Commands

- `npm run typecheck` passed.
- `python -m compileall src-python\pdf_workbench_engine` passed.
- `npm run build` failed once in the sandbox with `spawn EPERM`; rerun outside the sandbox passed.
- `npm run tauri build` failed once in the sandbox with `spawn EPERM`; rerun outside the sandbox passed and produced MSI/NSIS bundles.
- Browser visual check against the built app fixture passed.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-13-preview-resolution-layout-1366x768.png`

## Known Limitations

- The development fixture uses placeholder pages rather than real PDF thumbnail images, so visual clipping was verified structurally and with placeholders.
- Existing files already loaded before this change may not have a `previewPath`; reloading/re-adding files regenerates high-resolution preview PNGs.

## Next Recommended Step

- Verify with real scanned and text-heavy PDFs in Tauri runtime to confirm that the higher-resolution preview PNG makes small text readable in the modal.

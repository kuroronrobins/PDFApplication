# 2026-05-16 Decoration Manifest Overlay Preview

## Scope

- Replace the completed full-page export-preview PNG path with a lightweight PDF-coordinate decoration manifest plus asynchronous transparent decoration PNG.
- Keep page navigation and editing responsive. The preview must not block on full PDF rendering.
- Remove obsolete exact-preview worker code and active command references.
- Fix a regression where the large preview page collapsed to a tiny center box because the page image was absolutely positioned and no longer created parent dimensions.

## Changed files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/backend.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src-python/pdf_workbench_engine/cli.py`
- `src-python/pdf_workbench_engine/jobs/render_decoration_overlay_page.py`
- `src-python/pdf_workbench_engine/services/pdf_decorations.py`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

Removed from active code:

- `src-python/pdf_workbench_engine/jobs/render_export_preview_page.py`

## User-visible behavior

- In the Tauri runtime, export preview requests a small manifest for the current output page. The manifest contains page size, final header/footer/page-number/watermark text, PDF-point rectangles, alignment, font size, color, and rotation.
- The preview first draws the manifest as an SVG overlay over the existing page preview image, so arrow-key and button navigation are not blocked by preview PDF generation.
- A transparent PyMuPDF-rendered decoration PNG is generated in the background for the current and neighboring pages. When ready, it replaces the SVG overlay without changing page size or controls.
- Visible waiting remains limited to source preparation, such as Office/PDF conversion. Decoration overlay refinement does not show a blocking `作成中` panel.
- The large preview page frame is now sized from the measured preview canvas and the page aspect ratio. It no longer depends on an absolutely positioned image to create layout size.
- If the high-resolution preview image cannot load, the modal falls back to the thumbnail image instead of leaving the large preview blank.

## Verification commands

- `npm run typecheck` - passed.
- `python -m py_compile src-python\pdf_workbench_engine\services\pdf_decorations.py src-python\pdf_workbench_engine\jobs\render_decoration_overlay_page.py src-python\pdf_workbench_engine\cli.py` - passed.
- `npm run build` - passed outside the sandbox after sandbox `spawn EPERM`.
- Python E2E manifest/transparent overlay smoke - passed. Summary: `docs/reports/e2e/2026-05-16-decoration-overlay/summary.json`.
- Active-code cleanup audit with `rg` for old exact-preview symbols - passed with no matches under `src` and `src-python`.
- Repository hygiene audit removed generated browser profile cache directories from older E2E evidence; report outputs now keep PDFs, PNGs, and summaries without browser runtime cache trees.
- Browser visual check at 1366x768 using `?fixture=workbench` - passed. The large preview frame measured 332 x 469 px instead of collapsing to a tiny center box.

## Screenshot paths

- `docs/reports/screenshots/2026-05-16-decoration-manifest-overlay-1366x768.png`
- `docs/reports/screenshots/2026-05-16-preview-blank-fix-1366x768.png`

## Known limitations

- Browser fixture mode cannot call the Tauri Python worker, so it verifies modal layout only. Manifest and transparent-PNG preview behavior is covered by Python E2E and TypeScript integration checks.
- The SVG layer uses browser text rendering until the transparent PyMuPDF PNG arrives. The manifest carries the same PDF coordinates and measured text width to minimize the difference.

## Next recommended step

- Run one manual Tauri preview smoke with a real PDF/Office mixed workspace and confirm that the SVG layer is replaced by the transparent PNG without a visible layout shift.

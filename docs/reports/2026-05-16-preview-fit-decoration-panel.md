# 2026-05-16 Preview Fit and Decoration Panel Fixes

## Scope

Fix the export preview clipping issue, prevent duplicate header/footer values in the same page slot, and make header/footer settings available before applying them to a page.

## Changed files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/store.ts`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## User-visible behavior

- Export preview pages are scaled from the measured preview canvas, so the whole page stays visible inside the modal.
- The app no longer draws the page-kind label over the preview page, preventing it from covering footer content.
- Selecting the header or footer tool immediately opens the settings panel before any page click.
- Reapplying a header/footer/page-number to the same page and visual slot replaces the previous effective value instead of stacking another decoration.
- If the previous value came from an all-page or file-level decoration, the page is excluded from that broader decoration before the page-specific value is added.

## Verification commands

- `npm run typecheck`: passed.
- `npm run build`: sandbox run failed with Vite/Rolldown `spawn EPERM`; rerun outside the sandbox passed.
- Playwright + local Headless Edge at `http://127.0.0.1:5173/?fixture=workbench`, viewport 1366x768: passed.

## Browser verification result

- Header/footer settings panel was visible immediately after selecting the footer tool, before any page click.
- Applying `FIRST_FOOTER`, then applying `SECOND_FOOTER` to the same page and slot resulted in only `SECOND_FOOTER`.
- Duplicate marker after replacement: `false`.
- Preview modal opened successfully.
- Preview page rectangle was fully inside the preview canvas.
- Document horizontal and vertical overflow at 1366x768: `false`.

## Evidence

- Screenshot: `docs/reports/screenshots/2026-05-16-preview-fit-decoration-panel-1366x768.png`
- UI summary JSON: `docs/reports/e2e/2026-05-16-preview-fit-decoration-panel/browser-ui-summary.json`

## Known limitations

- Browser fixture mode validates the React preview fit and decoration behavior. Exact completed-PNG replacement in the Tauri runtime still depends on the worker path.
- The fit calculation uses the rendered image aspect ratio when known and falls back to a portrait page ratio until image dimensions are available.

## Next recommended step

Run a Tauri runtime smoke test with real portrait, landscape, and unusually tall or small PDFs to confirm the same fit behavior with worker-rendered preview images.

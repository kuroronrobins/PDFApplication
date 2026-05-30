# 2026-05-30 Goal Preview And Decoration UX

## Scope

- Improve export preview usability by adding a progressive high-quality main preview image path.
- Move header/footer/page-number/watermark settings from the page-covering bottom-right popup to a compact toolbar above the page timeline.

## Changed Files

- `src/App.tsx`
- `src/features/workbench/engineWorkflow.ts`
- `src/styles.css`
- `docs/reports/screenshots/2026-05-30-goal-ux-decoration-toolbar.png`
- `docs/reports/screenshots/2026-05-30-goal-ux-preview-modal.png`
- `docs/reports/e2e/2026-05-30-preview-zoom/`

## User-Visible Behavior

- Export preview now requests a higher-resolution current-page preview based on the visible preview frame and device pixel ratio, capped to avoid all-page high-resolution rendering.
- The current preview page is prioritized; adjacent pages are prefetched later at a lower priority.
- Header/footer/page-number/watermark settings now appear in a horizontal toolbar above the page timeline, so page cards remain visible and clickable.
- Page cards show a subtle target highlight while a decoration tool is active.

## Verification Commands

- `npm run typecheck` - PASS
- `npm run build` - PASS
- Browser validation at `http://127.0.0.1:5173/?fixture=large-pages`, viewport `1366x768`, DPR `1.75` - PASS
- Direct worker render:
  - `kind=render_thumbnails`, `thumbnailZoom=0.32`, `previewZoom=2.35`
  - Result: thumbnail `191x270`, preview `1399x1979`

## Browser Evidence

- Decoration toolbar geometry:
  - Toolbar bottom: `483`
  - Page timeline top: `525`
  - Floating decoration panel exists: `false`
  - Visible page cards: `72`
  - Page-number tool visible in the top tool row: `true`
- Header application:
  - Clicked visible page `p72`
  - Decoration count changed to `1`
  - Page text included `社外秘 p72`
- Preview modal:
  - Modal opened for `1200` pages.
  - Filmstrip rendered `18` visible items with virtual spacer, not all 1200 page items.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-30-goal-ux-decoration-toolbar.png`
- `docs/reports/screenshots/2026-05-30-goal-ux-preview-modal.png`

## Known Limitations

- Browser validation uses the virtual large-pages fixture, so the browser cannot trigger the Tauri-only `isTauriRuntime()` preview-image generation path.
- The direct Python worker render confirms the high-resolution image output path. A future desktop/Tauri UI pass with a real PDF should confirm the UI swaps from the lightweight image to the generated high-resolution preview image.

## Next Recommended Step

- Run a Tauri desktop smoke with a real PDF and confirm `data-preview-quality="high"` after the current page preview image is generated.

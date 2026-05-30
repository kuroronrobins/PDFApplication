# 2026-05-30 Page Operation UI Safety

## Scope

- Add auto-scroll while dragging expanded page thumbnails near the top or bottom of the page timeline.
- Keep the decoration settings panel position during the current session after drag, hide/reopen, and decoration-tool switches.
- Add a draggable horizontal divider between the file-order area and the page editor without changing the default initial layout.
- Keep page movement controls removed and preserve the one-screen workbench model.

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `docs/reports/e2e/2026-05-30-page-operation-ui/verify_page_operation_ui.cjs`
- `docs/reports/screenshots/2026-05-30-page-operation-ui-safety.png`

## User-Visible Behavior

- Page thumbnails can be dragged toward the timeline edge and the timeline scrolls automatically, so long page sets can be reordered without separate page movement controls.
- Decoration settings still appear as a compact floating panel. Dragging the header moves it, and the last session position is reused when reopening or switching header/footer/page-number/watermark tools.
- The file-order area keeps the same default height at first load, but the divider between file order and page editing can be dragged to resize the file-order area.
- The divider is keyboard focusable and supports Arrow/Page/Home/End/Escape height controls.

## Verification Commands

- `npm run typecheck` - PASS
- `npm run build` - PASS
- `node docs\reports\e2e\2026-05-30-page-operation-ui\verify_page_operation_ui.cjs` - PASS, Chrome headless CDP at `1366x768`

## Browser Evidence

- Target: `http://127.0.0.1:5173/?fixture=large-pages`
- Viewport: `1366 x 768`
- Initial file-order height: `260`
- Initial page-timeline height: `227`
- Page movement controls: `0`
- Visible page drag reordered stable page IDs: first ID moved from `large-performance-fixture-p1` to after `large-performance-fixture-p7`.
- Page drag safety: `selectedCount: 0`, `draggingCount: 0`, `dropMarkers: 0` after release.
- Edge auto-scroll during page drag: `scrollTop: 2456`.
- Decoration panel header text: `ヘッダードラッグで移動`.
- Decoration panel position after drag: `left 778 / top 443`.
- Decoration panel after hide/reopen: `left 778 / top 443`.
- Decoration panel after switching to footer: `left 778 / top 443`, header text changed to `フッタードラッグで移動`.
- Divider drag: file-order height `260 -> 319`; page-timeline height stayed `180`.
- Divider keyboard ArrowUp: file-order height `319 -> 307`.
- File card clipping after divider drag: `false`.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-30-page-operation-ui-safety.png`

## Known Limitations

- Divider height is session-only and resets on reload, matching the requested behavior.
- The floating panel position is also session-only and intentionally not persisted across app restarts.
- Validation used Chrome headless CDP for deterministic pointer and keyboard input because the in-app browser connection was intermittently slow during long drag runs.

## Next Recommended Step

- If users repeatedly resize the file-order area in the same way, consider adding optional per-session restoration across workspaces. Do not persist this by default until real usage confirms it is beneficial.

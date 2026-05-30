# 2026-05-30 Page Timeline Height Recovery

## Scope

- Remove the page movement/jump control row from the page editor.
- Keep the file-order strip slightly smaller while preventing file-card clipping.
- Restore decoration settings to a compact floating panel and make the panel draggable from an obvious header handle.

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `docs/reports/screenshots/2026-05-30-page-timeline-height-recovery.png`

## User-Visible Behavior

- Page editor no longer shows the page jump / first / last / split / excluded / decorated movement controls.
- Removing that row returns vertical space to the page thumbnail grid.
- File cards are shorter and fit inside the file-order strip without the horizontal scrollbar covering their controls.
- Header/footer/page-number/watermark settings are again shown as a floating panel.
- The decoration panel header shows a grip and `ドラッグで移動`, and dragging the header moves the panel.

## Verification Commands

- `npm run typecheck` - PASS
- `npm run build` - PASS
- Browser validation at `http://127.0.0.1:5173/?fixture=large-pages`, viewport `1366x768` - PASS

## Browser Evidence

- `timelineControlsCount`: `0`
- `decorationToolbarCount`: `0`
- `fileCardClippedVertically`: `false`
- `fileStrip`: `1333 x 229`
- `firstFileCard`: `178 x 207`
- `pageTimeline`: `1289 x 228`
- `visiblePageCards`: `72`
- Decoration panel header text: `ヘッダードラッグで移動`
- Dragging the panel header changed the panel inline position style to `left/top`.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-30-page-timeline-height-recovery.png`

## Known Limitations

- The floating decoration panel can still cover pages until the user moves it. This is intentional per the requested direction to restore the previous floating settings model while making the panel movable and discoverable.

## Next Recommended Step

- If repeated manual movement becomes tiring in real use, persist the last panel position per session so the panel reopens where the user left it.

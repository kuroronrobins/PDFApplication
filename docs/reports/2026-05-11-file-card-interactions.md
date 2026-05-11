# File Card Interaction Repair

Date: 2026-05-11

## Scope

Fixed the first real usability break reported after loading files:

- Clicking a loaded file card did not expand it into page thumbnails.
- The visible top-right arrow icons looked clickable but did not reorder files.
- The store-level `moveFile(..., 1)` calculation did not move a file down by one slot.
- Multiple expanded files could exist while the timeline displayed only the first expanded file.

## Changed Files

- `src/App.tsx`
- `src/features/workbench/store.ts`
- `src/styles.css`

## User-Visible Behavior

- A ready file card can now be clicked to open or close the page timeline.
- Keyboard users can focus a file card and press Enter or Space to expand it.
- A not-yet-ready Office file card click still prioritizes conversion.
- The top-right up/down icons are now real buttons.
- Moving a file down by one slot now changes merge order correctly.
- Expanding another ready file switches the page timeline to that file instead of leaving the previous file as the active timeline.
- File drag-and-drop now uses the card itself as the drag image so the reorder gesture is visually clearer.

## Verification Commands

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| Store interaction smoke via bundled `store.ts` | Passed: add 2 PDFs, expand first, switch expansion to second, move down, move up |
| Codex browser render check | Passed: app loaded, console errors 0 |
| `npm run build` | Passed after rerun outside sandbox; sandbox run failed with `spawn EPERM` |
| `npm run tauri build` | Passed after rerun outside sandbox; sandbox run failed with `spawn EPERM` |

## Screenshot Paths

- `docs/reports/screenshots/2026-05-11-file-card-interactions-empty-check.png`

## Known Limitations

- The Codex browser cannot exercise the Tauri-native file picker, so loaded-file click behavior was verified through the Zustand store interaction smoke and by building the Tauri app.
- Real pointer drag of user-loaded PDF cards still needs manual confirmation in the Tauri window because browser fallback file upload is not equivalent to the desktop shell.

## Next Recommended Step

Manually open the freshly built Tauri app, load two PDFs, click each card, and verify the page timeline switches. Then drag one card over the other to confirm the insertion guide and final card order in the actual WebView.

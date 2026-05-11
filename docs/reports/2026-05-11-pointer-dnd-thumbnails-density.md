# Pointer D&D, Thumbnails, And Card Density

Date: 2026-05-11

## Scope

Addressed the follow-up usability issues reported from the Tauri window:

- File cards could be reordered with arrow buttons but not by drag and drop.
- File-level and page-level thumbnails were not visible.
- File cards were too wide, making it difficult to scan many files horizontally.

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.lock`

## User-Visible Behavior

- File card reorder now uses pointer-based dragging instead of relying on browser HTML drag/drop.
- A dragged file card shows a compact ghost card near the cursor and updates the insertion guide.
- Page thumbnail reorder also uses pointer-based dragging while the Select tool is active.
- Toolbar tool drag/drop onto pages remains available for scissors, trash, headers, footers, page numbers, and watermarks.
- File cards now show the first generated page thumbnail when available.
- Page thumbnails are now allowed through Tauri's asset protocol from the session temp cache.
- File cards no longer stretch across the available row; they use a compact 190-220px track so more files fit in one row.

## Verification Commands

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run build` | Passed after rerun outside sandbox; sandbox run failed with `spawn EPERM` |
| `npm run tauri build` | Passed |
| Codex browser render check | Passed: empty workbench rendered with console errors 0 |

## Screenshot Paths

- `docs/reports/screenshots/2026-05-11-pointer-dnd-thumbnail-config-empty-check.png`

## Known Limitations

- The Codex browser cannot exercise the native Tauri file picker or real Windows WebView pointer D&D with user-selected PDFs. The app was rebuilt successfully, but real loaded-file D&D and thumbnail rendering should be manually checked in the Tauri window.
- Thumbnail display depends on the background PDF inspection job completing. A newly added PDF can briefly show the document icon before the first page thumbnail appears.

## Next Recommended Step

Open the built Tauri app, add two PDFs, wait for the cards to return to `PDF準備完了`, then confirm:

- dragging one file card over another changes the order;
- expanding a file shows page thumbnails instead of a broken image icon;
- dragging page thumbnails changes page order.

# 2026-05-15 File Strip Scroll and Export Button UX

## Scope

- Improve the hover/active/disabled states of primary blue export buttons.
- Prevent large file sets from being clipped in the file-order area.
- Improve file-card drag reorder UX when moving across a long horizontal list.

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`
- `docs/reports/2026-05-15-file-strip-scroll-export-button.md`

## User-Visible Behavior

- The main `書き出し` button and preview confirmation button no longer turn white on hover.
- Primary export actions now darken, lift slightly, and keep a strong blue affordance on hover.
- File cards are laid out as one horizontal strip. When many files are added, users can scroll horizontally instead of losing cards below the visible area.
- During file-card drag reorder, dragging near the left or right edge auto-scrolls the strip so users can continue moving a file across a large workspace.

## Verification Commands

- `npm run typecheck`: passed.
- `npm run build`: passed outside sandbox. The normal sandboxed path is known to hit Vite/Rolldown `spawn EPERM` in this environment.
- `npm run tauri build`: passed and regenerated the release executable plus NSIS/MSI installers.
- Headless Edge screenshot capture: passed.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-15-file-strip-scroll-export-button-1366x768.png`

## Known Limitations

- The long-distance drag auto-scroll logic is implemented and typechecked, but the exact pointer feel should be manually verified in the Tauri window with more files than fit horizontally.
- The screenshot fixture contains four files, so it validates the normal layout and button state but not the scrollbar under a large real file set.

## Next Recommended Step

- Add 8-12 real files in the installed app, drag a file to both strip edges, and tune edge size/speed if the auto-scroll feels too fast or too slow.

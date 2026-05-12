# 2026-05-12 Event Permission And Layout Fix

## Scope

- Fix Tauri event permissions blocking Explorer drag/drop and export progress streaming.
- Rename the first toolbar tool from "選択" to "並び替え".
- Adjust the 1366x768 workbench layout so file cards and page cards stay inside their visual containers.

## Changed Files

- `src-tauri/capabilities/default.json`
- `src/App.tsx`
- `src/styles.css`
- `docs/implementation_roadmap.md`
- `docs/tauri_ui_redesign_plan.md`
- `docs/reports/2026-05-12-event-permission-layout-fix.md`
- `docs/reports/screenshots/2026-05-12-layout-fix-1366x768.png`

## User-Visible Behavior

- Tauri frontend event listening is now allowed via `core:event:default`.
- Explorer drag/drop listener startup should no longer log `event.listen not allowed`.
- Export worker progress streaming should no longer fail before the worker starts with `event.listen not allowed`.
- The first toolbar button is labeled `並び替え`, matching the actual file/page ordering behavior.
- File cards no longer overflow below the file-order section at 1366x768.
- The first page thumbnail in the page timeline has additional left padding and does not sit against or outside the band boundary.

## Verification Commands

- `npm run typecheck`: success
- `npm run build`: success outside sandbox
- `npm run tauri build`: success outside sandbox
- Headless Chromium CDP layout verification at 1366x768: success

## Screenshot Paths

- `docs/reports/screenshots/2026-05-12-layout-fix-1366x768.png`

## Known Limitations

- Explorer drag/drop was fixed at the Tauri permission/configuration layer and validated by successful Tauri build. A manual Explorer-to-window drop should still be confirmed on the user's desktop because that interaction cannot be reproduced inside the headless browser verification.

## Next Recommended Step

- Open the rebuilt Tauri app and manually verify: Explorer multi-file drop, PDF page expansion, decoration, preview, and export to `Downloads`.

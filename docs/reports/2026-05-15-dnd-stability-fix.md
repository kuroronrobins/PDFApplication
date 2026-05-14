# 2026-05-15 DnD stability fix

## Scope

Stabilized file-card drag autoscroll and prevented the external file-drop overlay from appearing during internal page/file drag operations.

## Cause

- File-card autoscroll used fixed pixels per animation frame, so actual speed changed when `requestAnimationFrame` cadence changed.
- Edge intensity was not clamped, so dragging beyond the strip edge could exceed the intended maximum speed.
- The file strip used smooth scroll behavior during programmatic drag scrolling, which could make repeated `scrollLeft` writes feel inconsistent.
- The external OS/browser file-drop overlay used a global `dropActive` state and did not know when an internal pointer drag was active.
- Page thumbnail images were not explicitly marked non-draggable, so a rare native image drag path could interfere with page reordering.

## Changed files

- `src/App.tsx`
- `src/styles.css`

## User-visible behavior

- File-card edge autoscroll now uses elapsed time and a capped pixels-per-second speed.
- File-card edge autoscroll speed should remain consistent even when frame timing varies.
- Internal file/page drag clears and suppresses the external "drop files here" overlay.
- Page thumbnail images no longer start native browser image drags.

## Verification commands

- `npm run typecheck` passed.
- `npm run build` initially failed inside the sandbox with `spawn EPERM`.
- `npm run build` passed after running outside the sandbox with approval.

## Screenshot paths

None. This change is event handling behavior only; no visible layout change was intended.

## Known limitations

- Manual drag testing in the installed Tauri window is still recommended because OS drag/drop event ordering can differ from browser-only behavior.

## Next recommended step

Perform a manual Tauri smoke test with many file cards and repeated page thumbnail drags near the workbench boundary.

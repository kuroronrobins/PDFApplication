# 2026-05-22 Removal Confirmation and Export Completion Popup

## Scope

- Keep file-card removal protected by the existing confirmation dialog.
- Remove the confirmation dialog from page trash/exclude and restore actions.
- Show a compact in-app popup when an export job completes.

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`
- `docs/reports/2026-05-22-removal-export-completion-popup.md`

## User-Visible Behavior

- Clicking or dropping the trash tool on a page immediately toggles that page or selected page batch between included and excluded.
- File-card removal still opens the confirmation dialog before removing files from the workspace.
- After export completion, a popup appears above the bottom bar with `出力が完了しました` and the output file name summary.

## Verification Commands

- `npm run typecheck`: passed.
- `npm run build`: failed inside the sandbox with Vite `spawn EPERM`; rerun outside the sandbox and passed.
- Vite fixture server: started at `http://127.0.0.1:5173/?fixture=workbench`.

## Browser Verification

- At 1366x768, selected the trash tool and clicked page `appendix-1`: page became excluded, excluded count changed to `2`, and `.confirm-dialog` count stayed `0`.
- Clicked the file-card remove button for `添付資料.pdf`: `.confirm-dialog` count became `1`.
- Clicked `書き出し` in browser fixture mode and waited for completion: `.export-completion-popup` count became `1`, with text `出力が完了しました2ファイル: 見積_PDF化_001.pdf, 見積_PDF化_002.pdf`.
- Browser console warnings/errors: none observed through the browser log API.

## Screenshot Paths

- Screenshot capture was attempted at 1366x768, but the in-app browser `Page.captureScreenshot` command timed out repeatedly. No screenshot file was produced in this run.

## Evidence Paths

- `docs/reports/e2e/2026-05-22-removal-export-completion-popup/browser-ui-summary.json`
- `docs/reports/vite-removal-export-popup.out.log`
- `docs/reports/vite-removal-export-popup.err.log`

## Known Limitations

- The visual check used the browser fixture. The popup is driven by shared `exportJob.completedAt` state, so the same notification path is used by browser fixture completion and Tauri engine completion, but a packaged Tauri smoke check was not run.
- Screenshot capture could not be saved because the browser screenshot command timed out.

## Next Recommended Step

- During the next packaged-app smoke test, confirm the completion popup after a real Tauri export with a user-selected destination.

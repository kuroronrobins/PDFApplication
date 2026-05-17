# 2026-05-18 Output Name Editor Button

## Scope

- Restore an app-bar entry point for the split-output filename editor.

## Changed files

- `src/App.tsx`
- `docs/tauri_ui_redesign_plan.md`
- `docs/reports/2026-05-18-output-name-editor-button.md`
- `docs/reports/screenshots/2026-05-18-output-name-editor-button-1366x768.png`

## User-visible behavior

- The top-right action row now includes `出力名` between redo and the job status/preview/export controls.
- The button is enabled when there is at least one active output page and no export job is running.
- Clicking `出力名` opens the existing output-name editor modal for split outputs, including destination folder, per-output filenames, apply, cancel, and reset confirmation.

## Verification commands

- `npm run build` - sandbox run failed with Vite `spawn EPERM`; rerun outside the sandbox passed.
- Static browser visual check at `http://127.0.0.1:4173/index.html?fixture=workbench` with 1366x768 viewport - passed. Verified the `出力名` button is present in `.app-actions`, opens the modal, and shows two split-output filename fields.

## Screenshot paths

- `docs/reports/screenshots/2026-05-18-output-name-editor-button-1366x768.png`

## Known limitations

- Browser fixture mode verifies the React layout and modal entry point only. Real save-folder selection still requires the Tauri desktop runtime.

## Next recommended step

- Check the same app-bar button in the packaged Tauri executable with a real cut/split workspace before release validation.

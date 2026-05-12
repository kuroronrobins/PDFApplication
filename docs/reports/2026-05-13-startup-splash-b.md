# Startup Splash B

## Scope

Implemented the selected B startup splash direction for PDF Workbench. The release app now starts with a compact static splash window, keeps the React workbench hidden during initial setup, then switches to the main workbench once frontend cache initialization settles.

## Changed Files

- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`
- `src-tauri/src/lib.rs`
- `src-tauri/src/main.rs`
- `src/App.tsx`
- `src/features/workbench/backend.ts`
- `public/splashscreen.html`
- `public/assets/splash-workbench-desk.svg`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`
- `docs/reports/2026-05-13-startup-splash-b.md`
- `docs/reports/screenshots/2026-05-13-startup-splash-b.png`

## User-Visible Behavior

- A 560x390 borderless splash window appears first in release startup.
- The splash uses the B-direction workbench desk artwork: PDF pages, stamp, scissors, lock, and completion check.
- The splash footer shows `Licensed to koki kurokawa` and `v0.1.0`.
- A subtle spinner and one-line loading status are always visible at the bottom.
- The main app window is hidden until the React workbench completes initial cache-session setup.
- Release Windows builds use `windows_subsystem = "windows"` so the console window is suppressed.
- The static splash window has no Tauri IPC permission requirement; dialog/event capability remains scoped to `main`.

## Verification Commands

- `npm run typecheck`: passed.
- `cargo check`: passed.
- `npm run build`: failed inside sandbox with Vite `spawn EPERM`, then passed outside sandbox.
- `npm run tauri build`: passed outside sandbox.
- Headless Edge screenshot capture: passed outside sandbox.
- `cargo fmt --check`: failed due existing unrelated formatting differences in `src-tauri/build.rs` and `src-tauri/src/python_worker.rs`.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-13-startup-splash-b.png`

## Known Limitations

- Splash progress messages are local rotating text, not live backend startup telemetry.
- `npm run tauri dev` still depends on the Vite dev server and may show development terminal output. The no-terminal startup flow targets release binaries.
- If the React workbench fails before calling `complete_startup`, the splash remains visible; a future hard error path can expose a retry/open-log action.

## Next Recommended Step

Run the generated release executable on the target Windows workflow and measure command-to-splash and splash-to-main timings.

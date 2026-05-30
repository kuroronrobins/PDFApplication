# 2026-05-25 Splash Residual Hardening

## Scope

- Reduce the chance that the startup splash window remains visible after the main PDF Workbench window is ready.
- Add a bounded fallback for cases where the frontend never reaches the normal startup-completion command.

## Changed files

- `src-tauri/src/lib.rs`
- `docs/implementation_roadmap.md`
- `docs/reports/2026-05-25-splash-residual-hardening.md`

## User-visible behavior

- Normal startup still keeps the splash visible for at least 4 seconds.
- When startup completes normally, the main window is shown and focused, then splash cleanup is scheduled on the Tauri main thread.
- Splash cleanup hides the splash first, force-destroys it second, and retries for a short period so a timing-dependent missed destroy does not leave the startup window visible.
- If frontend initialization does not call `complete_startup`, the Rust-side watchdog reveals the main window after 12 seconds and disposes the splash instead of leaving a permanent splash-only state.
- Duplicate startup-completion calls are safe and do not create another visible transition.

## Verification commands

- `cargo fmt --check` from `src-tauri/` - passed.
- `cargo check` from `src-tauri/` - passed.
- `npm run typecheck` - passed.
- `cargo test` from `src-tauri/` - passed.
- `npm run build` - sandbox run failed with Vite `spawn EPERM`; rerun outside the sandbox passed.
- `npm run tauri build` - sandbox run failed with Vite `spawn EPERM`; rerun outside the sandbox passed and produced the release executable, MSI, and NSIS installer.
- `src-tauri/target/release/pdf-workbench.exe --toolhub-smoke` - passed with `ok: true`, bundled Python found, active worker package found, and worker `ping` result.
- Direct release-executable startup repeated 5 times after the first one-shot cleanup attempt - failed, with splash still visible in 4/5 runs. The implementation was then changed to retry cleanup on the Tauri main thread.
- Direct release-executable startup repeated 5 times after the retrying cleanup fix - passed. Each run had one visible main `PDF Workbench` window and 0 visible `574x398` splash windows after 12 seconds.
- ToolHub payload was updated from the rebuilt release executable. The release exe and ToolHub payload exe SHA256 both matched `18A3CB0CB3514C8CD28B68EFF680E38FB031E61A033272FEC84FCBD2D0B46796`.
- ToolHub app entry startup from `C:/Users/kuroron/Documents/RD/20260426_Toolhub/apps/pdf_workbench/src/main.py --window main` repeated 5 times - passed. Each launcher run exited 0, produced one visible main window, and left 0 visible splash windows after 12 seconds.
- ToolHub app entry smoke from `C:/Users/kuroron/Documents/RD/20260426_Toolhub/apps/pdf_workbench/src` with `python main.py --toolhub-smoke` - passed with `ok: true`.

## Screenshot paths

- Not applicable. The splash artwork and workbench layout were not visually changed.

## Known limitations

- Native Win32 window enumeration was used for the direct and ToolHub-entry checks. It verifies visible top-level windows by process ID and size, but it does not replace a human visual check on a different machine or WebView2 build.

## Next recommended step

- Re-run the same 5-run ToolHub check after the next ToolHub release build or App Pack regeneration, because a future packaging step can overwrite `apps/pdf_workbench/src/assets/payload/pdf-workbench.exe`.

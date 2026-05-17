# Milestone Report: ToolHub Registration Structure

## Scope

Start ToolHub registration support without changing the PDF Workbench production architecture.

## Roadmap Tasks

- ToolHub registration layer
- Release payload smoke check
- Registration source staging

## Changed Files

- `.gitignore`
- `package.json`
- `scripts/stage-toolhub-app.ps1`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `toolhub/pdf_workbench/`
- `docs/implementation_roadmap.md`
- `docs/tauri_ui_redesign_plan.md`
- `docs/reports/2026-05-17-toolhub-registration-structure.md`

## User-Visible Behavior

No workbench UI behavior changed. The new behavior is operational:

- `pdf-workbench.exe --toolhub-smoke` runs a GUI-free release-payload smoke check.
- `toolhub/pdf_workbench/main.py` is the ToolHub-compatible Python entry point.
- `npm run stage:toolhub` creates a ToolHub registration source tree under `build/toolhub-registration/pdf_workbench/`.
- The launcher resolves only `assets/payload/pdf-workbench.exe` from the staged release payload. It does not fall back to development release paths.
- App Studio shared-env startup probes are routed to the GUI-free smoke path, so registration checks do not need to open the real desktop window.

## Verification

- `cargo check`: passed.
- `python -m py_compile toolhub\pdf_workbench\main.py toolhub\pdf_workbench\pdf_workbench_toolhub\launcher.py`: passed.
- `npm run build`: first sandbox run failed with Vite `spawn EPERM`; rerun outside the sandbox passed.
- `npm run tauri build`: passed outside the sandbox and rebuilt `src-tauri/target/release/pdf-workbench.exe`.
- `npm run stage:toolhub`: passed and created `build/toolhub-registration/pdf_workbench/` with launcher files, `.toolhubignore`, icon, manifest, package directory, and `assets/payload/`.
- `.\pdf-workbench.exe --toolhub-smoke` from `src-tauri/target/release`: passed with `ok: true`, bundled `src-python`, bundled Python runtime, and worker `ping`.
- `py main.py --toolhub-smoke` from `toolhub/pdf_workbench`: passed by resolving the local staged payload.
- `python main.py --toolhub-smoke` from `build/toolhub-registration/pdf_workbench`: passed with `ok: true`, staged payload, bundled Python runtime, and worker `ping`.
- App Studio-style no-argument startup probe from `toolhub/pdf_workbench`: passed by routing to smoke under `VIRTUAL_ENV` + `PYTHONDONTWRITEBYTECODE=1` without `TOOLHUB_APP_DIR`.
- App Studio `-Suggest` for `toolhub/pdf_workbench/main.py`: passed. Generated `final_app/src/assets/payload/pdf-workbench.exe`, included 1405 files, and reported 0 blocking secret findings / `Apply blocked: false`.
- `py main.py --toolhub-smoke` from App Studio generated `final_app/src`: passed.
- `TOOLHUB_APP_DIR=<final_app> py <final_app>/src/main.py --toolhub-smoke`: passed.

Not run:

- `python main.py --window main` was not run because it intentionally opens the desktop app and leaves the Tauri GUI process running after the short ToolHub startup check.

Notes:

- An intermediate staging cleanup filter removed too many files from the staged root. The script now filters generated Python files by extension instead, and the staging/smoke checks were rerun successfully.
- A ToolHub App Studio `-Suggest` pass against `toolhub/pdf_workbench/main.py` showed that a root `payload/` directory is not selected for packaging by the current shared-env source classifier. The registration payload was moved to `assets/payload/`, which App Studio treats as a code-referenced asset directory.
- The bundled Python runtime still produces non-blocking secret-scan warnings because standard library/vendor files contain variable names such as token/password. App Studio reports `Apply blocked: false`; no real credentials were found in blocking status.

## Screenshots

Not applicable. This change does not alter UI layout.

## Known Limitations

- The ToolHub source tree expects a staged release payload in `assets/payload/`.
- App Studio `-Suggest` is verified; full `-Apply` registration was not run in this pass, so ToolHub manifest/app-pack mutation remains unperformed.
- Office conversion still requires Microsoft Office on the target machine.
- Clean-machine ToolHub registration and installer validation remain separate manual checks.

## Next Step

Run the focused smoke checks, then use the staged source root with ToolHub App Studio dry-run/suggest/apply.

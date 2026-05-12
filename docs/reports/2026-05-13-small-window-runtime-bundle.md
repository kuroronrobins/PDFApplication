# 2026-05-13 Small Window / Bundled Runtime Release

## Scope

- Lower the minimum usable Tauri window size while keeping the one-screen workbench operable.
- Build a release executable after the UI change.
- Bundle the Python runtime and worker dependencies so an Office-installed PC does not need a separate Python installation for the processing engine path.

## Changed Files

- `.gitignore`
- `package.json`
- `scripts/build-python-runtime.ps1`
- `src-tauri/build.rs`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/python_worker.rs`
- `src/styles.css`
- `AGENTS.md`
- `docs/implementation_roadmap.md`
- `docs/processing_engine_plan.md`

This report also references the existing E2E bootstrap files added for release verification:

- `src-tauri/src/lib.rs`
- `src/App.tsx`
- `src/features/workbench/backend.ts`

## User-Visible Behavior

- The app now permits an 860x560 minimum window instead of the previous 1180x700 minimum.
- At small sizes, the header actions and tool buttons compress or scroll horizontally instead of forcing a large minimum size.
- The file-card area, page timeline, and bottom output bar keep usable structure at 860x560.
- The release build now includes `src-python` and a bundled Python runtime/dependency tree.

## Verification Commands

- `npm run typecheck` - passed.
- `cargo fmt --check` - passed after formatting the Rust worker change.
- `cargo check` in `src-tauri` - passed.
- `python -m compileall src-python\pdf_workbench_engine` - passed.
- `npm run build:python-runtime` - passed.
- `npm run build` - passed outside sandbox after Vite hit `spawn EPERM` in sandbox.
- `npm run tauri build` - passed.
- `build\python-runtime\python\python.exe -E -s -c "import pypdf,fitz,win32com.client,pythoncom; print('bundled python runtime ok')"` - passed.
- Release exe E2E with `PDF_WORKBENCH_DISABLE_PYTHON_FALLBACK=1`, no `PDF_WORKBENCH_PROJECT_ROOT`, and the three user-provided Office files - passed.
- Output PDF inspection using bundled Python/pypdf:
  - `small-runtime-e2e_001.pdf`: 7 pages.
  - `small-runtime-e2e_002.pdf`: 34 pages.

## Build Outputs

- `src-tauri/target/release/pdf-workbench.exe`
- `src-tauri/target/release/bundle/nsis/PDF Workbench_0.1.0_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/PDF Workbench_0.1.0_x64_en-US.msi`

## Screenshot Paths

- `docs/reports/screenshots/2026-05-13-small-window-860x560.png`
- `docs/reports/screenshots/2026-05-13-small-window-1366x768.png`

## E2E Evidence

- `docs/reports/e2e/2026-05-13-small-window-runtime/ui-result.json`
- `docs/reports/e2e/2026-05-13-small-window-runtime/outputs/small-runtime-e2e_001.pdf`
- `docs/reports/e2e/2026-05-13-small-window-runtime/outputs/small-runtime-e2e_002.pdf`

## Known Limitations

- This verifies the generated release executable on the current Office-equipped development PC with external Python fallback disabled. A separate clean Windows PC with Microsoft Office installed is still required to validate the installer and prove there is no accidental dependency on local development tooling.
- Manual Explorer drag-and-drop is still a separate smoke test because the controlled E2E bootstrap injects paths through environment variables.

## Next Recommended Step

- Install the generated NSIS or MSI package on a clean Office-equipped Windows PC, launch it normally, add PDF/Office files through Explorer drag-and-drop and the file picker, then export a mixed workspace.

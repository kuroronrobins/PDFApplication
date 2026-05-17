# 2026-05-17 Predeployment Hardening Fixes

## Scope

Pre-user-deployment hardening for the active Tauri/React/Python workbench:

- prevent concurrent background Office/PDF preparation workers
- make pre-export Office/PDF preparation jobs cancellable through the same Tauri streaming job boundary as export
- clean stale session-only cache directories on startup
- isolate current-version release artifacts before publishing

## Changed Files

- `AGENTS.md`
- `.gitignore`
- `package.json`
- `scripts/stage-release-artifacts.ps1`
- `src/features/workbench/backend.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src-tauri/src/lib.rs`
- `docs/implementation_roadmap.md`
- `docs/tauri_ui_redesign_plan.md`
- `docs/reports/2026-05-17-predeployment-hardening-fixes.md`

## User-Visible Behavior

- File preparation is now sequential by default. Expanding or prioritizing a file can reorder what runs next, but it will not create a second concurrent Office/PDF preparation worker.
- Cancelling export also cancels active Office conversion, PDF inspection, or thumbnail rendering launched during the pre-export preparation phase.
- A cancelled preparation returns the file to a retryable queued state instead of leaving a hard error on the file card.
- Old forced-exit session cache folders under the system temp cache root are removed on a later startup once they are older than 24 hours.
- Release publishing can target `build/release-artifacts/v0.1.1` after `npm run stage:release`, avoiding accidental upload of old installers left in `src-tauri/target/release/bundle`.

## Verification Commands

- `npm run typecheck`: passed.
- `python -m compileall src-python\pdf_workbench_engine`: passed.
- `cargo fmt --check` from `src-tauri`: passed after applying `cargo fmt`.
- `cargo check` from `src-tauri`: passed.
- `cargo test` from `src-tauri`: passed. The cache cleanup unit test passed.
- `npm run build`: initially failed in the sandbox with Vite/Rolldown `spawn EPERM`; the same command passed outside the sandbox.
- `npm audit --json`: passed with 0 vulnerabilities.
- `npm run tauri build`: passed outside the sandbox and regenerated the release executable plus NSIS/MSI bundles.
- `npm run stage:release`: passed and staged only current-version artifacts under `build/release-artifacts/v0.1.1`.
- Release executable E2E with `PDF_WORKBENCH_E2E=1`, `PDF_WORKBENCH_E2E_AUTORUN=1`, and `PDF_WORKBENCH_DISABLE_PYTHON_FALLBACK=1`: passed.
- Output PDF inspection through `inspect_pdf`: passed for both exported PDFs.
- Output preview rendering through `render_thumbnails`: passed for the first page of both exported PDFs.

## Installer Refresh

2026-05-17 refresh:

- `npm run tauri build`: passed and regenerated the release executable, MSI installer, and NSIS installer for version `0.1.1`.
- `npm run stage:release`: passed and refreshed `build/release-artifacts/v0.1.1`.
- `.\src-tauri\target\release\pdf-workbench.exe --toolhub-smoke`: passed with bundled Python runtime and worker `ping`.

Current staged artifacts:

| File | Bytes | SHA256 |
| --- | ---: | --- |
| `pdf-workbench.exe` | 11015680 | `5C2ABEECABC09B2D78F4C99BA9A201E1926AF93379F9A1D1F5A9E9F28607E39A` |
| `PDF Workbench_0.1.1_x64-setup.exe` | 41204688 | `FD821227D61702C00205F1675331F65E8FB72A0407DEAD61BA1B97944102C5A5` |
| `PDF Workbench_0.1.1_x64_ja-JP.msi` | 57397772 | `3C006D264498AC1AD02683123ACEF578205060543EED2D4EE3F1378A8FF2E0A7` |

## E2E Result

- Inputs: `job_history.xlsx`, `プレゼン資料 (003).pptx`, `生体機械力学１.docx`.
- Prepared files: 3 Office files, all `ready` / `cached`.
- Input pages: 41.
- Split markers: 1.
- Decorations: 3.
- Outputs:
  - `docs/reports/e2e/2026-05-17-predeployment-hardening/outputs/predeployment-e2e-result_001.pdf`: 7 pages, unencrypted.
  - `docs/reports/e2e/2026-05-17-predeployment-hardening/outputs/predeployment-e2e-result_002.pdf`: 34 pages, unencrypted.
- The E2E logs show Office conversion, PDF inspection, and thumbnail rendering running sequentially per file before export.

## Evidence

- `docs/reports/e2e/2026-05-17-predeployment-hardening/ui-result.json`
- `docs/reports/e2e/2026-05-17-predeployment-hardening/outputs/predeployment-e2e-result_001.pdf`
- `docs/reports/e2e/2026-05-17-predeployment-hardening/outputs/predeployment-e2e-result_002.pdf`
- `docs/reports/e2e/2026-05-17-predeployment-hardening/output-previews/output-001/predeployment-e2e-result_001-p1.png`
- `docs/reports/e2e/2026-05-17-predeployment-hardening/output-previews/output-001/preview/predeployment-e2e-result_001-p1.png`
- `docs/reports/e2e/2026-05-17-predeployment-hardening/output-previews/output-002/predeployment-e2e-result_002-p1.png`
- `docs/reports/e2e/2026-05-17-predeployment-hardening/output-previews/output-002/preview/predeployment-e2e-result_002-p1.png`
- `build/release-artifacts/v0.1.1/pdf-workbench.exe`
- `build/release-artifacts/v0.1.1/PDF Workbench_0.1.1_x64-setup.exe`
- `build/release-artifacts/v0.1.1/PDF Workbench_0.1.1_x64_ja-JP.msi`

## Screenshot Paths

None. This change has no UI layout or visual design change.

## Known Limitations

- Clean-machine installer validation still requires a separate Office-equipped Windows PC outside this development workspace.
- Manual Explorer drag-and-drop smoke verification still needs to be run on the target machine before broad user rollout.
- Large-PDF lazy thumbnail generation and full per-file input-password unlock UX remain separate product work.

## Next Recommended Step

Run the full local verification set, then perform clean-machine installer validation with Microsoft Office installed.

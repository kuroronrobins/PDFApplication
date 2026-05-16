# 2026-05-17 App-side IO Robustness Hardening

## Scope

Improve the app-side protections identified in `2026-05-16-load-export-robustness-risk-inventory.md` so obvious load/export failures are rejected early, worker errors are classified, and final output files are not overwritten until generated output is ready.

## Changed files

- `src-tauri/src/lib.rs`
- `src-tauri/src/python_worker.rs`
- `src/features/workbench/types.ts`
- `src/features/workbench/backend.ts`
- `src/features/workbench/store.ts`
- `src/App.tsx`
- `src-python/pdf_workbench_engine/services/pdf_document.py`
- `src-python/pdf_workbench_engine/jobs/convert_office.py`
- `src-python/pdf_workbench_engine/jobs/export_workspace.py`
- `docs/implementation_roadmap.md`
- `docs/tauri_ui_redesign_plan.md`

## User-visible behavior

- Missing, unreadable, empty, unsupported, temporary, cloud-placeholder, and extension/signature-mismatched inputs are rejected before they become file cards.
- Export now checks destination folder writability, existing locked files, invalid names, reserved Windows names, duplicate split-output names, and file/folder conflicts before conversion/export work starts.
- Applied split-output names and save destination are used directly at export time without another save dialog, but still receive the same destination preflight.
- Worker protocol failures now expose a bounded protocol error instead of only a generic parse failure.
- PDF open/render failures and Office conversion output failures are returned as classified worker errors.
- Final PDFs are written via a temporary same-folder file and replaced after successful generation, reducing risk to an existing output file when export fails.

## Verification commands

- `npm run typecheck` -> passed.
- `python -m compileall src-python\pdf_workbench_engine` -> passed.
- `cargo check --manifest-path src-tauri\Cargo.toml` -> passed.
- Python worker missing-file smoke: `inspect_pdf` on a nonexistent PDF -> returned `input_not_found`.
- Python worker empty-file smoke: `inspect_pdf` on a temporary zero-byte PDF -> returned `empty_input_file`.
- `npm run build` inside sandbox -> failed with Vite/Rolldown `spawn EPERM`.
- `npm run build` outside sandbox after approval -> passed.
- `git diff --check` -> passed, with only existing CRLF normalization warnings.

## Screenshot paths

None. This change does not alter visual layout; it changes load/export validation and worker error handling.

## Known limitations

- Office COM dialog blocking, Protected View, and password-required Office files still need targeted runtime tests on an Office-equipped PC.
- Disk-full behavior is classified in the Python final-save path, but was not simulated during this pass.
- Long-path, cloud-placeholder, and locked-output cases should be added to future E2E fixtures where they can be reproduced safely.

## Next recommended step

Build a small negative-case fixture suite for input preflight and export destination preflight, then run it against PDF, Word, Excel, and PowerPoint files on the target Windows machine.

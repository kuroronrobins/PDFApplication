# Tauri Release UI E2E Verification

## Scope

Executed the generated Tauri release executable and drove the real UI workflow through an environment-gated E2E bootstrap. The test used the user-provided files:

- `C:\Users\kuroron\Downloads\job_history.xlsx`
- User-provided PowerPoint sample: `C:\Users\kuroron\Downloads\...[PowerPoint sample] (003).pptx`
- User-provided Word sample: `C:\Users\kuroron\Downloads\...[Word biomechanics sample].docx`

The test covered release startup, session cache creation, Office-to-PDF conversion through Microsoft Office COM, thumbnail generation, UI state integration, header/footer/watermark placement, split output generation, export progress completion, and final output inspection.

## Changed Files

- `src-tauri/src/lib.rs`
- `src/App.tsx`
- `src/features/workbench/backend.ts`
- `AGENTS.md`
- `docs/implementation_roadmap.md`
- `docs/processing_engine_plan.md`
- `docs/reports/2026-05-13-tauri-release-ui-e2e.md`

## User-Visible Behavior

- Normal startup is unchanged and still opens an empty workbench.
- When `PDF_WORKBENCH_E2E=1` is explicitly set, the release executable can auto-load a controlled file list, export the workspace, and write a result JSON for repeatable E2E verification.
- The E2E-only commands are gated by environment variables and are not activated during normal user operation.

## E2E Result

Passed from `src-tauri\target\release\pdf-workbench.exe`.

Inputs:

| Input | Pages | State |
| --- | ---: | --- |
| `job_history.xlsx` | 7 | converted and cached |
| User-provided PowerPoint sample | 27 | converted and cached |
| User-provided Word sample | 7 | converted and cached |

Workspace:

- Active pages: 41
- Split markers: 1
- Decorations: 3
- Output PDFs: 2

Output files:

- `docs/reports/e2e/2026-05-13-tauri-release-ui/outputs/tauri-ui-e2e-result_001.pdf`
  - 7 pages
  - unencrypted
- `docs/reports/e2e/2026-05-13-tauri-release-ui/outputs/tauri-ui-e2e-result_002.pdf`
  - 34 pages
  - unencrypted

## Verification Commands

- `npm run typecheck`: passed.
- `cargo check` from `src-tauri`: passed.
- `python -m compileall src-python\pdf_workbench_engine`: passed.
- `npm run tauri build`: passed outside the sandbox and produced release exe plus MSI/NSIS bundles.
- Release executable E2E with `PDF_WORKBENCH_E2E=1`: passed.
- Output PDF inspection through `inspect_pdf`: passed for both exported PDFs.
- Output preview rendering through `render_thumbnails`: passed for both exported PDFs.

## Evidence

- `docs/reports/e2e/2026-05-13-tauri-release-ui/ui-result.json`
- `docs/reports/e2e/2026-05-13-tauri-release-ui/inspect-001.json`
- `docs/reports/e2e/2026-05-13-tauri-release-ui/inspect-002.json`
- `docs/reports/e2e/2026-05-13-tauri-release-ui/render-001.json`
- `docs/reports/e2e/2026-05-13-tauri-release-ui/render-002.json`
- `docs/reports/e2e/2026-05-13-tauri-release-ui/outputs/tauri-ui-e2e-result_001.pdf`
- `docs/reports/e2e/2026-05-13-tauri-release-ui/outputs/tauri-ui-e2e-result_002.pdf`
- `docs/reports/e2e/2026-05-13-tauri-release-ui/output-previews/output-001/preview/tauri-ui-e2e-result_001-p1.png`
- `docs/reports/e2e/2026-05-13-tauri-release-ui/output-previews/output-002/preview/tauri-ui-e2e-result_002-p1.png`
- `docs/reports/screenshots/2026-05-13-tauri-release-ui-e2e.png`

## Known Limitations

- The E2E bootstrap verifies controlled UI execution from the release executable. It does not replace manual Explorer drag-and-drop verification.
- The release process was terminated by the E2E harness after collecting evidence, so test-created session cache folders were manually removed from `%TEMP%\pdf-workbench-sessions`.
- Python runtime and dependency packaging for alpha distribution PCs is still not finalized.
- Large-PDF lazy thumbnail generation and full input-password unlock UX remain future work.

## Next Recommended Step

Package or document the Python runtime, pywin32, pypdf, PyMuPDF, and Microsoft Office dependency expectations for alpha distribution PCs, then run a short manual Explorer drag-and-drop smoke test on the target machine.

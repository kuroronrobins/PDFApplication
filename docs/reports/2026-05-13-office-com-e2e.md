# Office COM E2E Verification

## Scope

Executed real Microsoft Office COM conversion and PDF export verification using the user-provided files:

- `C:\Users\kuroron\Downloads\job_history.xlsx`
- `C:\Users\kuroron\Downloads\プレゼン資料 (003).pptx`
- `C:\Users\kuroron\Downloads\生体機械力学１.docx`

The test covered Office-to-PDF conversion, PDF inspection, thumbnail rendering, mixed-workspace export, split output naming, and header/footer/watermark decoration output.

## Code Change During Verification

Excel COM failed inside the sandbox and initially failed on `Workbooks.Open` with the original minimal open call. The Office conversion service was hardened:

- Stage Office sources into the session cache before COM conversion.
- Open Word with explicit read-only/open-and-repair options.
- Open Excel with update-link suppression, read-only mode, no recent-file registration, local mode, repair loading, and a Protected View fallback.
- Remove staged source copies after conversion.

## E2E Result

Passed outside the sandbox, where Microsoft Office COM can launch normally.

Converted inputs:

| Input | Pages | Convert time |
| --- | ---: | ---: |
| `job_history.xlsx` | 7 | 2.763s |
| `プレゼン資料 (003).pptx` | 27 | 11.569s |
| `生体機械力学１.docx` | 7 | 9.325s |

Workspace export:

- Input files: 3
- Total input pages: 41
- Split markers: 1
- Decorations: header, footer, watermark
- Output PDFs: 2

Output files:

- `docs/reports/e2e/2026-05-13-office-com/outputs/office-e2e-result_001.pdf`
  - 7 pages
  - 3,200,416 bytes
- `docs/reports/e2e/2026-05-13-office-com/outputs/office-e2e-result_002.pdf`
  - 34 pages
  - 6,443,069 bytes

## Verification Commands

- `python -m compileall src-python\pdf_workbench_engine`: passed.
- Excel COM smoke outside sandbox: passed.
- Full Office COM E2E outside sandbox: passed.
- Output PDF inspection through `inspect_pdf`: passed for both exported PDFs.
- Output preview rendering through `render_thumbnails`: passed for both exported PDFs.

## Evidence

- `docs/reports/e2e/2026-05-13-office-com/summary.json`
- `docs/reports/e2e/2026-05-13-office-com/outputs/office-e2e-result_001.pdf`
- `docs/reports/e2e/2026-05-13-office-com/outputs/office-e2e-result_002.pdf`
- `docs/reports/e2e/2026-05-13-office-com/output-previews/output-001/preview/office-e2e-result_001-p1.png`
- `docs/reports/e2e/2026-05-13-office-com/output-previews/output-002/preview/office-e2e-result_002-p1.png`

## Known Limitations

- Office COM execution needs to run outside Codex sandbox restrictions. Inside the sandbox, Excel COM returned a false memory/disk-space error even for a blank workbook.
- The E2E retained final outputs and preview evidence only. Session cache PDFs generated during Office conversion were deleted after verification.
- This test did not cover encrypted input PDFs or password unlock UX.

## Next Recommended Step

Run the same flow from the Tauri UI with Explorer drag-and-drop and the release executable, then compare the UI logs against this worker-level E2E result.

# 2026-05-22 Export Speed Verification

## Scope

Measured export throughput with 100 actual generated PDF files. Each input had 5 pages, for a total of 500 pages. The benchmark called the active Python worker CLI entry point with the same `export_workspace` JSON shape used by the Tauri app.

## Changed Files

- `src-python/pdf_workbench_engine/services/pdf_fonts.py`
- `src-python/pdf_workbench_engine/services/pdf_decorations.py`
- `.gitignore`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## Root Cause Found

Plain merge export was already fast after the scratch-output replacement change. The remaining slow path was decorated output.

Profiling `single_output_with_header_and_page_number` before the font optimization showed about 20.25 seconds total for 500 pages. The dominant cost was `insert_textbox` repeatedly embedding an external Windows Japanese font file per page:

- `apply_decorations`: about `19.47 s`
- `insert_textbox` and font insertion: about `14.29 s`
- PDF save after decoration: about `4.72 s`

## Fix Applied

- ASCII decoration text now uses a PDF built-in Latin font instead of a Windows font file.
- Japanese/non-ASCII decoration text uses the built-in CJK path to avoid per-page external font-file embedding.
- If PyMuPDF rejects a compact header/footer textbox for CJK font metrics, the worker falls back to direct coordinate text insertion using the already fitted one-line text. This preserves visible Japanese headers in the compact margin band.
- Font path lookup, font object creation, and text-width calculations are cached.

## Final Measurement

Environment:

- Python: `C:\Program Files\Python313\python.exe`
- Input set: 100 PDFs, 5 pages each, total 500 pages
- Inputs/outputs: `build/export-speed-benchmark/`
- Metrics: `docs/reports/e2e/2026-05-22-export-speed/metrics.json`

Results:

- Single merged output, no decorations: `0.5130 s`, 1 output, 500 pages, `974.67 pages/s`
- Split into 100 outputs by file: `0.6503 s`, 100 outputs, 500 pages, `768.93 pages/s`
- Single output with ASCII header + page number: `4.0235 s`, 500 pages, `124.27 pages/s`
- Single output with Japanese header + page number: `7.2580 s`, 500 pages, `68.89 pages/s`

## User-Visible Behavior

- Export without decorations is fast for 100 PDFs.
- Split export into 100 PDFs is also fast for small inputs.
- Header/footer/page-number export is slower because it must reopen and rewrite the merged PDF to draw decorations, but the previous per-page font-file embedding bottleneck was reduced substantially.
- Japanese header rendering was visually checked from the generated output.

## Verification Commands

- `python -m py_compile src-python\pdf_workbench_engine\services\pdf_fonts.py src-python\pdf_workbench_engine\services\pdf_decorations.py src-python\pdf_workbench_engine\jobs\export_workspace.py src-python\pdf_workbench_engine\jobs\render_thumbnails.py`
  - Passed.
- `npm run typecheck`
  - Passed.
- `npm run build`
  - Failed inside sandbox with Vite `spawn EPERM`.
  - Passed outside sandbox after approval.
- Export benchmark script through the Python worker CLI
  - Passed. Metrics written to `docs/reports/e2e/2026-05-22-export-speed/metrics.json`.
- Japanese decoration render check
  - Passed visually.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-22-export-speed-decorated-output.pdf.png`
- `docs/reports/screenshots/2026-05-22-export-speed-decorated-japanese-output.pdf.png`
- `docs/reports/screenshots/2026-05-22-export-speed-japanese-decoration-page1.png`

## Known Limitations

- This benchmark uses generated small PDFs, not a user's real-world scanned/image-heavy PDFs.
- It measures the Python worker export path directly, including Python worker process startup, but not the Tauri save-dialog and destination-preflight UI around it.
- Japanese text extraction from the generated PDF can appear mojibake through PyMuPDF text extraction, but the visual render check shows the Japanese header correctly.

## Next Recommended Step

Run the same benchmark with representative real PDFs from the target workflow, especially image-heavy scans and decoration-heavy batches.

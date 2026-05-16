# 2026-05-16 Natural Header/Footer Style

## Scope

- Made header, footer, and page-number output look closer to common Word headers/footers.
- Removed inconsistent per-file size/color appearance from PDF output.
- Updated React preview styling to match the new natural direction.

## Changed files

- `src-python/pdf_workbench_engine/services/pdf_decorations.py`
- `src/features/workbench/store.ts`
- `src/features/workbench/sampleData.ts`
- `src/App.tsx`
- `src/styles.css`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## User-visible behavior

- Header, footer, and page-number PDF output is normalized to black 8.5pt text.
- Stored decoration colors and font sizes are ignored for header/footer/page-number output so a batch does not contain visibly different header/footer sizes.
- Long text keeps the same size and is abbreviated with `...` when it cannot fit the slot.
- Header/footer/page-number output no longer draws a visible white chip or backing rectangle.
- The workbench preview now shows black transparent text instead of blue badge-like labels.
- Watermark color and large visual treatment are unchanged.

## Verification commands

- Reused the existing PDF/Office-derived bad-condition set under `docs/reports/e2e/2026-05-16-header-footer-debug/`.
- Applied deliberately mismatched requested sizes and colors, then checked extracted PDF spans.  
  Result: passed for 7/7 cases; all header/footer/page-number spans were 8.5pt and black.
- Ran mixed `export_workspace` with PDF and Office-converted inputs.  
  Result: passed and produced 2 output PDFs.
- Browser visual check at `http://127.0.0.1:1420/?fixture=workbench` with 1366x768 viewport.  
  Result: passed for black transparent preview labels.
- `python -m py_compile src-python\pdf_workbench_engine\services\pdf_decorations.py`  
  Result: passed.
- `npm run typecheck`  
  Result: passed.
- `npm run build`  
  Result: initial sandbox run failed with Vite/Rolldown `spawn EPERM`; unsandboxed rerun passed.
- `git diff --check`  
  Result: passed with CRLF warnings only.

## Results

| Case | Result | Extracted size | Extracted color |
| --- | --- | --- | --- |
| Normal portrait PDF | Pass | 8.5pt | black |
| Dense top/bottom PDF | Pass | 8.5pt | black |
| Landscape wide PDF | Pass | 8.5pt | black |
| Small-page PDF | Pass | 8.5pt | black |
| Word converted PDF | Pass | 8.5pt | black |
| Excel converted PDF | Pass | 8.5pt | black |
| PowerPoint converted PDF | Pass | 8.5pt | black |
| Mixed export | Pass | 8.5pt | black |

## Evidence paths

- Summary: `docs/reports/e2e/2026-05-16-header-footer-natural/summary.json`
- Contact sheet: `docs/reports/e2e/2026-05-16-header-footer-natural/previews/contact-sheet-natural-header-footer.png`
- Decorated outputs: `docs/reports/e2e/2026-05-16-header-footer-natural/outputs/`
- Browser screenshot: `docs/reports/screenshots/2026-05-16-natural-header-footer-preview-1366x768.png`

## Known limitations

- Natural Word-like output means no protective white backing rectangle. If the original PDF already has content in the same margin band, text can overlap.
- Real customer documents should still be checked because Office print areas and PDF margins vary widely.

## Next recommended step

- Test the natural style against real business templates and decide whether a simple inward/outward margin preset is needed later.

# 2026-05-16 Header/Footer Debug E2E

## Scope

- Verified header, footer, and page-number output against varied PDF and Office-derived files.
- Included bad conditions: dense existing top/bottom content, landscape pages, small pages, long text, short text, Japanese text, and split mixed export.
- Fixed the discovered tiny-page case where long center-slot text could disappear after shrink-to-fit.

## Changed files

- `src-python/pdf_workbench_engine/services/pdf_decorations.py`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`
- `docs/reports/e2e/2026-05-16-header-footer-debug/`

## Test inputs

- `pdf_normal_portrait.pdf`: normal portrait PDF with open margins.
- `pdf_dense_margins.pdf`: PDF with existing text at the top and bottom edges.
- `pdf_landscape_wide.pdf`: landscape PDF with wide table content.
- `pdf_small_page.pdf`: small page with narrow header/footer slots.
- `office_word_dense.docx`: Word file converted through Office COM.
- `office_excel_wide.xlsx`: Excel file converted through Office COM.
- `office_powerpoint_edge.pptx`: PowerPoint file converted through Office COM.

## User-visible behavior

- Short header/footer strings render as compact text without a large empty field.
- Long header/footer strings shrink to fit their slot.
- On very small pages, strings that still cannot fit are abbreviated with `...` instead of being omitted.
- Japanese header/footer strings render with the configured Japanese-capable font path.
- Dense top/bottom source content remains a risk area, but the decoration text is visible because the worker draws a compact light backing rectangle behind it.

## Verification commands

- Generated PDF and Office test inputs under `docs/reports/e2e/2026-05-16-header-footer-debug/inputs/`.  
  Result: passed after running Office generation outside sandbox because COM launches Office applications.
- Converted Word, Excel, and PowerPoint through `pdf_workbench_engine.services.office_com.convert_to_pdf`.  
  Result: passed.
- Applied the same header/footer/page-number set to 7 individual PDFs and rendered first-page PNG previews.  
  Result: passed after the tiny-page abbreviation fix.
- Ran mixed `export_workspace` with PDF and Office-converted inputs, including a split after the small-page PDF.  
  Result: passed and produced 2 output PDFs.
- `python -m py_compile src-python\pdf_workbench_engine\services\pdf_decorations.py`  
  Result: passed.
- `npm run typecheck`  
  Result: passed.
- `npm run build`  
  Result: initial sandbox run failed with Vite/Rolldown `spawn EPERM`; unsandboxed rerun passed.

## Results

| Case | Result | Notes |
| --- | --- | --- |
| Normal portrait PDF | Pass | All markers detected, no page overflow. |
| Dense top/bottom PDF | Pass | Existing source text occupied both bands; decoration stayed visible with backing. |
| Landscape wide PDF | Pass | Slot placement stayed inside the wider page. |
| Small-page PDF | Pass | Initial run dropped long center text; fixed by abbreviation and reran successfully. |
| Word converted PDF | Pass | Office COM conversion and decoration output succeeded. |
| Excel converted PDF | Pass | Landscape Office output and decoration output succeeded. |
| PowerPoint converted PDF | Pass | Edge-positioned slide content and decoration output succeeded. |
| Mixed export | Pass | Produced `mixed-before-office.pdf` and `mixed-with-office.pdf`. |

## Evidence paths

- Summary: `docs/reports/e2e/2026-05-16-header-footer-debug/summary.json`
- Contact sheet: `docs/reports/e2e/2026-05-16-header-footer-debug/previews/contact-sheet-decorated-first-pages.png`
- Decorated outputs: `docs/reports/e2e/2026-05-16-header-footer-debug/outputs/`
- Office-converted PDFs: `docs/reports/e2e/2026-05-16-header-footer-debug/converted/`

## Known limitations

- This validates generated stress files and Office COM-converted files in the development environment. It is not a replacement for testing the user's real PDF templates.
- If a source PDF already uses the exact top/bottom margin band, the decoration remains legible but necessarily covers a small part of the original content.
- The source Office files were generated for stress coverage; real customer Office files should still be sampled for print-area and slide-size variation.

## Next recommended step

- Run the same test harness against several real customer PDFs and Office files, then decide whether the default margin band should be moved inward or exposed as a simple advanced setting.

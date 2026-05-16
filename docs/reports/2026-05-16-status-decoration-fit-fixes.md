# 2026-05-16 Status Decoration Fit Fixes

## Scope

- Stabilized the top-right app-bar job status width.
- Improved header/footer/page-number preview fit for short and long text.
- Improved exported PDF header/footer/page-number placement to reduce overlap with source PDF content.

## Changed files

- `src/App.tsx`
- `src/styles.css`
- `src-python/pdf_workbench_engine/services/pdf_decorations.py`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## User-visible behavior

- The top-right status pill keeps the same width while moving between `待機中`, `処理中`, `完了`, `エラー`, and `中止`.
- The full status message is still available to assistive technology and hover title text, but the visible app-bar label stays compact.
- Header/footer/page-number labels now use compact slot chips. Short text no longer creates a wide empty field, and long text is constrained inside the chosen left/center/right slot.
- Exported header/footer/page-number text is fitted inside top/bottom margin-band boxes with a compact light backing rectangle, reducing visual collision with the original PDF contents without adding more user settings.

## Verification commands

- `npm run typecheck`  
  Result: passed.
- `python -m py_compile src-python\pdf_workbench_engine\services\pdf_decorations.py`  
  Result: passed.
- Python decoration smoke test for short and long header/footer text through `apply_decorations`.  
  Result: passed and produced an output PDF.
- `npm run build`  
  Result: passed outside sandbox after the known Vite/Rolldown `spawn EPERM` limitation was avoided.
- Browser visual check at `http://127.0.0.1:5173/?fixture=workbench` with 1366x768 viewport.  
  Result: passed for fixed app-bar status width and header/footer preview fit.

## Screenshot paths

- `docs/reports/screenshots/2026-05-16-status-decoration-layout-1366x768.png`

## Known limitations

- The PDF output now reserves and protects the top/bottom margin bands better, but some source PDFs may already have important content in those bands. Representative real documents should still be checked before treating the collision behavior as final.
- Browser verification covers the React preview and layout. The Python smoke test covers rendering code, but it is not a full Tauri export run with real user files.

## Next recommended step

- Run a Tauri executable smoke test with real PDFs that contain dense top/bottom content, apply short and long header/footer strings, and compare the exported PDFs visually.

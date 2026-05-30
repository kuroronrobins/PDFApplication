# 2026-05-30 Usability Priority Fixes

## Scope

Fixed the five usability regressions identified in `2026-05-30-usability-priority-fix-policy.md`: Office-only output flow, on-demand export-preview page images, visible Office conversion queue state, virtualized export preview navigation, and large-PDF timeline navigation/density.

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/backend.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src/features/workbench/outputPlan.ts`
- `src/features/workbench/store.ts`
- `src/features/workbench/types.ts`

## User-Visible Behavior

- Output naming, export preview, and export start now use active file count, so Office-only workspaces are usable before conversion finishes.
- Office cards now show `PDF化待ち`, `次にPDF化`, `PDF化中`, `再変換必要`, or `変換エラー`; the bottom bar summarizes queued, priority, stale, and error states.
- Export preview now requests a real current-page preview image through the worker on demand when a ready PDF has not been expanded.
- Export preview has page-number jump, previous/next, first/last, and output-boundary navigation.
- Export preview filmstrip renders only the visible range instead of mounting every output page.
- Large-PDF expanded timelines show the visible page range, support page-number jump, and provide return buttons for split, excluded, and decorated positions.
- A development-only `?fixture=office-queued` route was added for verifying pre-conversion Office UI state. It is not loaded on production startup.

## Verification Commands

- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run tauri build`: failed once inside sandbox with Vite `spawn EPERM`; rerun outside sandbox and passed.
- Tauri release executable Office-only E2E: passed with `PDF_WORKBENCH_E2E=1`, `PDF_WORKBENCH_E2E_AUTORUN=1`, and `PDF_WORKBENCH_DISABLE_PYTHON_FALLBACK=1`.

## Browser Verification

- Viewport: 1366x768.
- `?fixture=large-pages` workbench:
  - `.page-card` DOM count: 72 for 1200 pages.
  - Visible range: `表示 1-72 / 1200`.
  - Timeline height: 192px.
- Large timeline page jump:
  - Jumped to page 900.
  - Visible range became `表示 865-936 / 1200`.
  - `.page-card` DOM count remained 72.
- `?fixture=large-pages` export preview:
  - Initial `.filmstrip-thumb` DOM count: 18 for 1200 pages.
  - After jumping to page 900: `.filmstrip-thumb` DOM count: 25.
  - Active filmstrip label: `PDF p900`.
- `?fixture=hundred-files`:
  - `.file-card` DOM count: 100.
  - Output bar showed 500 planned pages.
  - File strip used horizontal overflow without expanding the whole layout.
- `?fixture=office-queued`:
  - Cards showed `PDF化待ち`, `次にPDF化`, `PDF化待ち`.
  - `出力名`, `プレビュー`, and `書き出し` buttons were enabled before conversion completed.
  - Output name modal opened and exposed editable fields.
  - Export preview confirmation remained enabled.

## Office E2E Evidence

- Result JSON: `docs/reports/e2e/2026-05-30-usability-office-only/ui-result.json`
- Outputs:
  - `docs/reports/e2e/2026-05-30-usability-office-only/outputs/office-only-usability-result_001.pdf`
  - `docs/reports/e2e/2026-05-30-usability-office-only/outputs/office-only-usability-result_002.pdf`
- Result status: `completed`.
- Converted files:
  - `office_excel_wide.xlsx`: ready, 2 pages.
  - `office_powerpoint_edge.pptx`: ready, 1 page.
  - `office_word_dense.docx`: ready, 1 page.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-30-usability-fixes-large-pages-workbench.png`
- `docs/reports/screenshots/2026-05-30-usability-fixes-large-pages-preview-jump.png`
- `docs/reports/screenshots/2026-05-30-usability-fixes-office-queued-preview.png`

## Known Limitations

- The browser fixture uses synthetic Office/PDF sources, so real on-demand PDF preview images are verified by the Tauri worker path and the existing real-file engine boundary rather than by browser-only fixtures.
- `?fixture=hundred-files` screenshot capture timed out in the in-app browser CDP path, but DOM and layout metrics were collected successfully.
- The controlled Tauri E2E verifies release executable Office conversion and export. Manual Explorer drag-and-drop remains a separate target-machine smoke check.

## Next Recommended Step

Run one manual Explorer drag-and-drop smoke test with Office-only inputs on the target machine, focusing on the pre-conversion output-name flow and queue visibility.

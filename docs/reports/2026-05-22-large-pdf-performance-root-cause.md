# 2026-05-22 Large PDF Performance Root Cause

## Scope

Investigated and hardened the workbench behavior when many PDF files or many PDF pages are loaded. The focus was UI responsiveness, preparation cost, and export throughput.

## Root Causes

- The expanded page timeline mounted every page card for the expanded file. Large PDFs therefore created a large DOM and many React components even though only a small viewport was visible.
- PDF preparation rendered both thumbnails and high-resolution previews for every page. The high-resolution preview images were UI-only but were generated before the user opened the preview modal.
- Export called the full preparation path before writing output. That meant export could wait for UI-only thumbnail/preview generation even though the PDF writer only needs source/cache paths and page records.
- Output planning created full cloned page groups for page-number decoration mapping, and `buildOutputPlan` created transient active-page arrays. This amplified routine render and state-update cost for large workspaces.
- Undo history retained unbounded full-workspace snapshots. Large page operations could keep many cloned page arrays alive.
- Final export copied the completed scratch PDF into another temporary file before replacing the final output, adding an avoidable full read/write pass.

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/backend.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src/features/workbench/outputPlan.ts`
- `src/features/workbench/store.ts`
- `src-python/pdf_workbench_engine/jobs/export_workspace.py`
- `src-python/pdf_workbench_engine/jobs/render_thumbnails.py`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## User-Visible Behavior

- Loading many PDFs should reach a ready workspace state faster because initial preparation no longer renders UI thumbnails or high-resolution previews for every page.
- Expanding a ready file triggers thumbnail rendering for that file only.
- The page timeline now renders a visible window of page cards instead of all pages at once.
- Export can start after PDF/Office inspection and page-record creation; it no longer waits for UI-only thumbnail generation.
- Final output save avoids an extra full-file byte copy.

## Verification Commands

- `npm run typecheck`
  - Passed.
- `python -m py_compile src-python\pdf_workbench_engine\jobs\export_workspace.py src-python\pdf_workbench_engine\jobs\render_thumbnails.py`
  - Passed.
- `npm run build`
  - Failed inside sandbox with Vite `spawn EPERM`.
  - Passed outside sandbox after approval.
- `Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:5173/ -TimeoutSec 5`
  - Returned HTTP 200 from the existing dev server.
- Unit tests
  - Not run because this package currently has no `test` script configured.

## Screenshot Paths

- None. The in-app browser and Chrome-backed browser automation both timed out while enabling page control for the large-page fixture (`Page.enable`). No reliable screenshot was produced in this run.

## Known Limitations

- Lazy thumbnail rendering still renders all thumbnails for the expanded file in one worker job. The next performance step is visible-range thumbnail generation so only thumbnails near the current scroll position are rendered.
- Page records are still created for every inspected page because export, deletion, split, reorder, and decoration targeting need stable page IDs.
- Large-workspace undo still stores full snapshots, but it is now bounded to 50 entries.

## Next Recommended Step

Add visible-range thumbnail requests tied to the virtualized timeline window, then run a release executable UI E2E with real large PDFs on the target Windows machine.

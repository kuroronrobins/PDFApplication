# 2026-05-22 Hundred PDF Files Performance Verification

## Scope

Verified the workbench with a development fixture representing 100 loaded PDF files. The fixture keeps production startup empty and is available only through `?fixture=hundred-files`.

## Changed Files

- `src/App.tsx`
- `src/features/workbench/store.ts`

## User-Visible Behavior

- Production startup remains empty.
- `http://127.0.0.1:5173/?fixture=hundred-files` loads 100 ready PDF file cards with 5 page records each.
- No file is expanded by default, matching the one-file-one-card workspace model.

## Verification Result

Environment:

- Viewport: `1366 x 768`
- Browser: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- URL: `http://127.0.0.1:5173/?fixture=hundred-files`

Measured result:

- File cards rendered: `100`
- Page cards initially mounted: `0`
- Body layout size: `1366 x 768`
- File strip client width: `1322`
- File strip scroll width: `19616`
- JS heap used after load: about `25.1 MB`
- Animation frame p95 while idle: `16.7 ms`
- File-strip scroll to end settled in `15.4 ms`
- File-strip scroll back to start settled in `16.8 ms`
- First file expand settled in `32.9 ms`
- First file collapse settled in `32.4 ms`
- Expanded page cards: `5`
- Collapsed page cards: `0`

Conclusion:

- The 100-file card workspace is responsive in this synthetic loaded-PDF scenario. Scroll is within one frame, and expand/collapse settles within about two frames.

## Verification Commands

- `npm run typecheck`
  - Passed.
- `npm run build`
  - Failed inside sandbox with Vite `spawn EPERM`.
  - Passed outside sandbox after approval.
- Headless Chrome CDP performance script
  - Passed. Metrics written to `docs/reports/e2e/2026-05-22-hundred-files-performance/metrics.json`.
- Screenshot visual check
  - Passed. The file strip, page timeline, and bottom output bar fit at 1366x768 without incoherent overlap.

## Screenshot Paths

- `docs/reports/screenshots/2026-05-22-hundred-files-performance.png`

## Known Limitations

- This verifies UI behavior with synthetic already-loaded PDF cards. It does not measure real disk I/O or PDF inspection time for 100 physical PDFs.
- It does not verify exporting 100 real PDFs. Export speed still depends on the Python PDF writer and source PDF complexity.

## Next Recommended Step

Run the same scenario with 100 actual small PDFs through the Tauri release executable after the real-file drag-and-drop smoke path is available in the target environment.

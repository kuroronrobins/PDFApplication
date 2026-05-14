# 2026-05-15 input order and loading DnD stability

## Scope

Improved file/page drag stability while files are still preparing, and made multi-file input insertion deterministic by filename.

## Changed files

- `src/App.tsx`
- `src/features/workbench/store.ts`

## User-visible behavior

- Drag insertion targets now use a geometry snapshot captured at drag activation. Progress labels, thumbnail arrival, and cache-state updates during loading no longer change the hit-test coordinates mid-drag.
- Background PDF/Office preparation start is delayed briefly after a file batch is inserted, so the initial ordering operation is not immediately interrupted by conversion/inspection state churn.
- While an internal file/page drag is active, new background preparation polling is skipped until the drag ends.
- Multi-file input batches are inserted by natural filename order, including numeric ordering such as `file0`, `file1`, `file2`, `file10`.

## Verification commands

- `npm run typecheck` passed.
- `npm run build` initially failed inside the sandbox with `spawn EPERM`.
- `npm run build` passed after running outside the sandbox with approval.

## Screenshot paths

None. This change affects drag/input behavior and does not intentionally change layout.

## Known limitations

- Manual Tauri window testing with Explorer multi-select and immediate file-card dragging is still recommended because OS file ordering and WebView drag timing can differ by environment.

## Next recommended step

Use an installed build to add a numbered file set such as `0.pdf`, `1.pdf`, `2.pdf`, `10.pdf`, then immediately reorder cards while preparation is running.

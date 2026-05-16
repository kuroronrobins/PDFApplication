# 2026-05-16 Fast Overlay Export Preview

## Scope

Export preview page navigation was changed so the visible page can update immediately without waiting for the completed-PNG worker render.

## Changed files

- `src/App.tsx`
- `src/styles.css`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`

## User-visible behavior

- The preview modal now shows the existing page preview PNG plus the React header/footer/page-number/watermark overlay immediately.
- Arrow-key and arrow-button page navigation no longer starts a blocking completed-PNG render for each move.
- Completed worker-rendered PNGs are requested only after the user stops on a page for a short idle delay. When ready, they silently replace the fast overlay image.
- The modal no longer shows `完成プレビューを作成中` over the page for normal completed-PNG generation.
- Visible waiting remains only for input preparation states such as Office/PDF conversion.

## Verification commands

- `npm run typecheck`: passed.
- `npm run build`: sandbox run failed with Vite/Rolldown `spawn EPERM`; rerun outside the sandbox passed.
- Browser UI check at `http://127.0.0.1:5173/?fixture=workbench`, viewport 1366x768: passed.

## Browser verification result

- Preview modal opened.
- One next-page click moved from `Excel p1` to `Excel p2` while keeping fast decoration rows mounted.
- Decorated PDF page `PDF p31` showed the watermark overlay immediately.
- `.preview-exact-status` count: `0`.
- `.filmstrip-exact-badge` count: `0`.
- Document horizontal and vertical overflow at 1366x768: `false`.

## Evidence

- Screenshot: `docs/reports/screenshots/2026-05-16-fast-overlay-preview-1366x768.png`
- UI summary JSON: `docs/reports/e2e/2026-05-16-fast-overlay-preview/browser-ui-summary.json`

## Known limitations

- Browser fixture mode verifies the fast overlay path and layout. The silent replacement by a Tauri worker-rendered exact PNG still needs a real Tauri runtime smoke test with ready PDF/Office cache.
- The overlay is a high-fidelity approximation until the exact PNG arrives. Export output remains governed by the Python worker path.

## Next recommended step

Run a Tauri runtime smoke test on a ready workspace and confirm that exact PNG replacement happens silently after idle without interrupting page navigation.

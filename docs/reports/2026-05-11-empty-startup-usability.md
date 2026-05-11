# Milestone Report: Empty Startup Usability

## Scope

起動直後から見た目確認用サンプルファイルが読み込まれている状態を廃止し、実ファイル追加から開始する本番ワークスペースへ修正した。

## Changed Files

- `src/features/workbench/store.ts`
- `src/App.tsx`
- `src/styles.css`
- `AGENTS.md`
- `docs/implementation_roadmap.md`

## User-Visible Behavior

- 起動直後はファイル0件の空ワークスペースになる。
- `見積.xlsx`、`契約書.docx`、`説明資料.pptx`、`添付資料.pdf` は自動表示されない。
- ファイル順序エリアには、ファイル追加またはドラッグ&ドロップで開始できる空状態を表示する。
- 書き出し対象ページが0件の間、書き出しボタンは無効になる。
- ファイル追加をキャンセルした場合はログに記録する。

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| Codex browser startup DOM check | Passed: empty prompt present, sample file names absent |
| Codex browser button check | Passed: file add enabled, export disabled |
| Codex browser console check | Passed: error/warning count 0 |
| `npm run build` | Passed |
| `npm run tauri build` | Passed |

## Screenshot

- `docs/reports/screenshots/2026-05-11-empty-workspace-startup.png`

## Known Limitations

- Tauri native file dialog interaction itself was not automated in this pass. The next verification should use a real PDF and confirm add, expand, edit, and export in the desktop app.
- Development demo data still exists in `sampleData.ts` as a fixture, but it is no longer imported by the production store.

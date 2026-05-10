# Milestone Report: Engine UI Integration

## Scope

PDF Workbenchの既存UI/状態モデルをactive Python workerへ接続し、Tauri実行時に実PDF検査、Office変換、サムネイル生成、実PDF書き出しを呼び出す初期経路を実装した。

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/backend.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src/features/workbench/store.ts`
- `src/features/workbench/types.ts`
- `src/features/workbench/sampleData.ts`
- `src-tauri/src/lib.rs`
- `src-tauri/src/python_worker.rs`
- `src-tauri/tauri.conf.json`
- `src-python/pdf_workbench_engine/**`
- `docs/processing_engine_plan.md`
- `docs/implementation_roadmap.md`

## User-Visible Behavior

- 実ファイルを追加すると、サンプルワークスペースを自動クリアする。
- Tauri実行時はPDF/Officeをバックグラウンドで実PDFとして準備する。
- Officeファイルはカード操作を先に受け付け、workerでPDFキャッシュ化する。
- 準備完了後、実ページ数とサムネイルをページカードへ反映する。
- 書き出しはworkerの `export_workspace` を使い、結合/分割/ページ移動/除外/装飾/検索上書き/暗号化を実PDFへ反映する。
- 書き出し中はworkerのNDJSON進捗イベントを下部バーへ反映する。
- 書き出し中止時はTauri側から該当Python子プロセスへkillを送る。
- 処理失敗時は対象カードとログへエラーを表示する。

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| Python `py_compile` for `src-python/pdf_workbench_engine` | Passed |
| `npm run build` | Passed after rerun outside sandbox because Vite spawn hit sandbox `EPERM` |
| `npm run tauri build` | Passed |
| `npm audit --json` | Passed, 0 vulnerabilities |
| `cargo check` | Passed |
| Python worker real PDF smoke | Passed: 2 input PDFs, moved page source, split into 2 outputs, decoration, search overwrite, encryption |
| Python worker streaming smoke | Passed: NDJSON progress events and final result |
| Codex browser visual check | Passed, console error/warning count 0 |

## Screenshot

- `docs/reports/screenshots/2026-05-11-engine-ui-connected.png`

## Known Limitations

- File preparation before export still uses individual request/response worker calls, so cancellation is complete for the active export writer process but not yet for a pre-export Office/PDF preparation call already in flight.
- Microsoft Office COM conversion path is implemented but not validated with real Word/Excel/PowerPoint files in this pass.
- Python runtime and `pypdf` / PyMuPDF / pywin32 dependency packaging are not finalized for clean end-user PCs.
- Large PDFs currently generate thumbnails eagerly after inspection; this should become lazy or viewport-driven.

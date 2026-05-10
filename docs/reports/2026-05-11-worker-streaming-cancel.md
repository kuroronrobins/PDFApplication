# Milestone Report: Worker Streaming And Cancel

## Scope

書き出しworkerをrequest/responseからイベントストリーミング対応へ拡張し、Tauri側で実行中のPython子プロセスを保持してキャンセルできるようにした。

## Changed Files

- `src-python/pdf_workbench_engine/cli.py`
- `src-python/pdf_workbench_engine/jobs/export_workspace.py`
- `src-tauri/src/python_worker.rs`
- `src-tauri/src/lib.rs`
- `src/features/workbench/backend.ts`
- `src/features/workbench/engineWorkflow.ts`
- `src/App.tsx`
- `docs/processing_engine_plan.md`
- `docs/implementation_roadmap.md`

## User-Visible Behavior

- 書き出し中、workerが送る進捗イベントで下部バーのステップ/進捗/メッセージが更新される。
- 書き出し中止ボタンはTauriの `cancel_processing_engine_job` を呼び、対象Python子プロセスをkillする。
- キャンセル時はエラー完了ではなくキャンセル済みとして扱う。

## Verification

| Check | Result |
| --- | --- |
| Python `py_compile` for `src-python/pdf_workbench_engine` | Passed |
| Python worker `ping` streaming smoke | Passed |
| Python worker export streaming smoke | Passed, 11 NDJSON events and 2 output PDFs |
| `npm run typecheck` | Passed |
| `cargo check` | Passed |
| `npm run build` | Passed after rerun outside sandbox because Vite spawn hit sandbox `EPERM` |
| `npm run tauri build` | Passed |
| `npm audit --json` | Passed, 0 vulnerabilities |

## Known Limitations

- 書き出し前のPDF検査/Office変換/サムネイル生成はまだ個別の同期worker呼び出しであり、完全な子プロセスキャンセル対象ではない。
- Microsoft Office COM実変換はこの変更では未検証。
- Python runtime/dependency同梱方式は未確定。

# Milestone Report: Processing Engine Scaffold

## Scope

実PDF/Office処理エンジン接続の開始として、旧Pythonサービスのロジックを直接 `archive/` 参照せずに使えるactive worker構成へ移植し始めた。

今回はUIへの本格接続ではなく、Python worker scaffold、主要処理サービスの初期移植、Tauriからworkerを起動する汎用境界までを実装した。

## Roadmap Tasks

- Processing Engine Task A: Python engine scaffold
- Processing Engine Task B: Office COM cache 初期移植
- Processing Engine Task C: PDF inspection and thumbnails 初期移植
- Processing Engine Task D: Export workspace 初期移植
- Processing Engine Task E: Tauri integration 初期境界

## Changed Files

- `.gitignore`
- `AGENTS.md`
- `docs/processing_engine_plan.md`
- `docs/implementation_roadmap.md`
- `docs/tauri_ui_redesign_plan.md`
- `src-python/README.md`
- `src-python/requirements.txt`
- `src-python/pdf_workbench_engine/**`
- `src-tauri/src/python_worker.rs`
- `src-tauri/src/lib.rs`
- `src/features/workbench/backend.ts`

## User-Visible Behavior

このレポート時点ではUIの見た目は変えていない。Tauri側には `run_processing_engine` command が追加され、次工程でUIの書き出し/キャッシュ処理から実workerを呼べる状態になった。

追記: UI接続は `docs/reports/2026-05-11-engine-ui-integration.md` で実施済み。

## Implemented Worker Jobs

- `ping`: worker疎通確認
- `convert_office`: Microsoft Office COMでOffice/PDFをセッションPDFへ変換
- `inspect_pdf`: PDFページ数、暗号化状態、メタデータ取得
- `render_thumbnail`: PyMuPDFでページサムネイルを生成
- `export_workspace`: workspace状態をもとにページ列を作り、結合/分割/装飾/検索上書き/暗号化を反映

## Verification

| Check | Result |
| --- | --- |
| Python worker `ping` | Passed |
| Python `py_compile` for `src-python/pdf_workbench_engine` | Passed |
| Python worker missing-file error response | Passed |
| Python worker unsupported-job error response | Passed |
| Python worker real PDF `export_workspace` smoke test | Passed, generated `result_001.pdf` in a temp directory |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm audit --json` | Passed, 0 vulnerabilities |
| `npm run tauri build` | Passed |

## Known Limitations

- Worker is currently request/response. Progress streaming to the UI is still pending.
- UI state wiring is covered by `docs/reports/2026-05-11-engine-ui-integration.md`.
- Actual Office COM conversion was not executed in this pass because no real Office sample was provided.
- Actual PDF byte E2E verification is pending.
- Python runtime and dependency packaging for the Tauri installer is not finalized.

## Next Step

Continue with progress streaming, cancellation, Office COM real-machine verification, and Python runtime/dependency packaging.

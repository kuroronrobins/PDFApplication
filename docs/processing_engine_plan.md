# Processing Engine Implementation Plan

更新日: 2026-05-11

## 1. 決定事項

実PDF/Office処理エンジンは、旧Pythonサービスの処理ロジックを再利用する。ただし、`archive/legacy_flet_system_20260510/` を実行時に直接参照しない。

次回以降の実装では、旧サービスのうち必要な処理をレビューし、新しいactiveなPython worker配下へ移植する。アーカイブは参照元であり、実行時依存ではない。

確定した方針:

- PDF処理はPython workerを初期実装の本命とする。
- Rust/Tauriはジョブ管理、キャッシュ管理、プロセス起動、進捗イベント、エラー整形を担当する。
- Office変換は Microsoft Office COM のみ使用する。
- LibreOffice fallback は実装しない。
- Microsoft Officeがインストール済みであることを実行条件とする。
- 検索置換はPDF内部テキストの完全再構成ではなく、検索位置を検出して塗りつぶし、置換文字を上書きする。
- 一時PDFキャッシュはセッション限定とし、永続保存しない。

## 1.1 実装状況

2026-05-11 時点で、activeなPython worker scaffold、Tauriからworkerを起動する汎用コマンド、UI状態からworkerを呼ぶ初期接続、書き出しworkerの進捗ストリーミング/キャンセルを追加済み。

完了:

- `src-python/pdf_workbench_engine/` の作成
- JSON stdin/stdout型の `pdf_workbench_engine.cli`
- `ping`, `convert_office`, `inspect_pdf`, `render_thumbnail`, `export_workspace` のworker入口
- Office COM変換ロジックのactive workerへの初期移植
- `pypdf` / PyMuPDF を使うPDF検査、ページ構成、装飾、検索上書き、暗号化サービスの初期移植
- Tauri command `run_processing_engine`
- フロントエンド helper `runProcessingEngine`
- Tauri実行時のバックグラウンドPDF検査/Office変換/サムネイル生成接続
- 書き出しボタンから `export_workspace` を呼び、実PDFの結合/分割/ページ移動/除外/装飾/検索上書き/暗号化を反映する初期経路
- ページ移動後も元PDFページを参照できる `sourceFileId` の状態保持
- Tauri bundle resourceとして `src-python` を同梱する設定
- `stream: true` 要求時のNDJSON進捗/結果イベント出力
- Tauri command `start_processing_engine_job` / `cancel_processing_engine_job`
- Tauri側のPython子プロセス保持、イベント配信、キャンセル時kill
- 書き出しUIへのworker進捗反映

未完了:

- Microsoft Office COM実機変換検証
- Python実行環境と依存ライブラリの同梱/インストール方式の確定
- 大容量PDFでのサムネイル生成負荷対策
- 書き出し前のOffice/PDF準備処理まで含む完全キャンセル

## 2. 採用理由

旧Pythonサービスには、次の実装がすでに存在する。

- Office COMによる Word / Excel / PowerPoint からPDFへの変換
- `pypdf` によるPDF結合、分割、ページ並べ替え、暗号化
- PyMuPDFによるPDF情報取得、検索位置検出、上書き置換、透かし、サムネイル生成に必要な基盤

RustネイティブでPDF処理を最初から作ると、配布は単純になる一方で、PDF仕様、文字列処理、描画、暗号化、Office変換の実装コストと不確実性が大きい。現段階では、UI/ジョブ境界を活かしてPython workerを接続する方が早く、動作検証もしやすい。

Rust実装は将来候補として残すが、初期の実PDF出力対応では採用しない。

## 3. 新しいファイル構成

旧 `archive/` 配下は直接importしない。新しい処理エンジンは次のような構成にする。

```text
src-python/
  pdf_workbench_engine/
    __init__.py
    cli.py
    schemas.py
    errors.py
    jobs/
      __init__.py
      convert_office.py
      inspect_pdf.py
      render_thumbnail.py
      export_workspace.py
    services/
      __init__.py
      office_com.py
      pdf_document.py
      pdf_pages.py
      pdf_decorations.py
      pdf_security.py
      text_overlay.py
    tests/
      test_pdf_pages.py
      test_text_overlay.py
```

Tauri側は次の責務に分ける。

```text
src-tauri/src/
  lib.rs
  cache.rs
  jobs.rs
  python_worker.rs
  commands/
    files.rs
    pdf.rs
    export.rs
```

フロントエンド側は既存の状態モデルを維持し、実処理のイベントを受け取る層だけ追加する。

```text
src/features/workbench/
  backend.ts
  engineWorkflow.ts
```

## 4. 移植ルール

許可すること:

- 旧サービスの小さな関数や処理手順を読み、レビューして新しい `src-python/pdf_workbench_engine/` に移植する。
- 既存の `pypdf`, PyMuPDF, `pywin32` ベースの実装方針を再利用する。
- 旧サービスと同等のテスト入力で動作比較する。

禁止すること:

- `archive/legacy_flet_system_20260510/` をPython import pathへ追加する。
- Tauriから `archive/` 配下のPythonファイルを直接起動する。
- 旧Flet UI、旧ログUI、旧ToolHub出力物をactive appに戻す。
- `archive/` 配下へ新規実装や修正を追加する。

## 5. Worker通信プロトコル

TauriはPython workerを子プロセスとして起動し、JSONで要求と結果をやり取りする。初期実装では安定性を優先し、1ジョブ1プロセスまたは1ジョブ1シーケンシャル実行とする。

要求例:

```json
{
  "jobId": "job-001",
  "kind": "export_workspace",
  "sessionDir": "C:/Temp/pdf-workbench-sessions/session-...",
  "outputDir": "C:/Users/.../Output",
  "workspace": {
    "files": [],
    "pagesByFile": {},
    "decorations": [],
    "searchReplace": {},
    "security": {}
  }
}
```

進捗イベント例:

```json
{"type":"progress","jobId":"job-001","step":"office_convert","progress":18,"message":"PowerPointをPDF化しています"}
{"type":"log","jobId":"job-001","level":"info","message":"説明資料.pptx を一時PDFへ変換しました"}
{"type":"result","jobId":"job-001","outputFiles":["result_001.pdf","result_002.pdf"]}
```

エラー例:

```json
{
  "type": "error",
  "jobId": "job-001",
  "code": "office_com_failed",
  "message": "PowerPoint変換に失敗しました",
  "target": "説明資料.pptx",
  "detail": "COM例外の詳細"
}
```

Tauriはこれらをフロントエンドの既存 `ExportJobState` とログドロワーへ変換する。

## 6. 処理順

一括書き出しは次の順で実行する。

1. セッションキャッシュディレクトリの準備
2. Office COMによる未変換Officeファイルの一時PDF化
3. PDFのメタデータ、ページ数、暗号化状態の検査
4. ワークスペース状態に基づくページ列の構築
5. 除外ページの反映
6. ページ移動/並べ替えの反映
7. ハサミ分割線による出力グループ生成
8. ヘッダー、フッター、ページ番号、透かしの描画
9. 検索置換の位置検出、塗りつぶし、上書き
10. 出力PDF暗号化
11. 出力先への保存
12. セッション一時ファイルの後始末

## 7. 実装タスク

### Task A: Python engine scaffold

- `src-python/pdf_workbench_engine/` を作成する。
- `cli.py` にJSON入出力の入口を作る。
- `schemas.py` に入力/出力スキーマを定義する。
- `errors.py` にユーザー向けエラーコードを定義する。

### Task B: Office COM cache

- 旧 `convert.py` のCOM変換ロジックを `services/office_com.py` へ移植する。
- Word/Excel/PowerPointを1件ずつ変換する。
- 変換先はTauriが渡したセッションキャッシュ配下に限定する。
- 失敗時は対象ファイル名、Officeアプリ名、COM例外をJSONエラーとして返す。

### Task C: PDF inspection and thumbnails

- PDFページ数、暗号化状態、メタデータを取得する。
- PyMuPDFでページサムネイルを生成し、セッションキャッシュへ保存する。
- フロントエンドのダミーページを実ページ情報で置き換える。

### Task D: Export workspace

- 既存ワークスペース状態をPython workerへ渡す。
- `pypdf` で結合、分割、除外、ページ再構成を行う。
- PyMuPDFで装飾と検索置換を反映する。
- `pypdf` で暗号化を適用する。

### Task E: Tauri integration

- `python_worker.rs` でPython worker起動を実装する。
- `jobs.rs` でジョブID、進捗、キャンセル、ログを管理する。
- フロントエンドへイベントを送る。
- キャンセル時は子プロセスを停止し、一時ファイルを破棄する。

### Task F: Verification

- 小さなPDFで結合、分割、除外、装飾、暗号化を確認する。
- Office COMでWord/Excel/PowerPoint変換を確認する。
- 検索置換が見た目として反映されることを確認する。
- 失敗ケースとしてOffice未インストール、パスワード付きPDF、変換失敗を確認する。

## 8. 完了条件

- `archive/` を直接参照せず、activeな `src-python/` だけで処理が動く。
- OfficeファイルはMicrosoft Office COMでセッション一時PDFへ変換される。
- PDF結合、分割、ページ除外、ページ移動、装飾、検索置換、暗号化が実PDFバイトへ反映される。
- 進捗とログが現在のUIへ表示される。
- エラー時に対象ファイル、原因、復旧方法が表示される。
- セッションキャッシュが終了時またはキャンセル時に破棄される。
- 実ファイルを使った検証結果を `docs/reports/` に残す。

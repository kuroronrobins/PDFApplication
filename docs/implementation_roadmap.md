# Implementation Roadmap

更新日: 2026-05-11

## 現在地

PDF Workbench は旧 Flet/Python システムを `archive/legacy_flet_system_20260510/` に隔離し、Tauri v2 + React + TypeScript の新環境で開発する。現在は、ユーザーが要求した「一画面ワークベンチ」「ファイル単位カード」「ページ展開編集」「一括ジョブ」の操作体験を、UI/状態管理/ジョブ境界に加えて、active Python workerによる実PDF処理の初期接続まで実装済み。

完了済み:

- Phase 0: Tauri/React/Vite 基盤、旧環境アーカイブ、初期ワークベンチ UI、ビルド確認
- Phase 1: Zustand 状態モデル、Undo/Redo、出力予定計算
- Phase 2: Tauri/ブラウザ両対応のファイル追加、形式判定、メタデータ取得、追加ログ
- Phase 3: ファイルカード D&D、ファイル単位の除外/復帰、キーボード操作、ログドロワー
- Phase 4: セッション一時PDFキャッシュのTauriコマンド、Office変換キュー状態、優先変換
- Phase 5: PDF/変換済みOfficeのページ展開モデル、ページメタ情報、段階的読み込み表現
- Phase 6: ページ単位のD&D、ページ除外、複数選択、Undo/Redo接続
- Phase 7: ハサミ分割ライン、出力グループ表示、出力予定ファイル名
- Phase 8: ヘッダー/フッター/ページ番号/透かしの直接配置と浮動設定パネル
- Phase 9: 検索置換、暗号化、PDF情報パネルの統合
- Phase 10: 一括書き出しジョブの進捗、キャンセル、詳細ログ、下部バー接続
- Phase 11: 1366x768/1920x1080スクリーンショット確認、Tauriリリースビルド、npm監査
- Phase 12: `src-python/pdf_workbench_engine/` worker、Tauri command、UIからのPDF検査/Office変換/サムネイル生成/実PDF書き出し接続

今回の重要な境界:

- 実ファイル処理エンジンはactiveな `src-python/pdf_workbench_engine/` に接続済み。`archive/` 配下は参照専用であり、実行時には直接importしない。
- OfficeのPDF化は Microsoft Office COM のみを正式方針とし、LibreOffice fallback は採用しない。
- 書き出しworkerはNDJSONイベントで進捗をストリーミングし、Tauri側でPython子プロセスを保持してキャンセル時にkillする。
- 書き出し前のOffice/PDF準備処理はまだ個別同期worker呼び出しが残るため、完全キャンセル対象外である。
- Python workerソースはTauri bundle resourceへ含める。Python実行環境と依存ライブラリの完全同梱方式は未確定。

## 検証結果

| チェック | 結果 |
| --- | --- |
| `npm run build` | 成功 |
| `npm run tauri build` | 成功 |
| `npm audit --json` | 脆弱性 0 件 |
| `cargo check` | 成功 |
| Codex内ブラウザ DOM 確認 | 成功、コンソールエラー 0 件 |
| 1366x768 スクリーンショット | 成功 |
| 1920x1080 スクリーンショット | 成功 |
| 実PDF worker smoke | 成功、結合/分割/ページ移動/装飾/検索上書き/暗号化を一時PDFで確認 |
| worker streaming smoke | 成功、NDJSON進捗11イベントとresultを確認 |

検証画像:

- `docs/reports/screenshots/2026-05-11-workbench-complete-1366x768.png`
- `docs/reports/screenshots/2026-05-11-workbench-complete-1920x1080.png`
- `docs/reports/screenshots/2026-05-11-engine-ui-connected.png`

配布物:

- `src-tauri/target/release/pdf-workbench.exe`
- `src-tauri/target/release/bundle/msi/PDF Workbench_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/PDF Workbench_0.1.0_x64-setup.exe`

## 実装方針

このプロジェクトでは、画面を先に作って後から処理を押し込むのではなく、表示されているUIが実際の状態管理、入力、ジョブ、出力計画に接続されている状態を優先する。

基本原則:

1. 画面に状態を表示する。
2. ユーザー操作で状態を変更する。
3. 状態から出力計画を再計算する。
4. 重い処理はジョブ化し、進捗とログに接続する。
5. UI変更は1366x768と1920x1080で確認する。
6. 進捗と検証結果を `docs/reports/` に残す。

旧システムは参照専用とする。新規実装を `archive/` に追加しない。

実処理エンジンの詳細方針は `docs/processing_engine_plan.md` を正とする。旧Pythonサービスの処理ロジックは再利用するが、`archive/legacy_flet_system_20260510/` を実行時に直接参照しない。必要な処理は新しい `src-python/pdf_workbench_engine/` 配下へレビューして移植する。

## Phase Details

### Phase 0: 基盤

状態: 完了

目的: Tauri + React + TypeScript + Vite の新環境を構築し、旧Flet/Python環境を隔離する。

実装済み:

- 新規Tauri/React/Viteプロジェクト
- 旧システムの `archive/legacy_flet_system_20260510/` への隔離
- 一画面ワークベンチの初期UI
- 初期スクリーンショットとリリースビルド

### Phase 1: ワークベンチ状態モデル

状態: 完了

目的: ファイル、ページ、ツール、装飾、検索置換、セキュリティ、出力予定を状態として扱う。

実装済み:

- `WorkbenchFile`, `PageItem`, `Decoration`, `SearchReplaceState`, `SecurityState`, `OutputPlan`
- Zustand store
- Undo/Redo
- ファイル展開、ページ除外、分割ライン、装飾、出力予定の派生計算

### Phase 2: ファイル入力

状態: 完了

目的: PDF/Officeファイルを現実の入力として受け付ける。

実装済み:

- Tauri dialog による複数ファイル選択
- ブラウザ検証用 `<input type="file">` フォールバック
- OSドラッグ&ドロップの受け入れ
- Rust command `describe_input_files`
- PDF/Excel/Word/PowerPoint/未対応形式の判定
- 重複追加と未対応形式のログ

残る改善:

- 実PDFのページ数解析をPDFエンジン接続後に実データ化する。
- Tauri実機でのOSドロップパス取得精度を追加確認する。

### Phase 3: ファイルカード操作

状態: 完了

目的: 1ファイル1カードの基本操作を実用化する。

実装済み:

- ファイルカードのD&D並べ替え
- ドラッグ中の半透明表示と挿入位置ガイド
- ファイル単位の除外/復帰
- Ctrl+Z / Ctrl+Y / Delete / Escape
- ログドロワーの開閉

残る改善:

- 長いファイル名、多数ファイル時の表示密度を追加調整する。

### Phase 4: Office一時PDFキャッシュ

状態: 完了（実worker初期接続まで）

目的: Officeファイルを追加直後からカード操作可能にし、裏側でセッション一時PDF化を進める。

実装済み:

- Tauri側のセッション一時ディレクトリ作成/削除コマンド
- フロントエンドの `queued` / `converting` / `ready` / `error` / `stale` 状態
- Officeカードの即時表示、並べ替え、除外、出力対象化
- 1件ずつ進むバックグラウンド変換ジョブ表現
- 展開要求時の優先変換
- キャッシュ中アイコン、進捗、ログ表示

残る改善:

- Microsoft Office COM実機変換を検証する。
- 実キャッシュファイルの破棄タイミングを統合テストする。

### Phase 5: PDF読み込みとページ展開

状態: 完了（実PDF検査/サムネイル初期接続まで）

目的: PDFまたは変換済みOfficeをページ単位で編集対象にする。

実装済み:

- ページメタデータ、元ページ番号、出力グループの状態化
- PDF準備完了カードの展開
- 未準備Officeカードの優先変換
- ページサムネイル風プレビュー
- 除外、分割、装飾、検索ヒットの視覚表示

残る改善:

- 大容量PDFでのサムネイル生成負荷対策。
- 暗号化PDFのパスワード解除フロー。

### Phase 6: ページ編集

状態: 完了（UI/状態モデル）

目的: 展開後のページをページ単位で並べ替え、除外、移動できるようにする。

実装済み:

- ページD&D並べ替え
- ファイル境界をまたぐページ移動に対応した状態API
- 単一選択、Ctrl/Shift/Metaによる追加選択
- ゴミ箱ツールのドロップ/クリックによる除外切替
- Undo/Redo接続

残る改善:

- 複数ファイルを同時展開する表示モード。
- 実ポインター操作の追加回帰テスト。

### Phase 7: ハサミ分割と出力計画

状態: 完了

目的: 視覚的な分割ラインを出力ファイル計画に反映する。

実装済み:

- ハサミツールのページ間ドロップ/クリック
- 分割ラインの表示
- `出力 1`, `出力 2` のグループ表示
- 下部バーの出力予定ファイル名
- 除外ページを反映したページ数計算

残る改善:

- サイズ上限分割など、ルールベース分割の詳細UI。

### Phase 8: 装飾ツール

状態: 完了（UI/状態モデル）

目的: ヘッダー、フッター、ページ番号、透かしをページ上へ直接配置する。

実装済み:

- ツールバーからページへの直接ドロップ
- ページクリックでの配置
- ページ上ホットゾーン表示
- コンパクトな浮動設定パネル
- 対象範囲、文字列、位置、サイズ、濃度、削除
- 出力予定への装飾数反映

残る改善:

- 実PDF書き込み時のフォント、座標、余白ルール。

### Phase 9: 検索置換、暗号化、情報

状態: 完了（UI/状態モデル）

目的: 既存機能のうち独立ツールに相当するものを統合ワークベンチへ収める。

実装済み:

- 検索/置換パネル
- 検索ヒット表示
- 置換適用ログ
- 出力PDF暗号化設定
- PDF/ファイル情報パネル
- 出力予定への置換件数、暗号化状態反映

残る改善:

- 実テキスト抽出/置換エンジン。
- 入力PDFパスワード解除の安全な保存範囲。

### Phase 10: 一括書き出し

状態: 完了（実PDF書き出し初期接続まで）

目的: ワークベンチ状態を一括ジョブとして処理し、進捗とログだけを見せる。

実装済み:

- 書き出しジョブ状態
- ステップ列: Office変換、PDF解析、結合、ページ編集、分割、装飾、検索置換、暗号化、保存
- 進捗バー、現在ステップ、キャンセル
- ログドロワーとログコピー
- 出力先選択
- 出力予定ファイル名、暗号化、ページ数表示

残る改善:

- worker進捗イベントのストリーミング化。
- キャンセル時の子プロセス停止、失敗時のリトライ。

### Phase 11: 品質、配布、運用

状態: 完了（一回目の検証）

目的: 利用できる品質へ近づける。

実装済み:

- `npm run build`
- `npm run tauri build`
- `npm audit --json`
- 1366x768/1920x1080スクリーンショット確認
- Vite/esbuild監査指摘の解消
- Tauri配布物の生成

残る改善:

- 実PDF/Officeエンジン接続後の負荷テスト。
- 実ファイルを使った結合/分割/暗号化/装飾のE2Eテスト。
- リリース署名、アイコン、インストーラー表記の最終調整。

### Phase 12: 実処理エンジン接続

状態: 完了（進捗ストリーミング/書き出しキャンセル初期対応）

目的: 既存UI/状態モデルをactiveなPython workerへ接続し、表示上の操作を実PDFバイトへ反映する。

実装済み:

- `src-python/pdf_workbench_engine/` のactive worker
- Tauri command `run_processing_engine`
- Tauri bundle resourceへの `src-python` 同梱設定
- Tauri実行時のPDF検査、Office COM変換、サムネイル生成のバックグラウンド接続
- Office/PDFの処理エラーをカードとログへ表示
- 実ファイル追加時にサンプルワークスペースを自動クリア
- ページ移動後も元PDFを参照できる `sourceFileId`
- 書き出し時の実PDF結合、分割、ページ除外、ページ移動、装飾、検索上書き、暗号化
- workerのNDJSON進捗イベント
- Tauri job registryによるPython子プロセス保持
- 書き出し中止時の `cancel_processing_engine_job` と子プロセスkill
- UI下部バーへのworker進捗反映

残る改善:

- 書き出し前のOffice/PDF準備処理まで含む完全キャンセル
- Office COM実機変換検証
- Python runtime/dependency同梱方式の確定
- 大容量PDFでの遅延サムネイル生成

## 次に着手する作業

次の大きな実装対象は **実処理エンジンの仕上げ** とする。

推奨順:

1. Tauri側にジョブマネージャを作り、workerの進捗/ログをフロントエンドへイベント配信する。
2. キャンセル時にPython子プロセスを停止し、途中生成ファイルを破棄する。
3. Microsoft Office COM実機で Word/Excel/PowerPoint 変換を検証する。
4. Python実行環境と `pypdf` / PyMuPDF / pywin32 の配布方式を決める。
5. 暗号化PDFの入力パスワード解除フローをUIとして仕上げる。
6. 大容量PDFでサムネイル生成を遅延/ページ単位にする。
7. サンプルPDF/OfficeセットでE2E検証を作る。

### 実処理エンジン方針

| 項目 | 方針 |
| --- | --- |
| PDF結合/分割/ページ再構成 | 旧Pythonサービスの `pypdf` 実装方針を新しいPython workerへ移植して利用する |
| ページサムネイル/検索位置検出/装飾 | 旧Pythonサービスの PyMuPDF 実装方針を新しいPython workerへ移植して利用する |
| PDF暗号化 | 旧Pythonサービスの `pypdf` 実装方針を新しいPython workerへ移植して利用する |
| Office変換 | Microsoft Office COM のみ使用する |
| LibreOffice | 採用しない |
| RustネイティブPDF処理 | 初期実装では採用しない。将来の高速化/配布単純化候補として残す |
| Tauri/Rustの責務 | ジョブ管理、進捗イベント、ファイル選択、セッションキャッシュ、worker起動、エラー整形 |

詳細なファイル構成、worker通信プロトコル、移植ルール、実装タスクは `docs/processing_engine_plan.md` に記録する。

完了条件:

- Officeファイル追加後、カード操作は即時可能。
- キャッシュはセッション限定で、アプリ終了時に破棄される。
- 実PDFのページサムネイルが表示される。
- ハサミ/ゴミ箱/装飾/検索置換/暗号化が実出力PDFへ反映される。
- 書き出し失敗時にログ、対象ファイル、復旧方法が表示される。
- 1366x768と1920x1080で表示崩れがない。

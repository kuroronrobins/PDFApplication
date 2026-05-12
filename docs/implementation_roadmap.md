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
- Phase 13: 本番起動時の空ワークスペース化、デモデータ隔離、空状態の操作導線

今回の重要な境界:

- 実ファイル処理エンジンはactiveな `src-python/pdf_workbench_engine/` に接続済み。`archive/` 配下は参照専用であり、実行時には直接importしない。
- 本番起動時にサンプルファイルを自動投入しない。見た目確認用デモデータは明示的に呼び出す開発fixtureとしてのみ扱う。
- OfficeのPDF化は Microsoft Office COM のみを正式方針とし、LibreOffice fallback は採用しない。
- 書き出しworkerはNDJSONイベントで進捗をストリーミングし、Tauri側でPython子プロセスを保持してキャンセル時にkillする。
- 書き出し前のOffice/PDF準備処理はまだ個別同期worker呼び出しが残るため、完全キャンセル対象外である。
- Python workerソースとPython実行環境はTauri bundle resourceへ含める。`npm run build:release` が `build/python-runtime/python` を生成し、release exeは外部Python fallbackなしでも動く経路を持つ。

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
| 空ワークスペース起動確認 | 成功、サンプルファイル非表示、ファイル追加ボタン有効、書き出しボタン無効 |

検証画像:

- `docs/reports/screenshots/2026-05-11-workbench-complete-1366x768.png`
- `docs/reports/screenshots/2026-05-11-workbench-complete-1920x1080.png`
- `docs/reports/screenshots/2026-05-11-engine-ui-connected.png`
- `docs/reports/screenshots/2026-05-11-empty-workspace-startup.png`
- `docs/reports/screenshots/2026-05-11-file-card-interactions-empty-check.png`
- `docs/reports/screenshots/2026-05-11-pointer-dnd-thumbnail-config-empty-check.png`
- `docs/reports/screenshots/2026-05-12-empty-workbench-1366x768.png`
- `docs/reports/screenshots/2026-05-12-file-card-thumbnail-density-1366x768.png`
- `docs/reports/screenshots/2026-05-12-export-preview-modal-1366x768.png`
- `docs/reports/screenshots/2026-05-12-floating-panel-hidden-1366x768.png`
- `docs/reports/screenshots/2026-05-12-layout-fix-1366x768.png`

## 2026-05-12 レイアウト構造化と出力帯削除

- 固定表示していた `出力 1` / `出力 2` の背景帯を削除した。分割はページカード上のハサミマーカー、下部の出力予定数、プレビュー、実書き出し時の `splitAfter` で扱う。
- ファイルカードは grid 行で `種別/サムネイル/ファイル名/状態/メタ情報/進捗/操作/装飾` を予約し、PDF化中の進捗バーがカード外へ押し出さない構造にした。
- ページタイムラインは背景帯レイヤーを廃止し、タイムライン自体を1つのコンテナ背景にした。ページカードは `紙面 + ラベル` をカード内 grid に収める。
- 上部アクションは `プレビュー` と `書き出し` を分離し、`書き出し` は確認モーダルを経由せず直接実行する。
- 書き出しアイコンはアップロードに見える `Upload` からローカル出力を示す `FileOutput` に変更した。
- 並び替えツールは掴んで移動する意味を優先し、手のアイコンに変更した。
- ファイルカードからヘッダー、フッター、ページ番号、透かしをファイル単位で追加できるショートカットを追加した。装飾モデルに `file` スコープと `fileId` を追加し、Python側の装飾反映でも対象ファイルだけへ適用する。

検証:

- `npm run typecheck`
- `npm run build`
- `python -m compileall src-python\pdf_workbench_engine`
- `npm run tauri build`
- 1366x768 headless Chromium 表示確認: `docs/reports/screenshots/2026-05-12-layout-actions-1366x768.png`
- `docs/reports/screenshots/2026-05-12-layout-actions-1366x768.png`

配布物:

- `src-tauri/target/release/pdf-workbench.exe`
- `src-tauri/target/release/bundle/msi/PDF Workbench_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/PDF Workbench_0.1.0_x64-setup.exe`

## 2026-05-12 操作性補強

実装済み:

- Tauri v2 の `getCurrentWebview().onDragDropEvent` を利用し、Explorer からアプリへ落としたファイルパスを `describe_input_files` に渡す経路を追加。
- ファイル追加の複数選択を明示し、ブラウザ検証時も複数ファイル投入を確認。
- 装飾、検索、鍵、情報の浮動設定パネルに閉じる操作を追加。閉じた後は小さな「設定」ボタンで再表示できる。
- ファイルカード幅は維持し、ファイル単位サムネイルを拡大して内容を確認しやすくした。
- 書き出し前のプレビューモーダルを追加し、出力ファイル単位のページ並び、除外、分割、装飾、暗号化状態を確認してから実行できるようにした。

検証:

- `npm run typecheck`: 成功
- `npm run build`: sandbox 内では `EPERM`、外部実行で成功
- `npm run tauri build`: sandbox 内では `EPERM`、外部実行で成功
- headless Chromium CDP で 1366x768 の空状態、複数ファイル追加後、書き出しプレビュー、設定パネル非表示を確認

残る確認:

- Tauri 実機上で Explorer からの手動ファイルドロップを確認する。
- プレビューから実PDF書き出しまでのOffice混在E2Eを確認する。

## 2026-05-12 権限とレイアウト修正

実装済み:

- Tauri capability に `core:event:default` を追加し、frontend の `event.listen` を許可した。
- Explorer D&D 待ち受けと書き出しworker進捗ストリーミングが同じ権限不足で失敗していたため、両方を同時に解消する構成にした。
- ツールバー先頭の表示名を「選択」から「並び替え」へ変更した。
- ファイルカード下部がファイル順序セクションからはみ出さないよう、上段ワークベンチ行を 316px に調整し、カード下部操作の重複した上下移動ボタンを削除した。
- ページタイムラインの左右余白を 22px に広げ、1ページ目が左境界へ寄りすぎないようにした。

検証:

- `npm run typecheck`: 成功
- `npm run build`: 成功
- `npm run tauri build`: 成功
- headless Chromium CDP で 1366x768 のレイアウトを確認。ファイルカード下端はセクション下端より 5px 内側、1ページ目左余白は 22px。

残る確認:

- Tauri実機で Explorer からの手動D&Dと、プレビュー後の実書き出しを再確認する。

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
- 別PCへのNSIS/MSIインストール後のクリーン環境検証
- 大容量PDFでの遅延サムネイル生成

### Phase 13: 空起動と操作導線

状態: 完了

目的: アプリ起動直後に見た目確認用サンプルが表示される状態をやめ、ユーザーが実ファイル追加から作業を開始できる状態にする。

実装済み:

- 本番初期状態を空のワークスペースへ変更
- 初期ファイル、初期ページ、初期装飾、初期検索条件、初期ログの自動投入を停止
- 空のファイル順序エリアに追加/ドロップ開始の空状態を表示
- 書き出し対象ページが0件のとき、書き出しボタンを無効化
- ファイル追加キャンセル時のログ表示
- 起動直後にサンプルファイルが存在しないことをブラウザで確認

残る改善:

- Tauri実機でPDFファイル追加から書き出しまでの操作録画/E2E確認
- 明示的な開発用デモ読み込みコマンドが必要かどうかの判断

## 次に着手する作業

次の大きな実装対象は **実処理エンジンの仕上げ** とする。

推奨順:

1. 書き出し前のOffice/PDF準備処理まで含む完全キャンセルを実装する。
2. 別PCへNSIS/MSIをインストールし、Officeあり・Python/Node/Rustなしの環境で起動/変換/書き出しを検証する。
3. Explorerからのドラッグ&ドロップを手動スモークし、必要ならOS D&Dのログと権限を追加調整する。
4. 暗号化PDFの入力パスワード解除フローをUIとして仕上げる。
5. 大容量PDFでサムネイル生成を遅延/ページ単位にする。

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

## 2026-05-12 装飾一括操作とカード内包の実装

実装済み:

- ファイルカード下のヘッダー/フッター/ページ番号/透かしの個別アイコン列を廃止した。
- ツールバーでヘッダー/フッター/透かしを選択し、ファイルカードクリックでファイル内全ページへ一括適用/解除、ページクリックでページ単位適用/解除する。
- ファイルカードに `H` / `F` / `W` の全適用/部分適用マークを表示する。
- ページ番号はヘッダー/フッター文字列内の `{page}` / `{total}` トークンとして扱う。
- ヘッダー/フッターは左/中央/右を個別配置できる。
- 透かしは中央固定、斜め表示、自動サイズ、薄赤/グレー/任意色とし、濃度設定を廃止した。
- 装飾設定パネルはクリックしたページではなく、選択中の編集ツールで切り替える。
- ページ単位の `除外` 表示を廃止し、除外状態はグレー表示だけにした。
- ファイル単位の `除外` は確認後にワークスペースから取り除く。元ファイルは削除しない。
- `PDF準備完了` と `待機中` の常時表示を廃止した。
- ファイルごとの変換進捗バーを廃止し、下部バーで全体進捗を扱う。
- ブラウザ検証用に `?fixture=workbench` と `tool=` の明示フィクスチャを追加した。通常起動は空ワークスペースを維持する。

検証:

- `npm run typecheck`
- `python -m compileall src-python\pdf_workbench_engine`
- `npm run build`
- `npm run tauri build`
- `docs/reports/screenshots/2026-05-12-decoration-batch-toggle-1366x768.png`
- `docs/reports/screenshots/2026-05-12-decoration-tool-panel-1366x768.png`

## 2026-05-12 追加実装: 装飾スロットと出力ファイル指定

完了:

- ファイルカード下部の装飾バッジを廃止し、代表サムネイル上へヘッダー/フッター/透かしを直接描画。
- ページサムネイルのヘッダー/フッターを左・中央・右スロットに分離し、複数箇所の設定が重ならない表示へ変更。
- 展開ボタンを強調表示し、ファイルカードの縦方向レイアウトを1366x768で収まる密度に再調整。
- 出力先選択をフォルダ指定からPDFファイル指定へ変更。複数出力時は指定stemに `_001`, `_002` を付与。
- Python workerの中間PDFをランダム接頭辞付き一時ファイルへ変更し、処理後に削除。
- PyMuPDFの装飾/検索置換に `japan` フォントを指定し、日本語テキストの描画に対応。

検証:

- `npm run typecheck`
- `python -m compileall src-python`
- `npm run build`
- `npm run tauri build`
- Python worker smoke: `outputPath=pdfwb_smoke_final.pdf` から `pdfwb_smoke_final_001.pdf` / `pdfwb_smoke_final_002.pdf` のみ生成され、一時ファイルが残らないことを確認。
- Browser visual check: `docs/reports/screenshots/2026-05-12-decoration-slots-output-file-1366x768.png`

## 2026-05-12 プレビュー刷新と装飾除外ルール
実装済み:

- 書き出しプレビューを大型中央ページ + 下部フィルムストリップへ刷新した。除外ページは表示せず、分割後の出力境界はフィルムストリップ上のハサミ区切りで示す。
- プレビューは左右ボタンとキーボード左右キーでページ移動でき、選択中サムネイルは青枠のみでハイライトする。
- ファイル単位サムネイルの装飾表示は、対象ファイルの全出力ページへ同じ装飾が適用されている場合だけ表示する。
- ファイル単位で一括適用したヘッダー/フッター/透かしは、ページ単位クリックで重複追加せず、そのページだけ一括適用から除外/復帰する。
- Python の PDF 装飾反映でも `excludedPageIds` を解釈し、UIのページ単位解除が実PDFへ反映される。
- 書き出し完了後、最後に生成した出力ファイルを開くボタンと、エクスプローラーで表示するボタンを下部バーに出す。

検証:

- `npm run typecheck`
- `python -m compileall src-python`
- `npm run build`
- `npm run tauri build`
- Browser visual check: `docs/reports/screenshots/2026-05-12-preview-modal-redesign-1280x720.png`

残課題:

- 実ファイルを使ったTauriウィンドウ上の保存ダイアログE2E確認。
- 装飾スロットの直接クリック解除やスロット別プリセット保存など、さらに直感的な解除UXの拡張。

## 2026-05-13 Preview resolution / numbering / font follow-up

Implemented:

- Export preview now uses a dedicated high-resolution `previewPath` generated beside the compact `thumbnailPath`.
- PDF thumbnail rendering requests use `previewZoom: 2.25` for the large preview and keep compact thumbnails lightweight.
- Preview filmstrip layout now reserves a grid row with contained thumbnail cards so the top of thumbnails is not hidden by modal overflow.
- Preview info icon opens a compact popover explaining excluded pages, split markers, and output-order numbering.
- Header/footer/page-number placeholders now receive post-merge output numbering in both UI preview and Python export decoration context.
- UI decoration text uses a gothic/sans font stack compatible with Japanese text.
- PDF decoration/search overlay code now prefers `BIZ UDPGothic` / `Yu Gothic` Windows font files, with the existing Japanese fallback retained.

Verification:

- `npm run typecheck`
- `python -m compileall src-python\pdf_workbench_engine`
- `npm run build` passed after rerunning outside the sandbox because the sandbox blocked Vite config loading with `spawn EPERM`.
- `npm run tauri build` passed after rerunning outside the sandbox for the same `spawn EPERM` sandbox limitation.
- Screenshot: `docs/reports/screenshots/2026-05-13-preview-resolution-layout-1366x768.png`

Remaining:

- Recheck with real text-heavy PDFs in the Tauri runtime because the browser fixture uses placeholder page imagery.

## 2026-05-13 Startup splash B implementation

Implemented:

- Added a two-window startup flow: static `splashscreen` visible first, hidden `main` workbench shown after frontend initialization.
- Added Tauri command `complete_startup` to show/focus the main window and close the splash window.
- Added bundled splash HTML and B-direction desk/workbench artwork under `public/`.
- Added Windows release console suppression via `windows_subsystem = "windows"`.
- Kept Tauri IPC capabilities scoped to the `main` window; the static `splashscreen` window does not require dialog or event permissions.

Verification:

- `npm run typecheck`: passed.
- `cargo check`: passed.
- `npm run build`: sandbox blocked Vite config loading with `spawn EPERM`; rerun outside sandbox passed.
- `npm run tauri build`: passed outside sandbox and produced release exe plus MSI/NSIS bundles.
- Headless Edge screenshot: `docs/reports/screenshots/2026-05-13-startup-splash-b.png`.
- `cargo fmt --check`: not clean because existing unrelated files `src-tauri/build.rs` and `src-tauri/src/python_worker.rs` have formatting diffs; not reformatted in this splash change.

Remaining:

- Decide whether splash status should receive real backend phase events instead of local rotating text.
- Re-test startup timing from the generated release executable on the target PC workflow.

## 2026-05-13 Startup splash A picture adoption

Implemented:

- Replaced the startup splash hero artwork with the selected earlier A-direction glass desk / PDF workbench picture.
- Added `public/assets/splash-workbench-a.png` as a cropped repository asset from the generated concept board.
- Updated `public/splashscreen.html` to load the new PNG while preserving the existing splash layout and startup behavior.

Verification:

- `npm run typecheck`
- `npm run build` passed after rerunning outside the sandbox because the sandbox blocked Vite config loading with `spawn EPERM`.
- Headless Edge screenshot: `docs/reports/screenshots/2026-05-13-startup-splash-a-picture.png`

Remaining:

- Re-test startup timing from the generated release executable on the target PC workflow.

## 2026-05-13 Startup splash minimum display duration

Implemented:

- Added a 4-second minimum splash display guard to the Tauri `complete_startup` command.
- The guard measures from application launch and only waits for the remaining time when startup preparation finishes too quickly.
- The main window still appears immediately after the 4-second minimum has elapsed on slower machines.

Verification:

- `cargo fmt --check`: passed.
- `cargo check`: passed.
- `npm run typecheck`: passed.
- `npm run tauri build`: passed and regenerated the release exe plus NSIS/MSI bundles.
- Visual asset unchanged; existing splash screenshot remains `docs/reports/screenshots/2026-05-13-startup-splash-a-picture.png`.

Remaining:

- Confirm the 4-second splash hold by launching the regenerated installer build in the target user workflow.

## 2026-05-13 Installer Japanese alpha wording

Implemented:

- Configured bundle metadata with `koki kurokawa` as publisher and copyright owner.
- Added a Japanese alpha notice shown as the installer license/notice page.
- Switched the NSIS installer to Japanese and added Japanese custom strings for Tauri-specific installer messages.
- Added a Japanese WiX locale file for MSI-specific strings.
- Kept `productName` as `PDF Workbench` to avoid changing app identity or installer upgrade behavior.

Verification:

- Tauri config JSON parse check: passed.
- `npm run typecheck`: passed.
- `cargo check`: passed.
- `npm run tauri build`: passed and regenerated the release exe plus NSIS/MSI bundles.
- Generated NSIS source inspection passed:
  - Japanese language setup is included.
  - `koki kurokawa` metadata is included.
  - The alpha notice is wired as the installer license/notice page.
- Generated WiX source inspection passed:
  - `ja-JP` locale strings are included.
  - The generated license RTF contains the Japanese alpha notice.

Remaining:

- Launch the regenerated NSIS installer and visually confirm that the Japanese text and alpha notice match the intended tone.

## 2026-05-13 Office COM / alpha license / layout hardening

Implemented:

- Fixed the Office conversion bridge so the frontend accepts both `outputPath` and `cachePath` from the Python worker. This connects converted Word/Excel/PowerPoint PDFs back into the same PDF inspection, thumbnail, edit, preview, and export workflow.
- Updated the Python `convert_office` job response to return `sourcePath`, `outputPath`, `cachePath`, `outputName`, and `kind`.
- Added a Tauri startup alpha-license command. The alpha build is valid through 2026-06-30 and blocks the workbench from 2026-07-01 00:00:00 JST onward.
- Added an expired-alpha screen in React and prevented background file processing when the alpha check is invalid.
- Removed the `D&D対応` chip from the file-order header.
- Reworked file-card loading/conversion layout so status badges and errors stay inside the card grid.
- Extended the file-order tray visually to the right edge, matching the page timeline's full-width work area.
- Made the log drawer wrap long Windows paths and session IDs instead of allowing horizontal overflow.
- Re-cropped the selected splash A image so it is shown more pulled back while still covering the picture area without blank margins.

Verification:

- `npm run typecheck`: passed.
- `python -m compileall src-python\pdf_workbench_engine`: passed.
- `cargo check`: passed.
- `npm run build`: sandbox blocked Vite config loading with `spawn EPERM`; rerun outside sandbox passed.
- `python -c "import win32com.client; print('pywin32 ok')"` with `PYTHONPATH=src-python`: passed.
- Office worker shape smoke with a missing `.docx`: returned expected `input_not_found`, confirming `sourcePath` is now passed to the worker instead of being lost.
- `npm run tauri build`: passed outside sandbox and produced release exe plus MSI/NSIS bundles.
- Screenshot: `docs/reports/screenshots/2026-05-13-office-ui-layout-1366x768.png`
- Screenshot: `docs/reports/screenshots/2026-05-13-startup-splash-a-picture.png`

Remaining:

- Run Word/Excel/PowerPoint real-document conversion on a Windows machine with Microsoft Office installed and record the output PDFs.
- Package or document the Python runtime and required Python libraries for alpha distribution PCs.

## 2026-05-13 Office COM real-file E2E

Implemented during verification:

- Hardened `src-python/pdf_workbench_engine/services/office_com.py` for real Office COM conversion:
  - Stage Office input files into the session cache before conversion.
  - Use explicit read-only/open-and-repair options for Word.
  - Use more defensive Excel open options, including link suppression, local mode, repair loading, and Protected View fallback.
  - Remove staged source copies after conversion.

E2E result:

- `job_history.xlsx` converted through Excel COM to a 7-page PDF.
- `プレゼン資料 (003).pptx` converted through PowerPoint COM to a 27-page PDF.
- `生体機械力学１.docx` converted through Word COM to a 7-page PDF.
- The mixed 41-page workspace exported with one split marker into two final PDFs:
  - `office-e2e-result_001.pdf`: 7 pages
  - `office-e2e-result_002.pdf`: 34 pages
- Header, footer, and watermark decorations were applied and preview-rendered from the final PDFs.

Verification:

- `python -m compileall src-python\pdf_workbench_engine`: passed.
- Excel COM blank workbook smoke outside sandbox: passed.
- Full Office COM E2E outside sandbox: passed.
- Evidence report: `docs/reports/2026-05-13-office-com-e2e.md`
- Summary JSON: `docs/reports/e2e/2026-05-13-office-com/summary.json`
- Final output PDFs: `docs/reports/e2e/2026-05-13-office-com/outputs/`

Remaining:

- Repeat the same scenario from the Tauri UI/release executable with Explorer drag-and-drop and visible UI logs.
- Package or document the Python runtime and Office dependency expectations for alpha distribution PCs.

## 2026-05-13 Tauri release UI E2E

Implemented during verification:

- Added an environment-gated E2E bootstrap for the Tauri release executable.
- `PDF_WORKBENCH_E2E=1` allows a controlled file list, output path, auto-export flag, and result JSON path to be provided by the test harness.
- Normal startup remains an empty workspace because the bootstrap is inactive unless the explicit E2E environment variable is set.

E2E result:

- `src-tauri/target/release/pdf-workbench.exe` launched successfully.
- The release UI loaded the three user-provided Office files, converted them through Microsoft Office COM, generated thumbnails, applied header/footer/watermark decorations, inserted one split marker, and exported two PDFs.
- Final output inspection confirmed 7 pages in output 1 and 34 pages in output 2.

Verification:

- `npm run typecheck`: passed.
- `cargo check`: passed.
- `python -m compileall src-python\pdf_workbench_engine`: passed.
- `npm run tauri build`: passed outside the sandbox.
- Release executable E2E: passed.
- Evidence report: `docs/reports/2026-05-13-tauri-release-ui-e2e.md`
- Screenshot: `docs/reports/screenshots/2026-05-13-tauri-release-ui-e2e.png`

Remaining:

- Manual Explorer drag-and-drop smoke test on the target machine.
- Clean-machine installer validation on an Office-equipped PC outside this development workspace.

## 2026-05-13 Small-window release build and bundled runtime

Implemented:

- Lowered the main Tauri window minimum from 1180x700 to 860x560.
- Added responsive compression for the header, tool bar, workbench rows, file cards, page timeline, and bottom output bar so the app stays operable at the smaller minimum.
- Added `scripts/build-python-runtime.ps1` and `npm run build:release`.
- Changed the Tauri build resource set to include both `src-python` and `build/python-runtime/python`.
- Updated the Rust worker launcher so release builds prefer the bundled Python runtime and can disable system-Python fallback with `PDF_WORKBENCH_DISABLE_PYTHON_FALLBACK=1`.

Verification:

- Bundled runtime smoke: `build\python-runtime\python\python.exe -E -s -c "import pypdf,fitz,win32com.client,pythoncom"` passed.
- Headless Edge layout screenshots were captured at 860x560 and 1366x768.
- `npm run tauri build` passed and produced:
  - `src-tauri/target/release/pdf-workbench.exe`
  - `src-tauri/target/release/bundle/nsis/PDF Workbench_0.1.0_x64-setup.exe`
  - `src-tauri/target/release/bundle/msi/PDF Workbench_0.1.0_x64_en-US.msi`
- Release exe E2E passed with `PDF_WORKBENCH_DISABLE_PYTHON_FALLBACK=1` and no `PDF_WORKBENCH_PROJECT_ROOT`, using the three user-provided Office files. The output was split into 7-page and 34-page PDFs.

Evidence:

- Report: `docs/reports/2026-05-13-small-window-runtime-bundle.md`
- Screenshots:
  - `docs/reports/screenshots/2026-05-13-small-window-860x560.png`
  - `docs/reports/screenshots/2026-05-13-small-window-1366x768.png`
- E2E JSON: `docs/reports/e2e/2026-05-13-small-window-runtime/ui-result.json`
- E2E output PDFs: `docs/reports/e2e/2026-05-13-small-window-runtime/outputs/`

Remaining:

- Validate the NSIS/MSI installer on a separate clean Windows PC that has Microsoft Office installed but no development Python, Node, or Rust toolchains.

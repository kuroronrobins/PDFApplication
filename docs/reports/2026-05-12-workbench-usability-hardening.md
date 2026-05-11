# 2026-05-12 Workbench Usability Hardening

## Scope

- Explorer からの OS ファイルドラッグ&ドロップ受け入れを Tauri v2 の webview drag/drop event に接続。
- ファイル追加の複数選択経路を明示。
- 装飾、検索、鍵、情報の浮動設定パネルを閉じられるようにし、必要時だけ再表示できる導線を追加。
- ファイルカードの横幅を維持したまま、ファイル単位サムネイルを拡大。
- 書き出し前に出力内容を確認するプレビューモーダルを追加。

## Changed Files

- `src/App.tsx`
- `src/styles.css`
- `docs/implementation_roadmap.md`
- `docs/tauri_ui_redesign_plan.md`
- `docs/reports/2026-05-12-workbench-usability-hardening.md`
- `docs/reports/screenshots/2026-05-12-empty-workbench-1366x768.png`
- `docs/reports/screenshots/2026-05-12-file-card-thumbnail-density-1366x768.png`
- `docs/reports/screenshots/2026-05-12-export-preview-modal-1366x768.png`
- `docs/reports/screenshots/2026-05-12-floating-panel-hidden-1366x768.png`

## User-Visible Behavior

- Tauri 実行時は `getCurrentWebview().onDragDropEvent` で Explorer から落とされたファイルパスを受け取り、`describe_input_files` 経由でワークベンチへ追加する。
- ブラウザ検証時のファイル入力は `multiple={true}` で複数ファイルを受け付ける。
- 浮動設定パネル右上の閉じるボタンでパネルを隠せる。隠した後は右下の小さな「設定」ボタンで再表示できる。
- ファイルカードのプレビュー紙面を `78x96` に拡大し、カード幅は `190px-220px` の範囲に維持した。
- 書き出しボタンは即実行せず、出力ファイル数、ページ数、除外、分割、装飾、暗号化状態、出力ごとのページ並びを確認するモーダルを開く。

## Verification Commands

- `npm run typecheck`: success
- `npm run build`: success outside sandbox after sandbox `EPERM`
- `npm run tauri build`: success outside sandbox after sandbox `EPERM`
- Headless Chromium CDP visual check at `1366x768`: success

## Screenshot Paths

- `docs/reports/screenshots/2026-05-12-empty-workbench-1366x768.png`
- `docs/reports/screenshots/2026-05-12-file-card-thumbnail-density-1366x768.png`
- `docs/reports/screenshots/2026-05-12-export-preview-modal-1366x768.png`
- `docs/reports/screenshots/2026-05-12-floating-panel-hidden-1366x768.png`

## Known Limitations

- Explorer D&D は Tauri の webview event 経路を実装したが、実機での手動ドロップ操作は未実施。ブラウザ検証では CDP による複数ファイル投入で追加経路を確認した。
- Codex Browser plugin は必須の `browser-client.mjs` が見つからなかったため、今回は headless Chromium + CDP で代替検証した。
- プレビューモーダルは現在のワークベンチ状態のページ並び確認であり、最終PDFバイトをレンダリングした完全出力プレビューではない。

## Next Recommended Step

- Tauri 実機上で Explorer からの複数ファイルドロップ、Office ファイル混在、書き出し前プレビューからの実書き出しまでを手動E2E確認する。

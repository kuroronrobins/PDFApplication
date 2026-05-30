# 2026-05-30 PC Load Usability Audit

## Scope

現存の PDF Workbench で、PC 負荷軽減を優先した結果、使い勝手が損なわれている箇所を調査した。実装は変更せず、既存コード、既存レポート、headless Chrome/CDP による大ページ fixture 表示を確認した。

## Changed files

- `docs/reports/2026-05-30-pc-load-usability-audit.md`
- `docs/reports/screenshots/2026-05-30-usability-large-pages-workbench.png`
- `docs/reports/screenshots/2026-05-30-usability-large-pages-preview.png`

## Findings

### 1. 書き出しプレビューが、事前に展開していないPDFでは実質プレビューにならない

負荷対策として、実ファイル準備時はページ構造だけ作り、サムネイルはファイル展開時まで遅延されている。該当箇所は `src/features/workbench/engineWorkflow.ts` の `completeFileInspection` 呼び出しで、メッセージも「サムネイルは展開時に生成します」となっている。実際の生成トリガーも `src/App.tsx` の `expandedThumbnailFileId` 監視だけで、書き出しプレビューを開いたときには発火しない。

さらに `src/features/workbench/backend.ts` の `renderPdfThumbnails*` は `previewZoom: 0` を渡しており、展開後であっても高解像度プレビュー画像は作られない。`src/App.tsx` の書き出しプレビューは `previewPath` または `thumbnailPath` がなければファイル名だけのプレースホルダーを表示する。

影響: ユーザーが「プレビュー」を押しても、事前に各ファイルを展開していない場合はページ内容を確認できない。これは「書き出し前の確認」というユーザー期待を外している。

### 2. 大PDFの展開画面は負荷面では軽いが、ページ操作面では狭すぎる

`?fixture=large-pages` で 1200 ページを表示したところ、1366x768 相当の画面でページタイムラインの実表示領域は約 `127px` 高だった。スクロール領域は `11914px` あり、DOM 上のページカードは仮想化により `72` 個に抑えられていたが、画面上で見えるのはほぼ 1 行分だけだった。

該当実装は `src/App.tsx` の `pageTimelineColumnCount = 12`, `pageTimelineRowHeight = 119`, `pageTimelineOverscanRows = 2` と、`visiblePages = pages.slice(...)` による仮想化。CSS 側では `.page-timeline` が固定グリッドのスクロール領域になっている。

影響: 1200 ページのような長いPDFで、分割線挿入、削除、ページ移動を視覚的に行うには縦スクロールが長すぎる。ページ番号ジャンプ、検索、出力境界一覧などがないため、軽さと引き換えにページ編集の到達性が落ちている。

### 3. 書き出しプレビューのフィルムストリップは全ページ描画で、確認導線も重く長い

同じ 1200 ページ fixture で書き出しプレビューを開くと、`.filmstrip-thumb` が `1200` 個マウントされ、横スクロール幅は `109203px` になった。ページ画像はすべてプレースホルダーで、画像サムネイルは `0` 件だった。

該当実装は `src/App.tsx` の `pages.map(...)` によるフィルムストリップ全件描画。プレビューの worker 生成は `previewNavigationSettleMs = 140` と `previewNeighborPrefetchDelayMs = 260` で遅延されるが、フィルムストリップ自体は仮想化されていない。

影響: 出力プレビューは「全体確認」の入口なのに、ページ数が多いほど目的ページへたどり着きにくい。負荷回避のために精密プレビューを遅らせる設計と、全ページフィルムストリップの横長UIが噛み合っていない。

### 4. Officeのみのバッチでは、変換完了前に書き出し予約できない

Office ファイルは追加時点でカード化されるが、`src/features/workbench/store.ts` の `addInputFiles` は Office の `pageCount` を `0`、`pagesByFile[id]` を空配列にする。`buildOutputPlan` はページ配列から `activePageCount` を数えるため、Office だけのワークスペースでは変換前の `activePageCount` が `0` になる。

その結果、`src/App.tsx` の AppBar は `outputPlan.activePageCount === 0` の間、`出力名`、`プレビュー`、`書き出し` を disabled にする。`handleExport` も同じ条件で戻る。一方、`handleExport` 自体は本来 `processAllPendingEngineFiles` で未完了 Office を先に処理できる構造を持っている。

影響: AGENTS.md の「Office file cards can be reordered, excluded, and included in export before conversion completes」に反する。PDFを1つでも含む混在バッチでは進めるが、Officeのみの実務バッチで「追加して書き出し開始、変換は待つ」ができない。

### 5. Office変換キューは安定性重視だが、待ち状態が見えにくい

Office 変換は `processNextPendingEngineFile` が `inFlightFiles.size > 0` の間は新規開始しないため、1件ずつ処理される。これは安定性のための方針として妥当。ただし、投入直後は `backgroundProcessingPausedUntil: Date.now() + 1200` で処理開始を遅らせ、さらに 900ms 間隔の timer で起動される。

UI 側では `cacheLabel` が `queued` を `undefined` にしており、待機中カードには明示的な「PDF化待ち」やキュー順位が出ない。カード下部は `順序編集可` と表示されるため、変換待ちなのか、ただ操作可能なのかが分かりにくい。

影響: ユーザーは「優先」ボタンを押せるが、何番目なのか、押した効果がいつ出るのか、現在処理中のファイルがどれかを把握しづらい。負荷・安定性のための直列キューは維持してよいが、可視化が不足している。

## Verification commands

- `Get-Content -Encoding UTF8 -Path AGENTS.md`
  - Passed. UI/Office policyを確認。
- `Get-Content -Path docs/tauri_ui_redesign_plan.md`
  - Read attempted. Console output was mojibake in default PowerShell decoding, but AGENTS.md and code-level policy were usable.
- `npm run dev -- --host 127.0.0.1 --port 5173`
  - Failed inside sandbox with known Vite/Rolldown `spawn EPERM`.
- Vite dev server start outside sandbox
  - Passed after approval. Used only for local UI inspection.
- `Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:5173/?fixture=large-pages -TimeoutSec 5`
  - Passed. HTTP 200.
- Headless Chrome/CDP large-page workbench inspection
  - Passed. 1200-page fixture, mounted page cards `72`, timeline client height about `127px`, no thumbnail images.
- Headless Chrome/CDP export preview inspection
  - Passed. Filmstrip items `1200`, scroll width `109203px`, placeholder thumbnails `1200`, image thumbnails `0`.

## Screenshot paths

- `docs/reports/screenshots/2026-05-30-usability-large-pages-workbench.png`
- `docs/reports/screenshots/2026-05-30-usability-large-pages-preview.png`

## Known limitations

- Browser checks used development fixtures, not real large PDFs with actual rendered thumbnails.
- Tauri shell and Office COM were not run in this investigation.
- Manual Explorer drag-and-drop was not tested.
- No typecheck/build was run after this report-only change.

## Next recommended step

Fix the preview path first: opening書き出しプレビュー should request current and nearby page thumbnails/previews on demand, independent of whether the user expanded the file card. Then allow Office-only export jobs to start before page records exist, virtualize the preview filmstrip, and add explicit Office queue status and page-number jump controls.

# Tauri UI Redesign Plan

更新日: 2026-05-11

## 1. 方針

PDFアプリケーションは Tauri を使用して全面刷新する。旧Flet/Python UIは新環境へ混ぜず、`archive/legacy_flet_system_20260510/` に隔離した参照専用資産として扱う。

新UIは、左サイドバーや常設の大型設定パネルを置かない。中心は一画面で完結するワークベンチであり、ファイル、ページ、分割線、削除、装飾、検索置換、暗号化、書き出しを同じ作業面で扱う。

重要な設計判断:

- 左サイドバーは置かない。
- 常設の大型右サイド設定パネルも置かない。
- 初期表示は「1ファイル = 1つのファイルカード」。
- ファイルカードを展開したときだけページサムネイルを表示する。
- Excel / Word / PowerPoint / PDF は同じワークスペースへ追加できる。
- Officeファイルは追加直後から順序変更、除外、出力対象化ができる。
- Officeファイルはバックグラウンドでセッション一時PDF化する。
- Officeファイルの実変換は Microsoft Office COM のみを使用する。LibreOffice は採用しない。
- 実行環境に Microsoft Word / Excel / PowerPoint と COM 自動化に必要な依存があることを前提にする。
- 一時PDFキャッシュは永続保存しない。
- 複雑な処理は通常画面に露出せず、下部の進捗とログドロワーに閉じ込める。
- 結合、分割、削除、装飾、検索置換、暗号化は個別実行ではなく、一括書き出しでまとめて反映する。

## 2. 画面構成

1366x768 のHDモニターでも作業できる密度を基準にする。初期画面は次の構成。

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ PDF Workbench        ファイル追加  出力先  元に戻す  やり直す  書き出し      │
├────────────────────────────────────────────────────────────────────────────┤
│ 選択  ハサミ  ゴミ箱  ヘッダー  フッター  ページ番号  透かし  検索置換 鍵 情報 │
├────────────────────────────────────────────────────────────────────────────┤
│ ファイル順序                                                                  │
│ [見積.xlsx] [契約書.docx] [説明資料.pptx] [添付資料.pdf]                       │
│ PDF準備完了    PDF化待機       PDF化中 18%       PDF準備完了                  │
│                                                                                │
│ 添付資料.pdf 展開中                                                            │
│ 出力1: p1 p2 p3 p4 p5 p6 p7 p8 p9 p10 |ハサミ| 出力2: p11 p12                │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────┤
│ 出力予定 2ファイル   result_001.pdf / result_002.pdf   進捗  ログ             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 アプリバー

上段には最小限のコマンドだけを置く。

- ファイル追加
- 出力先
- 元に戻す
- やり直す
- 現在ジョブの簡易ステータス
- 書き出し

処理条件や詳細設定を常時並べない。ユーザーの視線は中央ワークスペースに残す。

### 2.2 ツールバー

ツールはアイコン中心で上部に集約する。クリックで選択でき、ページやワークスペースへドラッグして適用できる。

| ツール | 操作 |
| --- | --- |
| 選択 | ファイル/ページ選択、ドラッグ移動 |
| ハサミ | ページ間へ分割線を挿入 |
| ゴミ箱 | ページを出力対象外にする |
| ヘッダー | ページ上部へ直接配置 |
| フッター | ページ下部へ直接配置 |
| ページ番号 | 任意位置へ配置し、形式を浮動パネルで編集 |
| 透かし | ページ中央または全体へ配置 |
| 検索置換 | 検索置換パネルで対象と件数を確認して一括適用 |
| 鍵 | 出力PDFの暗号化と権限設定 |
| 情報 | PDF/ファイル情報表示 |

## 3. 中央ワークスペース

### 3.1 通常状態: ファイルカード表示

通常状態では、ファイルを1つのまとまりとして表示する。ファイルカードの順序が最終的な結合順になる。

カードに表示する情報:

- ファイル名
- 種別: PDF / Excel / Word / PowerPoint
- サムネイルまたは準備中プレースホルダー
- ページ数
- 暗号化状態
- キャッシュ状態
- 展開ボタン
- 除外/復帰

Officeファイルは、PDF化が完了していなくてもファイル単位の並べ替え、出力対象化、除外、書き出し予約ができる。PDF化が完了した時点でページ展開とページ編集が可能になる。

ドラッグ中はカードのプレビューが半透明でマウスに追従し、挿入先にガイドを出す。ファイル単位の並べ替えが明確に分かることを優先する。

### 3.2 展開状態: ページタイムライン

ファイルカードを展開すると、そのファイルのページだけを横方向のページタイムラインとして表示する。

```text
[添付資料.pdf 展開中 12ページ]
  p1  p2  p3  p4  p5  p6  p7  p8  p9  p10 |ハサミ| p11 p12
```

展開後にできること:

- ページ単位の並べ替え
- 別ファイル位置へのページ移動
- ゴミ箱ツールによるページ除外
- ハサミツールによる分割線挿入
- ヘッダー/フッター/ページ番号/透かしの配置
- 対象ページ範囲の選択

展開されたページ編集の内容は、折りたたんでも保持する。

### 3.3 分割

分割はハサミアイコンをページ間へドラッグして行う。分割線は単一ファイル内ではなく、結合後の全体出力に対して効く。

例:

- 複数ファイルを並べる。
- 全体の10ページ目の後ろにハサミを置く。
- 下部バーに `出力予定 2ファイル` と表示する。
- `result_001.pdf`, `result_002.pdf` のように出力名を即時プレビューする。

### 3.4 ページ削除

削除はゴミ箱アイコンで行う。

- ページをゴミ箱へドラッグする。
- またはゴミ箱アイコンをページへドラッグして重ねる。
- 削除は物理削除ではなく、出力対象外の状態として扱う。
- 対象ページはグレーアウトし、復帰できる。
- Undo/Redoで戻せる。

### 3.5 装飾

ヘッダー、フッター、ページ番号、透かしは、ページ上へ直接配置する。

配置後、対象要素の近くに小さな浮動設定パネルを出す。常設の大型設定画面は使わない。

設定項目:

- 対象: 全ページ / 選択ページ / この出力のみ
- 文字列
- ページ番号形式
- 位置
- サイズ
- 濃度
- 削除

## 4. Officeファイルと一時PDFキャッシュ

Officeファイルは、最終的にはPDF化しないとPDF編集や書き出しへ正確に反映できない。ただし、ユーザーを待たせないため、追加直後からできる操作は即時可能にする。

### 4.1 動作

1. Excel / Word / PowerPoint / PDF を追加する。
2. すべてファイルカードとして即座に表示する。
3. Officeファイルは `PDF化待機` または `PDF化中 xx%` を表示する。
4. バックグラウンドでセッション一時PDF化する。
5. PDF化完了後、`PDF準備完了` とページ数を表示する。
6. 準備完了ファイルはPDFと同じページ編集が可能になる。

キャッシュ中でも可能な操作:

- ファイルカードの並べ替え
- 結合順の変更
- 出力対象への参加
- 出力対象から除外
- 書き出し予約

キャッシュ完了後に可能な操作:

- ページ展開
- ページサムネイル表示
- ページ単位の並べ替え
- ハサミによる分割
- ゴミ箱によるページ除外
- ヘッダー/フッター/ページ番号/透かしの正確なプレビュー
- 検索置換の対象確認

### 4.2 キャッシュポリシー

一時PDFキャッシュは1回の作業セッション内だけで利用する。

- アプリ終了時に破棄する。
- 作業リセット時に破棄する。
- 元ファイル更新時に破棄して再作成する。
- 変換設定変更時に破棄して再作成する。
- 永続保存や次回起動時の再利用はしない。

安定性優先で、Office変換は原則1件ずつ実行する。未完了ファイルを展開しようとした場合、そのファイルの変換優先度を上げる。

状態:

- `queued`: PDF化待機
- `converting`: PDF化中
- `ready`: PDF準備完了
- `error`: 変換エラー
- `stale`: 元ファイル更新または設定変更により再変換が必要

## 4.3 実変換方式

Office変換は Microsoft Office COM のみを正式対応とする。LibreOffice headless は使用しない。

理由:

- Word/Excel/PowerPoint の実レイアウト再現性を優先する。
- 旧Pythonサービスに `pywin32` + COM の実装がすでに存在する。
- ユーザーはOffice依存を許容している。
- 変換品質の差異を複数エンジンで吸収するより、まず高品質なWindows/Office前提へ絞る。

COM変換が失敗した場合は、対象ファイル、Officeアプリ名、例外メッセージをログへ出し、ジョブ全体は復旧可能なエラーとして扱う。自動的にLibreOfficeへfallbackしない。

## 5. 出力とジョブ表示

下部には出力プレビューとジョブバーを常時表示する。

表示内容:

- 出力予定ファイル数
- 出力ファイル名
- 暗号化状態
- 有効ページ数
- 現在ステップ
- 進捗
- キャンセル
- ログボタン

書き出しは、作業台の状態を一括ジョブとして処理する。

処理順:

1. Office変換
2. PDF解析
3. 結合
4. ページ編集反映
5. 分割
6. ヘッダー/フッター/ページ番号/透かし
7. 検索置換
8. 暗号化
9. 保存

詳細ログは通常画面に出さず、ログボタンで開く下部ドロワーに表示する。

ログドロワー:

- タイムスタンプ
- INFO / WARN / ERROR
- ジョブステップ
- ユーザー向けメッセージ
- 詳細ログコピー

## 6. 既存機能の継続

現行システムから継続する機能:

| 区分 | 機能 |
| --- | --- |
| 入出力 | 複数ファイル追加、並び替え、削除、出力先指定 |
| 変換 | Word / Excel / PowerPoint / PDF のPDF化 |
| 結合 | 複数PDFの結合 |
| 分割 | ハサミ分割、サイズ上限分割 |
| ページ編集 | ページ並び替え、ページ除外、ファイルまたぎ移動 |
| 装飾 | ヘッダー、フッター、ページ番号、透かし |
| テキスト | 文字検索、置換 |
| セキュリティ | 入力PDFのパスワード解除、出力PDFの暗号化 |
| 情報 | ページ数、暗号化状態、メタデータ |
| ログ | ローカル利用ログ、詳細処理ログ、必要に応じた分析イベント |

オンラインログ連携は通常画面に出さず、将来の設定画面または管理者向け機能として扱う。

## 7. 実装方針

推奨構成:

- Frontend: React + TypeScript + Vite
- Desktop shell: Tauri v2
- Icons: lucide-react
- State: Zustand
- PDF preview: PDF.js または同等の実績あるPDFレンダラー
- Drag and drop: HTML D&D + pointer補助レイヤー
- Backend bridge: Tauri command
- PDF/Office処理: active Python workerを明示境界として隔離し、Tauri command `run_processing_engine` から呼ぶ
- 初期PDF処理: 旧Pythonサービスの処理ロジックを新しい `src-python/pdf_workbench_engine/` へ移植し、worker/CLI境界で利用する
- Office変換: Microsoft Office COM のみ
- Long running task: Tauri側でジョブ管理し、進捗とログをイベントでfrontendへ送る

新環境では、旧Flet UIと旧Pythonアプリ本体をルートに戻さない。既存処理を使う場合は、`archive/` を直接参照せず、レビュー済みの処理をactiveなPython workerへ移植する。実処理エンジンの詳細な構成と移植ルールは `docs/processing_engine_plan.md` に従う。

検索置換はPDF内部テキストを完全に再構成する方式ではなく、検索位置を検出し、該当領域を塗りつぶして置換文字を上書きする方式とする。この方針により、既存PDFの構造破壊を避けつつ、ユーザーが期待する見た目の置換を優先する。

## 8. 実装ステップ

1. 旧システムを `archive/legacy_flet_system_20260510/` へ隔離する。
2. Tauri + React + TypeScript の新規プロジェクト骨格を作る。
3. 上部アプリバー、ツールバー、中央ワークスペース、下部ジョブバーを実装する。
4. ファイルカードモデルを実装する。
5. Office一時PDFキャッシュ状態とジョブキューを実装する。
6. ファイルカードのドラッグ並べ替えを実装する。
7. ファイル展開とページサムネイル表示を実装する。
8. ハサミ、ゴミ箱、ページ移動を実装する。
9. ヘッダー、フッター、ページ番号、透かしの直接配置を実装する。
10. 検索置換、鍵、情報ツールを実装する。
11. 下部出力プレビューと一括書き出しジョブを実装する。
12. ログドロワー、エラー復旧、再試行を実装する。
13. 1366x768と1920x1080で視認性、操作密度、重なり、ドラッグ挙動を検証する。
14. 実PDF/Office処理エンジンを接続し、E2Eテストを作る。初期接続は完了。残りはOffice COM実機検証、進捗ストリーミング、キャンセル、配布同梱。

## 9. 完成予想図

生成済みの完成イメージは `docs/assets/ui_mockups/` に保存する。

- `docs/assets/ui_mockups/00-overall-workbench.png`
- `docs/assets/ui_mockups/01-file-arrangement-and-office-cache.png`
- `docs/assets/ui_mockups/02-expanded-page-editing-split-delete.png`
- `docs/assets/ui_mockups/03-direct-decoration-placement.png`
- `docs/assets/ui_mockups/04-batch-export-log-drawer.png`

今回の実装後スクリーンショット:

- `docs/reports/screenshots/2026-05-11-workbench-complete-1366x768.png`
- `docs/reports/screenshots/2026-05-11-workbench-complete-1920x1080.png`

## 10. 2026-05-12 操作性補強の反映

今回のUI方針補強:

- Explorer からのファイル投入は、Tauri 実行時に webview drag/drop event を正規経路として扱う。HTML5 の `dataTransfer.files` はブラウザ検証用の補助経路とする。
- ファイル追加は複数選択を標準とする。複数PDF/Officeを一括追加し、中央ワークスペース上で結合順を組み立てる。
- 浮動設定パネルは常設しない。装飾、検索、鍵、情報の各パネルは右上の閉じる操作で隠せ、必要時だけ小さな「設定」ボタンから再表示する。
- ファイル単位カードは横幅を広げすぎず、サムネイル紙面を大きくして内容確認性を上げる。1366x768で横に複数カードが並ぶ密度は維持する。
- 書き出しは直接実行せず、出力プレビューを経由できる。プレビューでは出力ファイル数、ページ数、分割、除外、装飾、暗号化状態、出力ごとのページ並びを確認する。

今回の実装後スクリーンショット:

- `docs/reports/screenshots/2026-05-12-empty-workbench-1366x768.png`
- `docs/reports/screenshots/2026-05-12-file-card-thumbnail-density-1366x768.png`
- `docs/reports/screenshots/2026-05-12-export-preview-modal-1366x768.png`
- `docs/reports/screenshots/2026-05-12-floating-panel-hidden-1366x768.png`
- `docs/reports/screenshots/2026-05-12-layout-fix-1366x768.png`

## 12. 2026-05-12 レイアウト構造化と直接書き出し

今回のUI方針変更:

- ページタイムラインの固定背景帯 `出力 1` / `出力 2` は削除する。分割はハサミマーカーを唯一の視覚的な区切りとして扱い、出力ファイル数は下部バーとプレビューで確認する。
- ファイルカードとページカードは、px単位の見た目合わせではなく、カード内 grid とタイムラインコンテナで内包する。読み込み中、PDF化中、ページラベル、装飾ボタンが親セクション外へ出ないことを優先する。
- 上部バーには `プレビュー` と `書き出し` を両方置く。`プレビュー` は確認用、`書き出し` は直接実行とする。出力先未設定時のみ出力先選択を挟む。
- 書き出しアイコンはアップロード系ではなく、ローカルファイル生成を示す `FileOutput` を使う。
- 並び替えツールは手のアイコンにし、ファイル/ページを掴んで動かす意味を明確にする。
- ヘッダー、フッター、ページ番号、透かしはページ単位だけでなく、ファイルカードからファイル単位で追加できる。装飾ターゲットには `file` スコープを持たせる。

検証スクリーンショット:

- `docs/reports/screenshots/2026-05-12-layout-actions-1366x768.png`
- `docs/reports/screenshots/2026-05-12-layout-actions-1366x768.png`

## 13. 2026-05-12 装飾操作と表示密度の再整理

今回のUI方針を次の通り更新する。

- ファイルカード下のヘッダー/フッター/ページ番号/透かしの個別アイコン列は廃止する。
- 装飾はツールバーで `ヘッダー` / `フッター` / `透かし` を選び、ファイルカードクリックでファイル内全ページへ一括適用、ページクリックでそのページへ適用する。
- 同じツール、同じ配置、同じ文字、同じ色が対象にすでに適用されている場合は、クリックで解除する。
- ファイル内の全ページへ装飾が適用されている場合は、ファイルカードに `H` / `F` / `W` の適用マークを表示する。一部だけの場合は部分適用マークとする。
- ページ番号は独立ツールではなく、ヘッダー/フッターの文字列に `{page}` / `{total}` を挿入して扱う。
- ヘッダー/フッターは左/中央/右の複数配置を個別に保持できる。
- 透かしは中央固定、斜め表示、文字長とページサイズに応じた自動サイズとする。
- 透かし色は薄い赤、グレー、任意色から選択する。濃度スライダーは廃止する。
- 装飾設定パネルはページ選択ではなく、選択中の編集ツールに応じて表示内容を切り替える。
- ページ単位の `除外` ラベル表示は廃止し、除外ページはグレー表示だけで示す。
- ファイル単位の `除外` ボタンは確認後にワークスペースから対象ファイルを取り除く。元ファイルは削除しない。
- `PDF準備完了` と `待機中` の常時表示は廃止する。未処理状態の詳細はログへ寄せ、カード上は必要な変換中/エラーだけを表示する。
- ファイルごとの変換進捗バーは廃止し、下部バーで全体の変換進捗を示す。
- 明示的な検証用フィクスチャとして、ブラウザ実行時のみ `?fixture=workbench` でサンプルワークスペースを読み込める。通常起動は空のワークスペースを維持する。

検証スクリーンショット:

- `docs/reports/screenshots/2026-05-12-decoration-batch-toggle-1366x768.png`
- `docs/reports/screenshots/2026-05-12-decoration-tool-panel-1366x768.png`

## 14. 2026-05-12 装飾スロット表示と出力ファイル指定

今回のUI方針更新:

- ファイルカード下部の `H` / `F` / `W` 装飾バッジは廃止する。装飾状態はファイル/ページのサムネイル上に直接表示する。
- ヘッダー/フッターは左・中央・右の3スロットとして表示し、複数箇所を設定しても文字が重ならないようにする。同一スロットに複数設定がある場合は主テキストと `+n` の集約表示にする。
- ヘッダー/フッター/ページ番号はページサムネイルとファイルカードの代表サムネイルの両方で同じ表示部品を使う。
- 装飾の解除は、ツールバーで対象ツールを選び、設定パネルでスロットを選んだ状態で同じファイル/ページを再クリックするトグル操作を基本とする。
- 展開ボタンは利用頻度が高いため、ファイルカード内で青系の強調ボタンとして維持する。
- ファイルカードはHD解像度で上下がはみ出さないことを優先し、代表サムネイルを旧UIより大きくしつつ、変換中ステータスはサムネイル右側に収める。
- 出力先はフォルダではなくPDFファイルパスとして指定する。分割で複数ファイルになる場合は、指定ファイル名のstemへ `_001`, `_002` を付与する。
- workerの中間PDFはランダム接頭辞付きの一時ファイルとして扱い、成功/失敗に関わらず処理後に削除する。出力先へ残すのは最終PDFのみとする。
- PyMuPDFの装飾/検索置換テキストは `japan` フォントを使い、日本語ヘッダー・フッター・透かしがPDFへ描画されるようにする。

検証スクリーンショット:

- `docs/reports/screenshots/2026-05-12-decoration-slots-output-file-1366x768.png`

## 15. 2026-05-12 書き出しプレビューと装飾解除UX

追加方針:

- 書き出しプレビューは、ヘッダー情報を最小限にし、中央の縦向きページ表示へ高さを優先配分する。
- プレビュー下部には横スクロール可能なフィルムストリップを常設し、現在ページは青枠だけでハイライトする。チェックマークは使わない。
- 除外ページはプレビュー対象から完全に外す。分割位置はサムネイル列のハサミ区切りと出力ファイル名チップで示す。
- プレビューは左右ボタンとキーボード左右キーで移動でき、現在ページのサムネイルは自動的に中央へ寄せる。
- ファイルカードの代表サムネイルは、対象ファイルの全出力ページへ同じヘッダー/フッター/透かしが適用されている場合だけスロット表示を出す。
- ファイル単位で一括適用した装飾に対してページをクリックした場合、ページ個別装飾を重複追加せず、そのページだけ一括適用から除外/復帰する。
- 書き出し完了後は、下部バーに「出力ファイルを開く」と「フォルダで表示」を出す。

検証スクリーンショット:

- `docs/reports/screenshots/2026-05-12-preview-modal-redesign-1280x720.png`

## 11. 2026-05-12 権限とレイアウト修正

今回の補正:

- Tauri の frontend event listen 権限として `core:event:default` を必須にする。これにより Explorer D&D の webview event と、書き出しworkerの進捗イベント購読を許可する。
- ツールバー先頭の「選択」は、実際の主機能に合わせて「並び替え」と表示する。
- ファイルカードはサムネイルを大きくしても下端がファイル順序セクションからはみ出さない高さ配分にする。
- ページタイムラインは先頭ページが左境界に寄りすぎないよう、出力バンドとページカードの左右余白を揃える。

今回の実装後スクリーンショット:

- `docs/reports/screenshots/2026-05-12-layout-fix-1366x768.png`

## 2026-05-13 Preview quality and output numbering update

- The export preview uses high-resolution `previewPath` images for the large page view and keeps compact `thumbnailPath` images for small thumbnails.
- The preview filmstrip is a contained grid row, so thumbnail cards must fit structurally inside the modal and not rely on manual pixel nudging.
- The preview info icon toggles an explanatory popover.
- Header/footer/page-number tokens `{page}` and `{total}` represent the post-merge output PDF order, including split output groups.
- UI decoration previews and PDF decoration output prefer gothic/sans Japanese-compatible fonts: `BIZ UDPGothic`, `Yu Gothic`, `Yu Gothic UI`, then existing fallbacks.

## 2026-05-13 Startup Splash B

The startup experience uses the selected B direction: a compact premium desk/workbench splash window with PDF pages, a stamp, scissors, lock, completion check, and a calm blue/green paid-software palette.

Behavior:

- The release app creates a lightweight `splashscreen` window first and keeps the main `main` window hidden.
- The splash uses bundled static assets under `public/`, so production startup does not wait for the React workbench to paint before showing a branded loading surface.
- The React workbench calls the Tauri `complete_startup` command after initial session-cache setup settles.
- `complete_startup` shows and focuses the main window, then closes the splash window.
- The bottom of the splash displays the Japanese license label `ライセンス: koki kurokawa` and the current visible version.
- The lowest row displays a small spinner and a single subtle rotating status line.
- Production Windows builds suppress the console subsystem so users see the app window flow instead of a terminal.

Current limits:

- The splash status text is a lightweight local rotation, not live backend phase telemetry.
- `npm run tauri dev` still depends on the Vite dev server startup; the intended no-terminal/no-blank behavior is for release binaries.

Reference screenshot:

- `docs/reports/screenshots/2026-05-13-startup-splash-b.png`

## 2026-05-13 Startup Splash A Picture Adoption

The selected startup picture is now the earlier A direction: a restrained premium glass-desk PDF workbench image. The app uses a cropped PNG asset that keeps the document workspace, paper stack, glass surface, and editing-tool feel while reducing the visual prominence of the lock motif from the generated comparison board.

Behavior remains unchanged:

- The `splashscreen` window appears first.
- The hidden `main` window is shown after frontend initialization completes.
- License, version, spinner, and lightweight rotating startup status remain in the lower rows.

Reference screenshot:

- `docs/reports/screenshots/2026-05-13-startup-splash-a-picture.png`

## 2026-05-15 Export Destination and Preview Accuracy Update

- The top-bar output-file preset button is removed. Export destination is selected at the moment of export every time.
- Planned output names are generated from the first non-excluded input file in merge order. The default suffix is `_PDF化.pdf`; split outputs append `_001`, `_002`, and later numbers to the same stem.
- If all files are excluded and a new active first file is added, the bottom output plan must immediately update to that new file's derived name.
- Office conversion must run as a background worker job and keep the UI operable. The UI should show staged progress rather than blocking the workbench during Microsoft Office COM conversion.
- Installed Windows builds must suppress child-process console windows for Python and worker executable launches.
- The export preview must not show wrapper whitespace that is not part of the actual rendered page. It should size the page frame from already-rendered preview image dimensions, avoiding slow pre-preview export rendering.

## 2026-05-15 File Strip Scrolling and Primary Button UX Update

- Primary blue export actions must stay visually primary on hover. Hover should deepen the blue, raise the button slightly, and strengthen the shadow instead of turning the button white.
- File cards in the file-order area should be a single horizontal strip. Large file sets scroll horizontally rather than wrapping into hidden lower rows.
- During file-card pointer drag reorder, dragging near the left or right edge of the strip should auto-scroll the strip and keep recalculating the drop target so users can move files across long workspaces without releasing the drag.

## 2026-05-13 Office COM, Alpha License, and Layout Hardening

今回のUI/起動/Office方針更新:

- ファイル順序セクションのカード枠は、ページタイムラインと同じく右端まで視覚的に広げる。カードが少ない場合も右側に未使用の白い余白を残さず、淡いトレイ背景としてワークスペース全体を使う。
- `D&D対応` の補助チップは廃止する。ドラッグ操作はカードの掴める見た目、ゴースト表示、挿入ガイドで伝える。
- ファイル読込み中/Office変換中のカードは、サムネイル、変換ステータス、ファイル名、メタ情報、操作ボタンをgrid内に固定し、ステータスバッジやエラー文がカード外へはみ出さないようにする。
- ログドロワーは長いWindowsパスを必ず折り返す。パスやセッションIDが長くても、ログ枠外へ横にはみ出さない。
- Office変換はactiveなPython workerのMicrosoft Office COM経路を本接続する。Word/Excel/PowerPointはセッション一時PDFへ変換し、そのPDFをPDFファイルと同じ検査、サムネイル、ページ編集、書き出し経路へ渡す。
- Office変換結果は `outputPath` / `cachePath` の両方で返し、フロントエンドはどちらのworker応答形式でもPDFパスを取得できるようにする。
- 起動ミニウィンドウの採用A画像は、前回より少し引きで切り出す。ただし画像領域に余白が出ないよう `object-fit: cover` を維持する。
- アルファ版配布制限として、起動時に簡易日時確認を行う。2026-06-30 まで有効、2026-07-01 00:00:00 JST 以降はメインワークベンチを表示せず期限切れ画面を出す。

検証スクリーンショット:

- `docs/reports/screenshots/2026-05-13-office-ui-layout-1366x768.png`
- `docs/reports/screenshots/2026-05-13-startup-splash-a-picture.png`

## 2026-05-15 Batch Selection, Removal Confirmation, and Search Removal

- File cards and page thumbnails support modifier-based batch targeting. `Ctrl`/`Cmd` toggles selection and `Shift` selects a contiguous range. Tool changes clear file/page selections so a previous batch target cannot accidentally affect a different tool.
- Reorder, scissors, trash/page exclusion, and header/footer/watermark application use the current selected batch when the clicked or dragged target is part of that selection. Otherwise the operation applies only to the direct target.
- File-level trash and file-card `除外` use the same guarded removal flow. The app shows an in-app confirmation dialog; Enter/Esc and arrow-key selection work, but the UI does not display keyboard-operation help text.
- Search/replace is retired from the active UI, frontend state, export snapshot, and Python export pipeline. Future text workflows should be reintroduced only if they have a clear UX and engine contract.
- Copy-protected PDFs that can be opened with an empty user password should proceed through inspection, thumbnail rendering, and export without requiring an input password. Password-required PDFs still surface the password-required error path.

## 2026-05-16 Split Output Naming and Bottom Bar Hardening

- The bottom output file chips include an edit icon. Opening it shows a compact output-name editor for the current split output groups.
- The same output-name editor is also available from the top-right app bar as `出力名`, so users can reopen the split-output naming modal even when the bottom chips are not the active focus.
- The output-name editor owns both file names and the save destination folder. When these settings are applied, export uses them directly and does not show the previous file-name save dialog or an additional folder picker at export time.
- Reset in the output-name editor requires confirmation and restores automatic names/destination handling. If the workspace becomes blank because all file cards are removed, the custom output settings reset automatically.
- Export worker requests may pass `outputDir` plus `outputNames[]`; the Python worker validates the count, duplicate names, and Windows-invalid characters before writing final PDFs.
- The bottom job-status area must keep `書き出し完了`, the progress bar, and `開く` / `フォルダ` / `ログ` buttons on one line at 1366x768.
- The log drawer uses an opaque foreground layer with explicit stacking above page decoration labels, while remaining above the bottom bar rather than overlapping it.

## 2026-05-16 Status Pill and Header/Footer Fit Update

- The top-right job status pill uses a fixed width so the app bar does not jump while export state changes. The visible label is a short stable status such as `待機中`, `処理中`, `完了`, `エラー`, or `中止`; the full status detail remains available through the title/accessible label.
- Header, footer, and page-number preview labels use compact per-slot chips rather than wide fixed fields. Short text should not reserve excessive blank space, and long text must shrink/clip within the left, center, or right slot instead of overflowing into neighboring content.
- Header/footer/page-number PDF output uses a Word-like natural style: small unified black text, no visible chip/background, and left/center/right text boxes in the top/bottom margin bands.
- If the requested header/footer/page-number text cannot fit in the fixed-size slot, the PDF worker abbreviates it with `...` rather than changing font size per file or silently dropping the text.
- The settings surface stays simple: users still choose decoration type, placement, and text. Header/footer collision handling is handled by margin-band placement, slot sizing, and fit-to-width abbreviation rather than adding detailed layout controls.

## 2026-05-16 Natural Header/Footer Standard

- Header, footer, and page-number output ignores per-decoration color/size differences and normalizes to 8.5pt black text. This avoids a visibly inconsistent batch when source files or past settings differ.
- The preview follows the same direction: black text, transparent background, no bordered chip. The text remains clipped within its slot for density, but the visual treatment should resemble common Word headers/footers rather than app badges.
- Watermark styling remains separate and can still use color and larger display treatment.

## 2026-05-16 Exact Completed-State Preview

- The export preview in the Tauri runtime now uses a PDF-coordinate decoration manifest as the first-class preview contract. The Python worker resolves the same output page, split-output numbering, page geometry, text fitting, font family, and decoration positions used by export, but returns only lightweight layout data first.
- Editing remains the priority path. Header/footer/watermark edits update the workbench state immediately and do not invoke the Python worker or block the central editing screen.
- The preview modal must never wait for full preview-PDF generation during arrow-key or button page navigation. It displays the existing page preview image and places an SVG decoration layer from the manifest as soon as the lightweight manifest arrives.
- Page navigation state must update before any refinement work. The current page label, selected filmstrip item, and large page frame change immediately; high-resolution image decode, manifest fetch, transparent PNG generation, and filmstrip auto-scroll are never allowed to block the current-page switch.
- The large preview first uses the already available thumbnail when needed, then swaps to the high-resolution preview image after it has been preloaded. This keeps arrow-key and button navigation visually immediate even on large files.
- A transparent PyMuPDF-rendered PNG decoration layer is generated only as an asynchronous refinement for the current and neighboring pages. When it arrives, it replaces the SVG layer without shifting the page, controls, or filmstrip.
- User-visible waiting in the preview modal is limited to source preparation states such as Office/PDF conversion. Decoration overlay generation must not show a blocking `作成中` overlay over the page.
- The obsolete completed-page preview PNG path is removed. Preview refinement now stores only the decoration manifest and transparent decoration PNG in the session preview cache.
- Browser fixture mode remains usable for modal layout checks. Exact manifest/transparent-PNG decoration preview requires the Tauri worker runtime because the browser fixture cannot call the Python worker.
- Decoration overlay cache keys are based on workspace state, output page, source file size/mtime, and render zoom inside the session preview cache. Reopening the same completed-state preview should reuse the cached manifest/transparent PNG instead of rebuilding the scratch page.
- The large preview page must be fit-to-canvas, not fit-to-viewport. The modal measures the actual preview canvas and scales every page ratio so the full page is visible for portrait, landscape, small, and unusual page sizes.
- The large preview page frame must receive explicit measured width and height. Preview images and decoration overlays may be absolutely positioned inside that frame, but they must not be responsible for creating the frame size.
- If the high-resolution page preview image cannot be loaded, the modal falls back to the already-visible filmstrip thumbnail rather than leaving the large preview blank.
- Header/footer settings appear as soon as the header/footer tool is selected. Users edit the text and position first, then click a file or page to apply the current setting.
- Re-clicking the same header/footer/page-number/watermark tool must also reopen the compact settings panel if the user had hidden it. Tool activation is an event, not only a change of active tool value.
- A single page cannot keep multiple header/footer/page-number values in the same visual slot. Applying a different value to the same page and slot replaces the previous effective value, including values inherited from all-page or file-level decorations.

## 2026-05-16 Preview Navigation Queue Update

- Arrow-key and button page movement is the highest-priority preview path. It updates the current page index, large lightweight page image, page label, and active filmstrip item without starting Python worker jobs or high-resolution image decoding on every key event.
- Decoration manifest and transparent PNG refinement starts only after the user stops on a page for a short settle delay. If the user keeps moving, the pending refinement is skipped and no new worker process is launched for those intermediate pages.
- Preview refinement runs with current-page priority and a single sequential queue. Adjacent page prefetch begins only after the current page refinement has had a chance to complete and after a short idle delay.
- High-resolution preview image loading follows the same rule: current page first after navigation settles, adjacent pages later. During rapid movement, the existing thumbnail remains the immediate display source.
- Transparent decoration PNG generation can now consume an already-resolved PDF-coordinate manifest. This avoids rebuilding a scratch one-page PDF and recomputing the manifest when only the PyMuPDF transparent overlay is needed.
- Filmstrip thumbnail items are memoized so changing the active page does not force every thumbnail and decoration layer to do full work again.

## 2026-05-16 Panel, Thumbnail, Confirmation, and Encryption UX

- Header/footer/page-number panels must preserve the text input focus when users click position buttons or page-token buttons. Token insertion uses the current caret or selected range, then returns the caret after the inserted token so users can keep typing without a second click.
- File-level thumbnails show decoration state in the same left, center, and right slots used by the page preview. Header and footer each have at most three visible slots, so every configured value is shown directly instead of collapsing into a small `+1` count.
- File-card page-order badges are separated from the preview paper itself. Decoration labels inside the paper must not inherit the order-badge absolute positioning or overlap each other.
- Page exclusion and restore actions go through the same confirmation dialog whether triggered from a page card, selected page batch, or trash drop. The confirmation dialog supports arrow-key selection between cancel and confirm, Enter to execute the selected action, and Escape to close.
- Encryption settings distinguish the password required to open the exported PDF from the password used only to unlock protected input PDFs. The export-password input is disabled while output encryption is off, so the panel communicates the current effect without extra explanation screens.

## 2026-05-16 Thumbnail Density and Decoration Placeholder Cleanup

- Page thumbnails must not render default header/footer placeholder boxes. Only actual applied decorations are drawn, preventing the real header/footer text from overlapping a built-in sample label.
- File cards should spend more of their occupied area on the source thumbnail. Cache/progress badges are overlays instead of reserving a permanent right-side column, and the thumbnail uses a larger contained paper frame.
- File-card internal row heights must fit within the card height at compact desktop sizes. Increasing thumbnail size must not clip the remove/expand buttons.
- Section subtitles such as file count and page-editing state sit beside the main section title instead of below it, returning vertical space to the file strip and page timeline.

## 2026-05-16 Fixed File Card Density Increase

- File-order cards keep a fixed strip/card layout. Page-timeline grids must not become viewport-dependent variable grids for this pass.
- File-card readability takes priority over extreme compression: file names remain 13px, metadata remains 11px, and action buttons remain large enough for repeated desktop use.
- File-card metadata is consolidated into one readable line containing extension, page count, and file size. The recovered row space is allocated to the thumbnail frame rather than shrinking text.
- The fixed card thumbnail frame is increased to `116 x 136` in the standard desktop layout. The card still fits within the fixed file strip, and remove/expand buttons must remain fully visible.
- The file strip tray needs visible top and bottom breathing room. The standard desktop layout uses balanced `6px` top and bottom tray padding, with the thumbnail frame adjusted to `108 x 122` so the card remains fully inside the tray without shrinking text.

## 2026-05-16 PyMuPDF Diagnostic Output Hardening

- Python worker stdout is a JSON-only protocol. Recoverable library diagnostics must not be printed to stdout before the JSON response.
- PyMuPDF/MuPDF can emit recoverable structure-tree diagnostics such as malformed PDF structure warnings while still opening and rendering the file correctly.
- The active PDF document service suppresses PyMuPDF's direct MuPDF error/warning display at import time. Worker exceptions are still returned through the normal JSON error envelope.
- This hardening is especially important for thumbnail rendering because Rust parses the entire worker stdout as one JSON payload.

## 2026-05-17 Input and Export Robustness Contract

- File selection is a preflight boundary, not only a UI list operation. Tauri validates path existence, file-ness, size, readable header bytes, cloud-placeholder attributes, temporary Office/download names, supported extensions, and PDF/Office file signatures before cards are added.
- Rejected inputs remain outside the workspace and are logged with a recoverable reason. The workbench should not create a card for a file that is known to be unreadable or structurally mismatched at selection time.
- Export destination selection is also a preflight boundary. The app checks output folder creation/writability, locked existing outputs, duplicate split names, Windows-invalid characters, reserved device names, and file/folder conflicts before starting Office conversion or PDF assembly.
- Custom split-output names own both destination folder and filenames. When those settings are applied, export uses that destination directly and runs preflight without showing another save dialog.
- Worker stdout must stay machine-readable. If a dependency still prints recoverable diagnostics before JSON, Rust may salvage the first JSON payload, but a true parse failure is reported as `worker_protocol_error` with bounded stdout/stderr prefixes.
- Python worker stages must return classified errors for input inspection, PDF open/render, Office conversion output validation, destination preparation, final save, and atomic replacement. Generic worker crashes should be the last resort.
- Final user files should be touched only after scratch output is successfully produced. Existing destination files are replaced through a temporary same-directory file and `os.replace`, so partial worker failures do not overwrite a valid prior PDF.

## 2026-05-17 Predeployment Hardening Update

- Background Office/PDF preparation is a single-worker queue. A prioritized file may move to the front, but it must not start a second conversion/inspection/thumbnail worker while another file preparation is active.
- Export cancellation covers the preparation phase as well as the final export worker. Office conversion, PDF inspection, and thumbnail rendering all run through cancellable streaming job IDs when the app is in the Tauri runtime.
- Cancelling preparation leaves the file in a retryable queued state instead of marking the source as a hard processing error.
- Session cache remains temporary. `prepare_cache_session` removes stale `session-*` directories that are at least 24 hours old before creating the new session, while current/young sessions are left untouched.
- Release publishing should use the staged current-version folder from `npm run stage:release` instead of uploading directly from Tauri bundle directories that may contain old installer versions.

## 2026-05-17 ToolHub Registration Boundary

- ToolHub registration is handled by a thin Python launcher source root under `toolhub/pdf_workbench/`.
- The launcher starts the staged Tauri release payload from `assets/payload/`; it does not reimplement the workbench UI or PDF processing in Python.
- The ToolHub launcher intentionally resolves only `pdf-workbench.exe` from the staged payload and does not fall back to development release paths.
- App Studio shared-env startup probes run the same payload smoke path instead of opening the real GUI. ToolHub runtime launches still open the main Tauri window.
- The production architecture remains Tauri/React for UI, Rust/Tauri for orchestration and cache/session commands, and `src-python/pdf_workbench_engine/` for worker jobs.
- `pdf-workbench.exe --toolhub-smoke` is the non-GUI registration smoke check. It validates the bundled Python runtime, active worker package, and worker `ping` command without opening the workbench.
- ToolHub staging output belongs under `build/toolhub-registration/` and must not be committed as active source.

## 2026-05-22 Removal Confirmation and Export Completion Feedback

- File-card removal continues to use the guarded confirmation dialog before files are removed from the workspace.
- Page trash actions no longer show a confirmation dialog. Clicking or dropping the trash tool on a page, including a selected page batch, immediately toggles the page's output-excluded state. This remains recoverable because pages are marked excluded/restored rather than physically deleted.
- Completed export jobs show a compact in-app popup stating that output has completed, with the produced output name summary. The bottom output bar remains the place for open/reveal/log actions.

## 2026-05-22 Large PDF Performance Contract

- Adding many PDF files must not eagerly generate every high-resolution preview image. Initial PDF preparation only inspects the source, records page count/metadata, and creates page records required for output planning.
- UI thumbnails are generated only when a ready file is expanded. Unexpanded file cards may use the document icon placeholder until their page thumbnails are requested.
- The expanded page timeline must virtualize page cards. Large documents should keep only the visible page-card window plus a small overscan mounted in the DOM.
- Output planning and page-number decoration maps must avoid allocating full cloned page groups on every render. Counting passes are acceptable; repeated full page object copies are not.
- Export must not wait for UI-only thumbnail generation. Export requires source/cache paths and page records, not rendered thumbnail images.
- Final save should move the completed same-directory scratch PDF into place with atomic replace instead of reading and writing the entire PDF a second time.
- Undo history should stay bounded so repeated operations on large page sets do not retain unbounded full-workspace snapshots.
- The development-only `?fixture=hundred-files` route is allowed for repeatable 100-file responsiveness checks. It must not load automatically in production startup.
- High-volume header/footer/page-number export must avoid embedding external font files once per page. ASCII decoration text should use a PDF built-in Latin font, and Japanese/non-ASCII decoration text should use the worker's built-in CJK path with a coordinate fallback when textbox layout rejects a compact header/footer slot.

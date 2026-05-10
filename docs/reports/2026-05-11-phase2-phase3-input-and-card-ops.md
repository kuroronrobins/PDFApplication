# Phase 2-3 Implementation Report

作成日: 2026-05-11

## Scope

Phase 2 のファイル入力と Phase 3 のファイルカード操作を実装した。対象は Tauri/React ワークベンチの入力、状態管理、ログ、ファイル単位の並べ替えであり、PDF ページ解析や Office 実変換は次フェーズに残す。

## Changed Files

- `.gitignore`
- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/types.ts`
- `src/features/workbench/sampleData.ts`
- `src/features/workbench/fileInput.ts`
- `src/features/workbench/store.ts`
- `src-tauri/src/lib.rs`
- `docs/implementation_roadmap.md`
- `docs/reports/workbench-snapshot.html`
- `docs/reports/screenshots/2026-05-11-workbench-phase3-1366x768.png`
- `docs/reports/screenshots/2026-05-11-workbench-phase3-1920x1080.png`

## User-Visible Behavior

- `ファイル追加` から PDF/Excel/Word/PowerPoint を複数選択できる。
- Tauri 実行時は OS ダイアログを使い、ブラウザ検証時は hidden file input にフォールバックする。
- ワークベンチへファイルをドロップして追加できる。
- Rust command `describe_input_files` でファイル名、拡張子、サイズ、種別を返す。
- 未対応形式と重複追加はカード追加せず、ログへ記録する。
- PDF は `PDF追加済み`、Office は `PDF化待機` として追加される。
- ファイルカードはドラッグで順序変更でき、挿入位置ガイドが出る。
- ファイル単位で除外/復帰できる。
- Ctrl+Z / Ctrl+Y / Delete / Escape の基本操作を追加した。
- ログは下部バーの `ログ` ボタンから開閉する。

## Verification Commands

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run tauri build` | Passed |
| `npm audit --json` | Passed, vulnerabilities total 0 |

Notes:

- `npm run build` は esbuild の子プロセス起動が通常サンドボックスで `EPERM` になったため、承認済みの昇格実行で検証した。
- Chrome headless の screenshot も通常サンドボックスではアクセス拒否になったため、承認済みの昇格実行で検証した。
- `dist/index.html` は file URL 直開きだと module script 読み込みに向かないため、`docs/reports/workbench-snapshot.html` を UTF-8 指定で生成して検証した。

## Screenshots

- `docs/reports/screenshots/2026-05-11-workbench-phase3-1366x768.png`
- `docs/reports/screenshots/2026-05-11-workbench-phase3-1920x1080.png`

Visual check:

- 1366x768 で主要操作が一画面に収まる。
- 1920x1080 ではファイルカードとページタイムラインの情報密度が維持される。
- 日本語表示の文字化けは発生していない。
- ログドロワーは初期表示せず、下部ボタンから表示する構造になっている。

## Known Limitations

- Office 変換はまだ実変換ではなく、`queued` 表示まで。
- PDF の実ページ数解析と実サムネイル生成は未実装。
- 新規追加 PDF はページ未解析状態のため、ページ編集は次フェーズ以降で有効化する。
- OS ファイルドロップの実パス取得は Tauri 実行環境で追加確認が必要。
- ファイルカード D&D は HTML D&D ベース。ページ D&D とゴミ箱/ハサミのドラッグ重ね操作は未実装。

## Next Recommended Step

Phase 4 として、セッション限定の Office 一時 PDF キャッシュ基盤を実装する。まずは実変換エンジンを直接つなぐ前に、ジョブキュー、進捗、ログ、クリーンアップをダミージョブで UI に接続し、その後 LibreOffice などの実バックエンド検出へ進む。

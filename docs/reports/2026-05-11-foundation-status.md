# Milestone Report: Foundation Status

## Scope

Tauri + React + TypeScript の新環境を作成し、PDF Workbench の静的ワークベンチ UI を初期実装した状態を記録する。

## Roadmap Tasks

- P0-1: 画面検証方法の確立
- P0-2: 初回マイルストーンレポート作成
- P0-3: npm audit 精査
- P0-4: ビルド成果物の扱い整理

## Changed Files

- `package.json`
- `package-lock.json`
- `index.html`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.node.json`
- `src/App.tsx`
- `src/main.tsx`
- `src/styles.css`
- `src-tauri/`
- `src-tauri/icons/`
- `README.md`
- `AGENTS.md`
- `docs/`

## User-Visible Behavior

現時点では静的モックとして以下を表示できる。

- 左サイドバーなしの一画面ワークベンチ
- 上部アプリバー
- アイコン中心ツールバー
- 1ファイル1カードのファイル列
- Office ファイルの PDF 化状態
- 展開済み PDF のページタイムライン
- ハサミ分割マーカー
- ゴミ箱除外ページ
- ページ番号/透かし/ヘッダーのプレビュー
- 浮動設定パネル
- 下部の出力予定バーとログ導線

## Verification

前回実行済みの検証:

| Command | Result |
| --- | --- |
| `npm install` | pass |
| `npm run typecheck` | pass |
| `npm run build` | pass |
| `npm run tauri build` | pass |
| `npm audit --json` | pass: vulnerabilities 0 |

生成された Tauri 成果物:

- `src-tauri/target/release/pdf-workbench.exe`
- `src-tauri/target/release/bundle/msi/PDF Workbench_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/PDF Workbench_0.1.0_x64-setup.exe`

## Screenshots

取得済み。

- `docs/reports/screenshots/2026-05-11-workbench-shell-1366x768.png`
- `docs/reports/screenshots/2026-05-11-workbench-shell-1920x1080.png`

Vite の出力を相対パス化し、`docs/reports/workbench-snapshot.html` に CSS/JS をインライン化した検証用 HTML を生成した。これにより、dev server を常駐させず `file://` で Edge headless スクリーンショットを取得できる。

## Known Limitations

- ファイル選択は未実装。
- ドラッグ操作は未実装。
- Office 一時 PDF キャッシュは未実装。
- PDF 読み込み、サムネイル生成、PDF 書き出しは未実装。
- 検索置換、暗号化、情報表示は静的 UI 上の導線のみ。
- 実装はまだ静的 UI であり、ユーザー操作は状態に反映されない。
- 検証スクリーンショットは Edge headless による表示確認であり、Tauri ウィンドウそのもののスクリーンショットではない。

## Next Step

`docs/implementation_roadmap.md` の Phase 1 に進む。具体的には、`WorkbenchFile` / `PageItem` / `OutputPlan` の状態モデルを作り、現在の静的配列を Zustand store 駆動に置き換える。

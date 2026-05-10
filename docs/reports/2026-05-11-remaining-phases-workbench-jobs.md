# Milestone Report: Remaining Workbench Phases

## Scope

2026-05-11 に、残タスクとして残っていた Office一時PDFキャッシュ、ページ編集、分割、装飾、検索置換、暗号化、情報表示、一括書き出しジョブ、ログ、検証までを実施した。

実装範囲は UI、状態管理、Tauriコマンド境界、ジョブ進捗、ログ表示まで。実PDF/Office処理エンジンの本格接続は次工程として分離する。

## Roadmap Tasks

- Phase 4: Office一時PDFキャッシュ
- Phase 5: PDF読み込みとページ展開
- Phase 6: ページ編集
- Phase 7: ハサミ分割と出力計画
- Phase 8: 装飾ツール
- Phase 9: 検索置換、暗号化、情報
- Phase 10: 一括書き出し
- Phase 11: 品質、配布、運用の一回目検証

## Changed Files

- `AGENTS.md`
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `src/App.tsx`
- `src/styles.css`
- `src/features/workbench/backend.ts`
- `src/features/workbench/fileInput.ts`
- `src/features/workbench/outputPlan.ts`
- `src/features/workbench/sampleData.ts`
- `src/features/workbench/store.ts`
- `src/features/workbench/types.ts`
- `src-tauri/src/lib.rs`
- `docs/implementation_roadmap.md`
- `docs/tauri_ui_redesign_plan.md`
- `docs/reports/workbench-snapshot.html`

## User-Visible Behavior

- Officeファイルは追加直後からファイルカードとして表示され、順序変更、除外、出力対象化ができる。
- Officeカードには `PDF化待機` / `PDF化中` / `PDF準備完了` が表示される。
- 展開可能なファイルはページタイムラインへ展開できる。
- ページはドラッグで並べ替えできる。
- ハサミで分割ラインを置き、出力予定ファイル数を即時計算する。
- ゴミ箱でページを出力対象外にできる。
- ヘッダー、フッター、ページ番号、透かしをページへ直接配置できる。
- 装飾設定は常設サイドバーではなく、必要時だけ出る浮動パネルで編集する。
- 検索置換、暗号化、情報表示をツールバーから開ける。
- 書き出しは一括ジョブとして進捗、現在ステップ、キャンセル、ログに接続される。
- 下部ログドロワーで詳細ログを確認し、コピーできる。

## Verification

| Command / Check | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run tauri build` | Passed |
| `npm audit --json` | Passed, 0 vulnerabilities |
| Codex browser DOM check via `http://127.0.0.1:4177/workbench-snapshot.html` | Passed, console errors 0 |
| 1366x768 screenshot | Passed |
| 1920x1080 screenshot | Passed |

Note: Codex in-app browser blocked direct `file://` navigation by policy, so the same production build snapshot was served through a local `127.0.0.1` static server for browser verification.

## Screenshots

- `docs/reports/screenshots/2026-05-11-workbench-complete-1366x768.png`
- `docs/reports/screenshots/2026-05-11-workbench-complete-1920x1080.png`

## Build Artifacts

- `src-tauri/target/release/pdf-workbench.exe`
- `src-tauri/target/release/bundle/msi/PDF Workbench_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/PDF Workbench_0.1.0_x64-setup.exe`

## Dependency Notes

`npm audit` initially reported moderate Vite/esbuild development-server vulnerabilities. The dev dependencies were updated to:

- `vite@8.0.11`
- `@vitejs/plugin-react@5.2.0`
- direct `esbuild` devDependency

`vite.config.ts` now targets `esnext`, which matches the Tauri/WebView2 desktop runtime and avoids unnecessary legacy browser transpilation.

## Known Limitations

- Real PDF merge/split/delete/reorder/write is not yet connected.
- Real Office-to-PDF conversion is not yet connected.
- Real PDF thumbnails are represented by UI placeholders.
- Search/replace and decoration are state-connected but not yet written into PDF bytes.
- Output encryption is state-connected but not yet applied to real PDF bytes.
- Pointer drag behavior was visually checked through rendered screenshots and DOM state, but needs additional manual/Playwright-style interaction coverage after the processing engine is connected.

## Next Step

Connect the production processing engine behind Tauri commands:

1. Select the PDF engine boundary.
2. Select the Office conversion boundary.
3. Replace simulated cache/export jobs with real job events.
4. Generate real thumbnails and metadata.
5. Write actual output PDFs from the existing workbench state.

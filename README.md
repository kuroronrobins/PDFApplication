# PDF Workbench

Tauri を使用して PDF アプリケーション UI を全面刷新するための新環境です。

現行の Flet/Python システムは、新環境に混ざらないよう以下へ隔離しています。

- `archive/legacy_flet_system_20260510/`

新 UI の確定方針、操作設計、Office ファイルの一時 PDF キャッシュ方針、完成予想図は以下を参照してください。

- `AGENTS.md`
- `docs/tauri_ui_redesign_plan.md`
- `docs/development_process.md`
- `docs/implementation_roadmap.md`

新 UI は、左サイドバーなしの一画面ワークベンチ型です。通常は 1ファイルを 1カードとして扱い、必要なファイルだけ展開してページ単位の並べ替え、削除、ハサミ分割、ヘッダー/フッター/ページ番号/透かし配置を行います。Excel、Word、PowerPoint は追加直後からファイル単位で操作でき、バックグラウンドでセッション限定の一時 PDF キャッシュを作成します。

今後の開発では、`AGENTS.md` と `docs/development_process.md` に従い、実装単位ごとに `docs/reports/` へ検証記録を残します。

直近の残課題と実装順序は `docs/implementation_roadmap.md` に集約しています。

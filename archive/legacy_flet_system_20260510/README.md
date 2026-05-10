# PDFApplication

Flet を使った PDF 統合ユーティリティです。業務利用を想定し、操作性（UX）と堅牢性を両立しています。

## 主な機能

- PDF 結合・分割（ページ数指定 / ファイルサイズ上限指定を選択可能）
- ページ入れ替え（ドラッグ操作）
- Office / PDF の PDF 変換（変換のみ・結合）
- ヘッダー/フッター/ページ番号の追記
- PDF 文字置換
- 透かし追加、パスワード暗号化、PDF情報表示
- 暗号化PDFの入力パスワード対応（対応機能で共通利用）

## UX強化ポイント

- 入力PDFをサムネイルタイルとして表示
- ドラッグ&ドロップでページ順を直感的に変更
- 右上 × でページ除外（復帰も可）
- 「このページの後で分割」スイッチで分割位置を視覚設定
- 共通設定 + タブ構成で画面バランスを改善

## セットアップ

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 起動

```bash
python app.py
```

## 変換機能について

Office 変換は Microsoft Office (Word / Excel / PowerPoint) のインストールを前提としています。  
Windows 環境で COM 経由で PDF 出力を実行します。

## 構成

- `app.py`: Flet UI（共通設定、ページ編集ワークスペース、標準機能、セキュリティ機能）
- `pdf_app/models.py`: 共通ジョブモデル
- `pdf_app/services/common.py`: 入力検証・暗号化PDFオープン共通処理
- `pdf_app/services/`: PDF 操作のサービス群


## 利用ログ収集と効率化分析

本アプリは実行イベントを JSONL で記録し、任意で GitHub 上の JSONL に追記できます。

### ローカルログ

- 既定ログパス: `./logs/usage_events.jsonl`
- 1行1イベントで、`action`, `status`, `duration_ms`, `baseline_seconds`, `saved_seconds` などを保存
- ログパス変更: `PDFAPP_USAGE_LOG_PATH`

### GitHub へのオンライン追記

以下を設定すると、実行時に GitHub Contents API で JSONL を追記更新します。

- `GITHUB_TOKEN`: repo 書き込み権限を持つトークン
- `PDFAPP_LOG_REPO`: 例 `owner/repo`
- `PDFAPP_LOG_PATH`: 例 `logs/usage_events.jsonl`
- `PDFAPP_LOG_BRANCH`: 既定 `main`

通信失敗時は `./logs/usage_spool.jsonl` に退避し、次回成功時に再送します。

### 削減時間算出ルール

- `actual_seconds = duration_ms / 1000`
- `saved_seconds = baseline_seconds - actual_seconds`
- 機能別ベースラインは内部既定値を利用し、`PDFAPP_BASELINE_<ACTION>` 環境変数で上書き可能
- `inspect` は分析対象外のため `saved_seconds = null`

### 分析バッチ

```bash
python scripts/analyze_efficiency.py --input logs/usage_events.jsonl --output reports/efficiency_report.json
```

レポートには以下を出力します。

- 総実行回数
- 成功率
- 総削減時間
- 1操作あたり平均削減時間
- 機能別・日別の削減時間
- 除外件数（JSON破損、重複ID、負の処理時間）

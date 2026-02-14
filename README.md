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

Office 変換は LibreOffice の headless 実行を前提としています。`soffice` コマンドが利用できない環境では、分かりやすいエラーメッセージを返します。

## 構成

- `app.py`: Flet UI（共通設定、ページ編集ワークスペース、標準機能、セキュリティ機能）
- `pdf_app/models.py`: 共通ジョブモデル
- `pdf_app/services/common.py`: 入力検証・暗号化PDFオープン共通処理
- `pdf_app/services/`: PDF 操作のサービス群

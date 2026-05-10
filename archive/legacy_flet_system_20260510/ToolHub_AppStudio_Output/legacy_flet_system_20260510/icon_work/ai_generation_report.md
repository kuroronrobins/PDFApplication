# AI Generation Report

## Icon Prompt

api: responses.create
status: success
model: gpt-5.4-mini
ai_enabled: true
api_key_present: true
used_api: true
content_type: text
output_format: not_applicable
quality: not_applicable
resolution: not_applicable
error_category: none
failure_class: none
failure_message: none
admin_next_action: none
fallback_reason: none
parse_status: success

No revision prompt was provided.

## Function Interpretation

{
  "app_id": "legacy_flet_system_20260510",
  "name": "Legacy Flet System 20260510",
  "entry_name": "app.py",
  "purpose": "Legacy Flet System 20260510 をToolHubから起動するアプリです。",
  "app_kind": "document workflow tool",
  "primary_action": "launch",
  "secondary_action": "",
  "input_objects": [
    "pdf/document"
  ],
  "output_objects": [
    "pdf/document"
  ],
  "action_flow": "pdf/document -> launch -> pdf/document",
  "visual_priority": [
    "make the launch action visible",
    "show input as pdf/document",
    "show output as pdf/document",
    "keep the relationship readable at 32px"
  ],
  "avoid_generic": [
    "generic abstract shapes only",
    "document-only icon",
    "gear-only icon",
    "checkmark-only icon",
    "network nodes only",
    "initial-letter-only icon",
    "tiny readable text or fake logo letters",
    "photorealistic image",
    "crowded UI screenshot"
  ],
  "composition_template": "Show a clear before-to-after workflow with 2 to 4 objects connected by one visible action path.",
  "primary_motif": "帳票から分析チャートが浮き上がるシンボル",
  "secondary_motifs": [
    "ページ端の折り返しではなく固有の指標マーク",
    "確認済みのデータバー"
  ],
  "avoid": [
    "書類だけのアイコン",
    "歯車だけのアイコン",
    "チェックだけのアイコン",
    "頭文字だけのアイコン",
    "読めない小さい文字やロゴ風文字",
    "写真風、画面キャプチャ風、過密なUI画面"
  ],
  "palette": "インディゴ、スレート、アクセントのアンバー",
  "texture": "マットな紙質とシャープなチャートの対比",
  "small_size_rule": "32pxでも主役モチーフの輪郭が判別でき、細かい文字に頼らない。",
  "high_resolution_rule": "256px以上では輪郭、光沢、余白、素材感がきれいに見える高精細な仕上げ。",
  "toolhub_style_rule": "既存ToolHubアイコンと並べて違和感のない、角丸の余白と落ち着いた業務向け品質。",
  "categories": [
    "業務ツール"
  ],
  "keywords": [
    "Legacy Flet System 20260510",
    "legacy_flet_system_20260510",
    "ToolHub"
  ],
  "use_cases": [
    "Legacy Flet System 20260510 をToolHubからすばやく起動する"
  ],
  "inputs": [
    "アプリ設定に依存"
  ],
  "outputs": [
    "アプリ実行結果"
  ],
  "source_files": [
    ".gitkeep",
    "_app_data.json",
    "_bootstrap.py",
    "_gitup.py",
    "app.py",
    "ARCHIVE.md",
    "README.md",
    "requirements.txt"
  ],
  "dependency_signals": [
    "__future__",
    "base64",
    "dataclasses",
    "datetime",
    "fitz",
    "flet",
    "importlib",
    "json",
    "os",
    "pathlib",
    "pdf_app",
    "pypdf",
    "socket",
    "threading",
    "time",
    "typing"
  ],
  "readme_excerpt": "# PDFApplication\n\nFlet を使った PDF 統合ユーティリティです。業務利用を想定し、操作性（UX）と堅牢性を両立しています。\n\n## 主な機能\n\n- PDF 結合・分割（ページ数指定 / ファイルサイズ上限指定を選択可能）\n- ページ入れ替え（ドラッグ操作）\n- Office / PDF の PDF 変換（変換のみ・結合）\n- ヘッダー/フッター/ページ番号の追記\n- PDF 文字置換\n- 透かし追加、パスワード暗号化、PDF情報表示\n- 暗号化PDFの入力パスワード対応（対応機能で共通利用）\n\n## UX強化ポイント\n\n- 入力PDFをサムネイルタイルとして表示\n- ドラッグ&ドロップでページ順を直感的に変更\n- 右上 × でページ除外（復帰も可）\n- 「このページの後で分割」スイッチで分割位置を視覚設定\n- 共通設定 + タブ構成で画面バランスを改善\n\n## セットアップ\n\n```bash\npython -m venv .venv\nsource .venv/bin/activate\npip install -r requirements.txt\n```\n\n## 起動\n\n```bash\npython app.py\n```\n\n## 変換機能について\n\nOffice 変換は Microsoft Office (Word / Excel / PowerPoint) のインストールを前提としています。 \nWindows 環境で COM 経由で PDF 出力を実行します。\n\n## 構成\n\n- `app.py`: Flet UI（共通設定、ページ編集ワークスペース、標準機能、セキュリティ機能）\n- `pdf_app/models.py`: 共通ジョブモデル\n- `pdf_app/services/common.py`: 入力検証・暗号化PDFオープン共通処理\n- `pdf_app/services/`: PDF 操作のサービス群\n\n## 利用ログ収集と効率化分析\n\n本アプリは実行イベントを JSONL で記録し、任意で GitHub 上の JSONL に追記できます。\n\n### ローカルログ\n\n- 既定ログパス: `.[local path]\n- 1行1イベントで、`action`, `status`, `duration_ms`, `baseline_",
  "style_reference": "Existing ToolHub icon references: app_20260201_agendasnap, legacy_flet_system_20260510, run_xcgate_upload, sample_gui_app, sample_playwright_app"
}

## Image Generation

api: responses.create
status: success
model: gpt-5.4-mini
ai_enabled: true
api_key_present: true
used_api: true
content_type: text
output_format: not_applicable
quality: not_applicable
resolution: not_applicable
error_category: none
failure_class: none
failure_message: none
admin_next_action: none
fallback_reason: none

api: images.generate
status: success
model: gpt-image-1.5
ai_enabled: true
api_key_present: true
used_api: true
content_type: b64_png
output_format: png
quality: medium
resolution: 1024x1024
error_category: none
failure_class: none
failure_message: none
admin_next_action: none
fallback_reason: none

api: images.generate
status: success
model: gpt-image-1.5
ai_enabled: true
api_key_present: true
used_api: true
content_type: b64_png
output_format: png
quality: medium
resolution: 1024x1024
error_category: none
failure_class: none
failure_message: none
admin_next_action: none
fallback_reason: none

api: images.generate
status: success
model: gpt-image-1.5
ai_enabled: true
api_key_present: true
used_api: true
content_type: b64_png
output_format: png
quality: medium
resolution: 1024x1024
error_category: none
failure_class: none
failure_message: none
admin_next_action: none
fallback_reason: none

## Admin Diagnosis

text_prompt_generation_status: success
image_generation_status: success
image_model: gpt-image-1.5
api_candidate_count: 3
failure_class: none
failure_message: none
admin_next_action: none
package_secret_scan_status: blocked
ai_payload_secret_scan_status: passed
ai_submission_blocked: false
ai_submission_block_reason: none

## Image API Summary

{
  "api_candidate_count": 3,
  "image_api_success": true,
  "image_generation_status": "success",
  "latest_image_api_failure": "",
  "failure_class": "",
  "failure_message": "",
  "admin_next_action": "",
  "selected_icon_source": "default_icon",
  "default_icon_used": false,
  "default_icon_reason": "No uploaded icon or adopted AI image candidate was selected, so ToolHub uses the common default app icon.",
  "icon_status": "ai_candidates_available",
  "package_secret_scan_status": "blocked",
  "package_secret_scan_findings": 6,
  "package_ai_submission_blocked": true,
  "package_ai_submission_block_reason": "manual-check-secret-assignment: password has a non-empty value that is not clearly a placeholder.; manual-check-secret-assignment: password has a non-empty value that is not clearly a placeholder.; manual-check-secret-assignment: password has a non-empty value that is not clearly a placeholder.",
  "ai_payload_secret_scan_status": "passed",
  "ai_submission_blocked": false,
  "ai_submission_block_reason": "",
  "model": "gpt-image-1.5",
  "style_preset": "user_prompt",
  "image_evaluation_status": "deterministic_png_check",
  "image_evaluation_note": "Vision evaluation is not run in this MVP; candidates use deterministic prompt/concept checks and PNG small-size checks when pixels are available."
}
candidate_count: 3
api_candidate_count: 3
last_image_api_failure: none
saved_candidate: icon_candidate_1.png
saved_candidates: icon_candidate_1.png, icon_candidate_2.png, icon_candidate_3.png

PNG is the standard ToolHub App Studio icon output. API PNG candidates require human adoption before final icon.png is replaced.
When no uploaded icon or adopted AI PNG is selected, ToolHub writes the common default icon to icon.png for packaging compatibility.
AI image API failures do not create local fallback candidates. Fix the reported cause or adopt an uploaded/API-generated icon to replace the default icon.
candidate_manifest.json records API image candidates only. The common default icon is not a candidate and is not scored.
Vision evaluation is not required for registration. Deterministic score fields are internal hints for API candidates and must not be treated as visual quality guarantees.

## Icon Selection

selected_icon_source: default_icon
icon_status: default_icon
default_icon_used: true
default_icon_reason: No uploaded icon or adopted AI image candidate was selected, so ToolHub uses the common default app icon.

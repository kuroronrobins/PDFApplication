# 2026-05-16 読み込み・書き出し堅牢化リスク棚卸し

## Scope

PDF Workbench で、入力ファイルの都合により読み込み、サムネイル生成、Office 変換、完成プレビュー、書き出しが失敗する可能性を細かく洗い出す。ここでは実装は行わず、今後の堅牢化で検知、復旧、ユーザー通知、検証対象にするべき項目を整理する。

## Current Boundary

- PDF は `pypdf` と PyMuPDF を併用して、検査、ページ構築、サムネイル、装飾、暗号化を行う。
- Office は Microsoft Office COM だけで PDF 化する。LibreOffice fallback は採用しない。
- Rust/Tauri は worker 起動、ジョブ管理、キャッシュ、進捗、エラー整形を担当する。
- Python worker の stdout は JSON/NDJSON プロトコルであり、ライブラリ診断や print 出力を混ぜてはいけない。
- Office 一時 PDF はセッション内キャッシュであり、アプリ終了、リセット、元ファイル更新、設定変更で破棄される。

## Desired Robustness Standard

- 失敗原因を「読み込めません」だけで終わらせず、対象ファイル、段階、原因種別、復旧方法を示す。
- 一つのファイルや一ページの失敗で、可能ならワークスペース全体を巻き添えにしない。
- 復旧可能な警告は構造化ログに残し、ユーザー操作を止めない。
- worker stdout は常に機械可読な JSON/NDJSON のみとする。
- 重い処理や再試行は UI スレッドを止めず、進捗と待ち理由を表示する。
- 出力失敗時は既存ファイルを壊さず、途中生成物を安全に片付ける。

## 1. ファイルパス・OS・保存場所の問題

### 想定原因

- ファイルが削除、移動、リネームされ、追加時のパスが存在しない。
- パスがファイルではなくフォルダ、ショートカット、仮想項目を指している。
- OneDrive、SharePoint、Google Drive、Dropbox などのクラウドプレースホルダーで、実体が未ダウンロード。
- ネットワークドライブ、VPN、NAS、USB メモリなどが途中で切断される。
- Windows のアクセス権がなく、読み取りまたは書き込みできない。
- ファイルが他アプリで排他ロックされている。
- パス長が長すぎる。特に深いフォルダ、長い日本語名、長い出力名で発生する。
- ファイル名に Windows 予約名や末尾スペース、末尾ドットが含まれる。
- Unicode 正規化差、絵文字、特殊記号、サロゲート文字でパス処理や外部アプリ連携が壊れる。
- 一時フォルダや出力フォルダに空き容量がない。
- ウイルス対策ソフトや Defender が一時ファイル作成や Office COM 出力を一時ブロックする。
- 管理者権限が必要な場所、保護されたフォルダ、Controlled Folder Access 配下に出力しようとする。
- 同じ名前の出力ファイルが既にあり、読み取り専用、ロック中、または同期競合中。

### 堅牢化方針

- 追加時と実行直前の両方で `exists/is_file/readable/size/mtime` を再確認する。
- クラウドプレースホルダーらしい失敗は「ファイルの実体をダウンロードしてください」と案内する。
- 出力前に保存先の書き込みテスト、空き容量概算、既存ファイルのロック検査を行う。
- すべての最終出力は一時ファイルに書いてから atomic replace または明示的 rename する。
- Windows 禁止名、予約名、重複、大文字小文字差だけの重複を UI 入力時に弾く。
- 長いパスは worker 内部で絶対パスを正規化し、ログでは折り返し可能な表示にする。

## 2. ファイル種別・拡張子・入力検出の問題

### 想定原因

- 拡張子は `.pdf` だが実体は HTML、画像、テキスト、ゼロバイト、ダウンロード途中ファイル。
- 拡張子は Office だが実体が別形式、壊れた zip、テンプレート、古いバイナリ形式。
- `.doc`, `.xls`, `.ppt` など旧形式が混在する。
- `.xlsm`, `.docm`, `.pptm` などマクロ付きファイルでセキュリティ警告が出る。
- Office の一時ファイル `~$...` を誤って追加する。
- PDF Portfolio、添付ファイルつき PDF、PDF パッケージなど、通常ページ列として扱えない形式。
- XPS、画像、CSV など、ユーザーが PDF 化できると期待しがちな未対応形式。

### 堅牢化方針

- 拡張子だけでなく、ファイルシグネチャと最小限の実体検査を行う。
- Office 系はサポート対象拡張子を UI とエラー文で明確にする。
- 未対応形式はカード追加時点で即時に分かるようにし、後段 worker まで送らない。
- `.tmp`, `.crdownload`, `~$` などの明らかな一時ファイルは専用メッセージで拒否する。

## 3. PDF 暗号化・権限・パスワード問題

### 想定原因

- ユーザーパスワードが必要で開けない。
- オーナーパスワードのみ設定された PDF で、空パスワードでは開けるが操作権限が制限されている。
- pypdf は開けるが PyMuPDF の認証状態が異なる、または逆の差異がある。
- コピー禁止、印刷禁止、編集禁止などの権限があり、処理方針を決める必要がある。
- 入力解除パスワードと出力暗号化パスワードをユーザーが混同する。
- 複数の保護 PDF があり、ファイルごとに異なるパスワードが必要。
- パスワード入力後にワークスペース内の既存失敗ファイルへ再試行されない。

### 堅牢化方針

- `pdf_password_required`, `pdf_password_invalid`, `pdf_permission_restricted` を区別する。
- 空パスワードで開けるコピー保護 PDF は処理を継続し、ログに保護状態を残す。
- 将来的にはファイル単位の入力パスワード管理を用意する。
- 入力解除パスワードと出力暗号化パスワードは UI、ログ、worker schema で明確に分離する。
- パスワード入力後、対象ファイルの inspect/thumbnail/export を再実行できる導線を用意する。

## 4. PDF 構造破損・仕様差・ライブラリ差

### 想定原因

- xref テーブル破損、trailer 欠落、incremental update 不整合。
- linearized PDF のヒントテーブル破損。
- object stream、hybrid xref、圧縮ストリームの不整合。
- タグ付き PDF の structure tree が壊れている。
- PDF/A、PDF/X、署名済み PDF、フォーム PDF、XFA フォームで特殊構造を持つ。
- 注釈、レイヤー、透明グループ、マスク、埋め込み ICC プロファイルが壊れている。
- 埋め込み画像が壊れている、巨大、特殊圧縮、またはカラースペースが未対応。
- フォントが埋め込まれていない、壊れている、CJK フォント置換が必要。
- MediaBox/CropBox/BleedBox/TrimBox が異常、ゼロサイズ、負値、極端なサイズ。
- ページ回転、CropBox、UserUnit の組み合わせで座標が想定と違う。
- pypdf では結合できるが PyMuPDF の描画で失敗する。
- PyMuPDF では描画できるが pypdf のページコピーで失敗する。
- ライブラリは成功扱いだが、復旧可能 warning を stdout/stderr に出す。
- 特定ページだけ壊れており、ファイル全体の inspect は通るが thumbnail/export で落ちる。

### 堅牢化方針

- PDF 処理段階を `inspect`, `thumbnail`, `page_assembly`, `decoration`, `encryption`, `save` に分けてエラー化する。
- pypdf と PyMuPDF の片方だけが失敗するケースを検出し、可能な fallback または明確な制限表示を行う。
- ライブラリ warning は stdout に出さず、構造化ログへ収集する。
- 特定ページだけ失敗した場合は、対象ページ番号を必ず表示する。
- ページサイズ、回転、CropBox 異常は読み込み時に正規化または警告にする。
- 破損 PDF の自動修復を行う場合は、元ファイルを変更せずセッション一時 PDF として扱う。

## 5. 大容量 PDF・性能・メモリ問題

### 想定原因

- 数百から数千ページの PDF で、全ページのサムネイル生成が長すぎる。
- 高解像度スキャン PDF で 1 ページの画像メモリが非常に大きい。
- A0、長尺図面、極端な縦横比のページで preview PNG が巨大になる。
- 複数ファイル同時追加時に inspect、thumbnail、Office 変換が競合する。
- preview 高解像度画像、透明装飾 PNG、サムネイルがセッションキャッシュを圧迫する。
- worker プロセスがメモリ不足で異常終了する。
- 生成済みキャッシュが stale なのに再利用され、古いプレビューやページ数を表示する。

### 堅牢化方針

- 大容量 PDF は lazy thumbnail と優先キューを標準にする。
- サムネイル生成はページ単位でキャンセル可能にし、展開中ファイルを優先する。
- preview 用画像の最大ピクセル数、最大ズーム、キャッシュ上限を設ける。
- メモリ不足は「ページが大きすぎる」「ファイルが大きすぎる」など原因別に出す。
- キャッシュキーは元ファイル size/mtime、処理設定、ページ番号、ズームを含める。

## 6. Office COM 変換の問題

### 想定原因

- Microsoft Office が未インストール、未認証、初回起動未完了。
- Word/Excel/PowerPoint の COM 登録が壊れている。
- Office のビット数、権限、ユーザープロファイル、Desktop heap など環境依存で COM 起動に失敗する。
- Protected View、Trust Center、マクロ警告、リンク更新、修復確認、読み取り専用確認などのダイアログが出る。
- ファイルに開くパスワード、編集パスワード、IRM、ラベル、秘密度分類がある。
- ファイルが他ユーザーまたは他アプリで開かれている。
- Excel の印刷範囲、非表示シート、改ページ、用紙サイズ、余白、縮小設定が想定外。
- Excel の外部リンク、Power Query、ピボット、グラフ、アドイン、古い OLE が更新待ちになる。
- Word の変更履歴、コメント、フィールド更新、リンク画像、フォント置換で見た目が変わる。
- PowerPoint のリンク動画、埋め込みフォント、特殊アニメーション、非表示スライドで出力差が出る。
- 既定プリンターがない、または Office の PDF エクスポートがプリンター設定に影響される。
- ファイル名やパスが長い、UNC パス、クラウドパスで Office COM が開けない。
- Office プロセスが残留し、次の変換に影響する。
- 複数 Office 変換を同時実行して COM が不安定になる。
- 変換後 PDF が生成されない、ゼロバイト、ページ数 0、または書き込み中のままになる。

### 堅牢化方針

- Office 変換は引き続き 1 件ずつ実行し、優先順位だけ制御する。
- 変換前に Office インストール、COM 起動、初回起動ブロックを軽く診断する。
- Office を開くときは警告を抑制し、リンク更新やマクロ実行を避ける設定を明示する。
- ダイアログ待ちや COM 応答停止は timeout で検出し、対象 Office アプリを安全に閉じる。
- 変換後 PDF は存在、サイズ、ページ数を検査してから `ready` にする。
- COM 例外は Office アプリ名、対象ファイル、操作段階を含むエラーに整形する。
- 変換キャッシュは source size/mtime と変換設定で stale 判定する。

## 7. ワークスペース状態・ページ参照の問題

### 想定原因

- ファイル追加後に元ファイルが更新され、ページ数や内容が変わる。
- Office キャッシュが古いままページ編集や書き出しに使われる。
- ページ削除、移動、分割、ファイル除外後に `sourceFileId/pageNumber` が不整合になる。
- 同じファイルを複数回追加し、パスだけで参照すると区別できない。
- ファイル単位除外とページ単位除外の組み合わせで出力対象が空になる。
- split 設定と出力名設定の数が一致しない。
- ワークスペース内の仮想サンプルファイルを実出力しようとする。
- Undo/Redo 後にキャッシュや preview queue が古い状態を参照する。

### 堅牢化方針

- export 前に workspace snapshot を検証し、ページ参照、ファイル状態、出力グループを再計算する。
- source file identity は fileId と実パスを分離し、同じパスの複数追加を許容する。
- 出力対象 0 ページは worker 前に UI で止める。
- split 後の出力数とカスタム名数、保存先を必ず preflight する。
- 元ファイルの size/mtime が変わったら `stale` にして再読み込みまたは再変換を促す。

## 8. 装飾・ヘッダー・フッター・透かしの問題

### 想定原因

- PDF ページの回転、CropBox、UserUnit により装飾位置が preview と書き出しでずれる。
- 縦横比やページサイズが混在し、同じ設定でも見た目が不自然になる。
- 長いヘッダー/フッター文字列が枠に収まらない。
- CJK フォント、特殊記号、絵文字が PDF 出力フォントで描けない。
- 透かしや装飾が元 PDF の内容と重なり、実用上読みにくくなる。
- 注釈やフォーム、既存レイヤーとの z-order が想定と違う。
- 透明 PNG refinement と最終 PDF の座標・フォント差が出る。
- 装飾対象が page/file/all の複数範囲で競合する。
- 同じ位置に複数のヘッダー/フッターが残る。

### 堅牢化方針

- PDF 座標マニフェストを唯一の配置契約にし、preview と export の双方で使う。
- 装飾は slot 単位で置換規則を持ち、同じ page/file/all の競合を preflight する。
- ヘッダー/フッターは固定小サイズ、黒、Word 風の余白内表示を標準にする。
- 文字幅計測、ellipsis、CJK fallback font を PDF worker 側で統一する。
- preview refinement は非同期でよいが、最終座標の丸め規則を export と一致させる。

## 9. 書き出し・保存・暗号化の問題

### 想定原因

- 保存先フォルダが存在しない、書き込み不可、読み取り専用、または削除された。
- 出力ファイル名が空、重複、予約名、禁止文字、長すぎる。
- 既存出力ファイルが Adobe Reader、ブラウザ、Explorer プレビュー、同期アプリでロックされている。
- 一時出力から最終出力への `replace/rename` が失敗する。
- ディスク容量不足で途中まで書かれる。
- 出力暗号化パスワードが未設定、空白、または入力解除パスワードと混同される。
- pypdf 暗号化後の PDF が一部ビューアで開けない互換性になる。
- 複数分割出力の途中で失敗し、一部だけ完成する。
- キャンセル時に一時ファイルが残る、または完成済みファイルまで消してしまう。
- 書き出し中に元ファイルや Office キャッシュが消える。

### 堅牢化方針

- export 前に destination preflight を行い、名前、重複、ロック、書き込みテストを確認する。
- 各出力は scratch に作成し、成功検査後に最終配置する。
- 分割出力では output group 単位の成功/失敗を記録し、失敗時はどこまで保存されたかを明示する。
- 暗号化後 PDF は再度 inspect し、ページ数と暗号化状態を確認する。
- キャンセルは scratch のみ削除し、既存のユーザーファイルは触らない。

## 10. Worker・プロトコル・ランタイム問題

### 想定原因

- worker stdout にライブラリ診断、print、traceback が混ざり JSON が壊れる。
- worker が stderr に大量出力し、親プロセス側の読み取りやログ整形が詰まる。
- Python runtime、PyMuPDF、pypdf、pywin32 などの依存が release bundle に不足する。
- 開発環境の Python では動くが、同梱 runtime では動かない。
- native library が access violation で落ち、JSON エラーを返せない。
- worker timeout、キャンセル、kill 後に一時ファイルや Office プロセスが残る。
- JSON schema のバージョン差で frontend/Rust/Python が食い違う。
- Windows ロケール、標準入出力 encoding、非 ASCII パスで worker 入出力が壊れる。
- 複数 job が同じ session/cache/output path を同時に触る。

### 堅牢化方針

- worker の stdout は JSON/NDJSON 専用にし、診断は stderr 捕捉または構造化ログへ送る。
- 予期しない終了は `worker_crashed`, `worker_timeout`, `worker_protocol_error` に分類する。
- release build で同梱 runtime の dependency smoke を自動実行する。
- worker schema に version を持たせ、未知フィールドと必須フィールドを整理する。
- 一時ディレクトリは jobId/sessionId で分離し、同時実行の衝突を避ける。

## 11. UI 表示・復旧導線の問題

### 想定原因

- エラーがログだけに出て、カード上では何が悪いか分からない。
- Office 変換待ち、PDF 読み込み待ち、サムネイル生成待ちが区別できない。
- 失敗ファイルがワークスペースに残るべきか、除外されるべきかが不明。
- パスワード入力後、どのファイルを再試行すべきか分からない。
- 書き出し失敗時、ユーザーが「既存ファイルを壊したのでは」と不安になる。
- 詳細ログに長いパスや技術エラーが出すぎて読めない。

### 堅牢化方針

- カード状態を `queued`, `converting`, `ready`, `error`, `stale`, `password_required`, `unsupported` まで細分化する。
- エラー表示は短い原因、対象、復旧ボタンをカード内に出し、詳細はログに逃がす。
- 書き出し失敗時は「既存ファイルは変更していません」「一時ファイルを削除しました」など結果を明示する。
- 再試行、除外、保存先変更、パスワード入力、ファイル再選択を状況別に出す。

## 12. セキュリティ・安全性

### 想定原因

- PDF に JavaScript、起動アクション、外部リンク、添付ファイルが含まれる。
- Office ファイルにマクロ、外部リンク、OLE、ネットワーク参照が含まれる。
- UNC パスやリモートリンクにアクセスして処理が止まる、または情報漏えいリスクがある。
- PDF/Office の脆弱性により、ライブラリや Office が不安定になる。
- ログにパスワードや機密情報を出してしまう。

### 堅牢化方針

- Office 変換ではマクロ実行、リンク自動更新、不要な外部接続を抑制する。
- パスワードはログ、report、JSON detail に出さない。
- PDF の JavaScript や添付は実行せず、ページ描画/ページ抽出対象としてだけ扱う。
- 予期しない外部参照待ちは timeout とエラー分類で止める。

## 13. 優先的に検証すべき悪条件ファイル

- 正常な小型 PDF。
- パスワード必須 PDF。
- 空パスワードで開けるコピー保護 PDF。
- 構造 tree warning を出すが描画できる PDF。
- xref が壊れたが viewer では開ける PDF。
- 特定ページだけ壊れた PDF。
- 1000 ページ級 PDF。
- 高解像度スキャン PDF。
- A0 図面や長尺ページ PDF。
- 縦横混在、回転混在、CropBox あり PDF。
- フォーム、注釈、署名、レイヤーつき PDF。
- 日本語・長いファイル名・特殊記号ファイル名。
- OneDrive プレースホルダー。
- ロック中の PDF。
- Word/Excel/PowerPoint の通常ファイル。
- 旧形式 `.doc/.xls/.ppt`。
- マクロ付き `.docm/.xlsm/.pptm`。
- Office パスワードつきファイル。
- 外部リンクや画像リンクを含む Office。
- Excel の複数シート、非表示シート、印刷範囲なし、巨大シート。
- PowerPoint の非表示スライド、リンク動画、埋め込みフォント。
- Word の変更履歴、コメント、リンク画像、縦書き、特殊フォント。
- 出力先が読み取り専用。
- 出力先ファイルが既に開かれている。
- 出力先ディスク容量不足を模擬したケース。

## 14. エラーコード整理案

### Input / path

- `input_not_found`
- `input_not_file`
- `input_not_readable`
- `input_locked`
- `input_cloud_placeholder`
- `input_path_too_long`
- `unsupported_format`
- `invalid_file_signature`
- `empty_input_file`

### PDF

- `pdf_password_required`
- `pdf_password_invalid`
- `pdf_permission_restricted`
- `pdf_inspect_failed`
- `pdf_render_failed`
- `pdf_page_damaged`
- `pdf_structure_warning`
- `pdf_unsupported_feature`
- `pdf_page_geometry_invalid`

### Office

- `office_not_installed`
- `office_com_unavailable`
- `office_activation_required`
- `office_protected_view`
- `office_password_required`
- `office_dialog_blocked`
- `office_timeout`
- `office_output_missing`
- `office_output_invalid`
- `office_com_failed`

### Export

- `empty_output`
- `invalid_workspace`
- `missing_source`
- `stale_source`
- `invalid_page`
- `invalid_output_dir`
- `output_not_writable`
- `output_file_locked`
- `invalid_output_name`
- `duplicate_output_name`
- `disk_full`
- `atomic_replace_failed`
- `missing_password`
- `encryption_failed`

### Worker

- `worker_protocol_error`
- `worker_crashed`
- `worker_timeout`
- `worker_cancelled`
- `worker_dependency_missing`
- `worker_runtime_missing`
- `worker_stdout_polluted`

## 15. 実装順序案

1. Preflight 層を作る。入力 path、形式、出力先、出力名、workspace snapshot を worker 前に検査する。
2. worker stdout/NDJSON 契約を強化する。標準出力汚染、予期しない終了、timeout を分類する。
3. PDF inspect/render/export のエラーを段階別に包む。対象ページ番号と対象ファイルを必ず残す。
4. Office COM の timeout、ダイアログ、出力 PDF 検査、残留プロセス処理を強化する。
5. カード上のエラー状態と復旧導線を増やす。再試行、パスワード入力、ファイル再選択、除外を状況別に出す。
6. 悪条件ファイルセットで regression smoke を作る。実ファイルを残せない場合は合成 PDF と手動検証リストを分ける。

## Known limitations

- この文書は原因候補の棚卸しであり、まだ実装済み対策の一覧ではない。
- Office COM は環境依存が大きいため、開発 PC だけでなく Office 搭載のクリーン環境で確認が必要。
- 壊れた PDF の自動修復は、精度、速度、法的/業務的な期待値を確認してから導入する。

## Next recommended step

上記をもとに、まずは preflight と worker protocol hardening を小さく実装し、次に PDF/Office の悪条件 smoke を追加する。

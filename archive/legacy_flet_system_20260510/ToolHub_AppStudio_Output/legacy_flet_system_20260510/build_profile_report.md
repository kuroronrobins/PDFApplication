# Build Profile

- app_id: `legacy_flet_system_20260510`
- source: `saved+auto`
- readiness: `warn`

## Source Scope

- source_root: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510`
- source_root_origin: `entry_parent`
- entry_relative: `app.py`
- included_count: 15
- excluded_count: 7
- blocked_count: 0
- manual_check_count: 11
- excluded_directory_count: 4
- sensitive_excluded_directory_count: 0
- sensitive_excluded_file_count: 0

## add_binaries
- count: 0
- none

## add_data
- count: 1
- `{"source": "pdf_app/services", "destination": "pdf_app/services"}`

## collect_all
- count: 2
- `"flet"`
- `"flet_desktop"`

## hidden_imports
- count: 25
- `"__init__"`
- `"models"`
- `"pdf_app.__init__"`
- `"pdf_app.models"`
- `"pdf_app.services.__init__"`
- `"pdf_app.services.business"`
- `"pdf_app.services.common"`
- `"pdf_app.services.convert"`
- `"pdf_app.services.github_log_sink"`
- `"pdf_app.services.header_footer"`
- `"pdf_app.services.page_workspace"`
- `"pdf_app.services.pdf_ops"`
- `"pdf_app.services.text_edit"`
- `"pdf_app.services.usage_log"`
- `"services.__init__"`
- `"services.business"`
- `"services.common"`
- `"services.convert"`
- `"services.github_log_sink"`
- `"services.header_footer"`
- `"services.page_workspace"`
- `"services.pdf_ops"`
- `"services.text_edit"`
- `"services.usage_log"`
- `"flet_desktop"`

## paths
- count: 1
- `"pdf_app"`

## Manual Checks
- app.py: Path - call uses a dynamic path expression
- pdf_app/services/usage_log.py: Path - call uses a dynamic path expression
- pdf_app/services/usage_log.py: read_text - Path read call uses a dynamic path expression
- Flet desktop runtime を検出しました。build_env で flet-desktop を同一バージョンに補完し、frozen-folder 起動確認を行ってください。

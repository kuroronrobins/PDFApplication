# Build Profile

- app_id: `app_20260215_pdfapplication`
- source: `saved+auto`
- readiness: `warn`

## Source Scope

- source_root: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication`
- source_root_origin: `entry_parent`
- entry_relative: `app.py`
- included_count: 15
- excluded_count: 7
- blocked_count: 0
- manual_check_count: 11
- excluded_directory_count: 5
- sensitive_excluded_directory_count: 0
- sensitive_excluded_file_count: 0

## add_binaries
- count: 0
- none

## add_data
- count: 0
- none

## collect_all
- count: 0
- none

## hidden_imports
- count: 24
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

## paths
- count: 1
- `"pdf_app"`

## Manual Checks
- app.py: Path - call uses a dynamic path expression
- pdf_app/services/usage_log.py: Path - call uses a dynamic path expression
- pdf_app/services/usage_log.py: read_text - Path read call uses a dynamic path expression

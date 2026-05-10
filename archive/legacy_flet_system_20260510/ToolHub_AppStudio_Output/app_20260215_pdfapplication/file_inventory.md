# File Inventory

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
- toolhubignore_pattern_count: 0
## Source Scope Warnings

- auto source_root contains a .git directory; use --source-root if only a subdirectory should be packaged.

## Excluded Directories

| Path | Reason | Pattern |
| --- | --- | --- |
| .git | excluded generated or external-work directory | - |
| logs | excluded runtime/user-output directory | - |
| pdf_app/__pycache__ | excluded generated or external-work directory | - |
| pdf_app/services/__pycache__ | excluded generated or external-work directory | - |
| ToolHub_AppStudio_Output | excluded generated or external-work directory | - |

## Files

| Status | Category | Path | Bytes | Reason | Detected From | Secret Scan |
| --- | --- | --- | --- | --- | --- | --- |
| exclude | other | .gitkeep | 0 | not selected for App Studio package | - | not_scanned |
| exclude | other | .vscode/settings.json | 39 | not selected for App Studio package | - | not_scanned |
| exclude | other | _app_data.json | 3143 | not selected for App Studio package | - | not_scanned |
| exclude | other | _bootstrap.py | 11275 | not selected for App Studio package | - | not_scanned |
| exclude | other | _gitup.py | 15593 | not selected for App Studio package | - | not_scanned |
| include | entry | app.py | 55156 | entry file | entry | warning |
| exclude | other | docs/tauri_ui_redesign_plan.md | 8974 | not selected for App Studio package | - | not_scanned |
| include | source | pdf_app/__init__.py | 31 | project source package | package_source | not_scanned |
| include | source | pdf_app/models.py | 927 | local import dependency | import | not_scanned |
| include | source | pdf_app/services/__init__.py | 1288 | local import dependency | import | not_scanned |
| include | source | pdf_app/services/business.py | 1933 | project source package | package_source | not_scanned |
| include | source | pdf_app/services/common.py | 1564 | local import dependency | import | not_scanned |
| include | source | pdf_app/services/convert.py | 4891 | project source package | package_source | not_scanned |
| include | source | pdf_app/services/github_log_sink.py | 2937 | local import dependency | import | not_scanned |
| include | source | pdf_app/services/header_footer.py | 1263 | project source package | package_source | warning |
| include | source | pdf_app/services/page_workspace.py | 2380 | project source package | package_source | warning |
| include | source | pdf_app/services/pdf_ops.py | 4352 | project source package | package_source | warning |
| include | source | pdf_app/services/text_edit.py | 1226 | project source package | package_source | warning |
| include | source | pdf_app/services/usage_log.py | 4770 | local import dependency | import | warning |
| include | metadata | README.md | 3195 | project metadata | metadata | not_scanned |
| include | metadata | requirements.txt | 55 | project metadata | metadata | not_scanned |
| exclude | other | scripts/analyze_efficiency.py | 4184 | not selected for App Studio package | - | not_scanned |

## Manual Checks

- app.py: Path - call uses a dynamic path expression
- app.py: Path - call uses a dynamic path expression
- app.py: Path - call uses a dynamic path expression
- app.py: Path - call uses a dynamic path expression
- app.py: Path - call uses a dynamic path expression
- app.py: Path - call uses a dynamic path expression
- app.py: Path - call uses a dynamic path expression
- pdf_app/services/usage_log.py: Path - call uses a dynamic path expression
- pdf_app/services/usage_log.py: read_text - Path read call uses a dynamic path expression
- pdf_app/services/usage_log.py: Path - call uses a dynamic path expression
- pdf_app/services/usage_log.py: Path - call uses a dynamic path expression

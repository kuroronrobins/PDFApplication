# Exe Readiness

- app_id: `app_20260215_pdfapplication`
- overall_status: `warn`

| Status | Check | Detail |
| --- | --- | --- |
| pass | build mode | frozen-folder uses PyInstaller --onedir. |
| pass | managed build python | C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_env\Scripts\python.exe |
| warn | requirements.lock | No requirements.lock was found. GenerateLock is recommended before formal distribution. |
| warn | profile data files | No data files were inferred. Confirm this app does not need config/assets at runtime. |
| pass | hidden imports | 24 hidden import candidate(s) were inferred. |
| warn | secret scan | Secret scan findings were classified as warnings/manual checks; Apply may continue if distribution checks pass. |

## Manual Checks

- app.py: Path - call uses a dynamic path expression
- pdf_app/services/usage_log.py: Path - call uses a dynamic path expression
- pdf_app/services/usage_log.py: read_text - Path read call uses a dynamic path expression

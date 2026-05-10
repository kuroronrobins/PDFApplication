# Exe Readiness

- app_id: `legacy_flet_system_20260510`
- overall_status: `warn`

| Status | Check | Detail |
| --- | --- | --- |
| pass | build mode | frozen-folder uses PyInstaller --onedir. |
| pass | managed build python | C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\Scripts\python.exe |
| warn | requirements.lock | No requirements.lock was found. GenerateLock is recommended before formal distribution. |
| pass | profile data files | 1 data file(s) will be passed to PyInstaller. |
| pass | hidden imports | 25 hidden import candidate(s) were inferred. |
| warn | secret scan | Secret scan findings were classified as warnings/manual checks; Apply may continue if distribution checks pass. |

## Manual Checks

- app.py: Path - call uses a dynamic path expression
- pdf_app/services/usage_log.py: Path - call uses a dynamic path expression
- pdf_app/services/usage_log.py: read_text - Path read call uses a dynamic path expression
- Flet desktop runtime を検出しました。build_env で flet-desktop を同一バージョンに補完し、frozen-folder 起動確認を行ってください。

# Execution Test Report

- app_id: `legacy_flet_system_20260510`
- generated_at: `2026-05-11T23:33:27`
- overall_status: `warn`
- approval_allowed: `true`
- approval_blocking_warnings_count: `0`
- non_blocking_warnings_count: `2`
- info_count: `9`
- unresolved_distribution_risks_count: `0`

| Status | Category | Blocking | Check | Detail |
| --- | --- | --- | --- | --- |
| pass | info | false | app.yaml exists | C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\apps\legacy_flet_system_20260510\app.yaml |
| pass | info | false | app.yaml parse | runner=exe, entry=bin/legacy_flet_system_20260510/legacy_flet_system_20260510.exe |
| pass | info | false | runner supported | exe |
| pass | info | false | frozen-folder executable | C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\apps\legacy_flet_system_20260510\bin\legacy_flet_system_20260510\legacy_flet_system_20260510.exe |
| pass | info | false | .py run.entry blocked | bin/legacy_flet_system_20260510/legacy_flet_system_20260510.exe |
| pass | info | false | registered BUILD_REQUIRED marker | BUILD_REQUIRED.txt is not present in apps/<app_id>/bin. |
| pass | info | false | frozen data files | 1 packaged data file(s) were found. |
| pass | info | false | forbidden registered payload | No forbidden credential, log, cache, temp, or build_env files were registered. |
| warn | non_blocking_warning | false | secret scan | No Apply-blocking secret findings. warnings=6, manual_checks=6 |
| pass | info | false | distribution check | Distribution checks passed. |
| warn | non_blocking_warning | false | runner dry execution | Skipped for exe/frozen-folder mode. Browser, login, and GUI flows require human launch verification. |

## Evidence

```json
{
  "app_studio_cli_path": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release\\tools\\app_studio\\main.py",
  "app_studio_policy_id": "normal_python_source_to_frozen_folder_build_env_v3",
  "registration_policy": "user-distribution",
  "repo_root": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release",
  "git_commit": "237cb05",
  "main_py_hash": "ab3f8cc4599d07d19888c93aa253e43ba7bd6978b49923cc590f0a33452a3c82",
  "frozen_folder_builder_hash": "013fd7b68cfb7622a8f4166e34f7885e08b8cb18051d3d98ae034416bdc1f237",
  "argv": [
    "import",
    "--entry",
    "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\app.py",
    "--build-mode",
    "frozen-folder",
    "--app-id",
    "legacy_flet_system_20260510",
    "--name",
    "Legacy Flet System 20260510",
    "--generate-lock",
    "--build-frozen-folder",
    "--verify-runtime",
    "--apply"
  ],
  "normalized_options": {
    "build_mode": "frozen-folder",
    "source_root": null,
    "create_app_env": false,
    "rebuild_app_env": false,
    "skip_app_env_build": false,
    "generate_lock": true,
    "skip_lock": false,
    "build_frozen_folder": true,
    "rebuild_frozen_folder": true,
    "skip_frozen_build": false,
    "verify_runtime": true
  },
  "source_entry": "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\app.py",
  "source_root": "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510",
  "source_root_origin": "entry_parent",
  "source_root_warnings": [],
  "output_dir": "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510",
  "build_env_path": "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\be",
  "build_env_python": "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\be\\Scripts\\python.exe",
  "pyinstaller_probe_python": "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\be\\Scripts\\python.exe",
  "pyinstaller_build_python": "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\be\\Scripts\\python.exe",
  "frozen_build_report": {
    "path": "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\frozen_folder_build_report.md",
    "exists": true,
    "last_write_time": "2026-05-11T23:33:19",
    "size": 11143
  },
  "frozen_exe": {
    "path": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release\\apps\\legacy_flet_system_20260510\\bin\\legacy_flet_system_20260510\\legacy_flet_system_20260510.exe",
    "exists": true,
    "last_write_time": "2026-05-11T23:33:18",
    "size": 8109507
  },
  "output_frozen_exe": {
    "path": "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\final_app\\bin\\legacy_flet_system_20260510\\legacy_flet_system_20260510.exe",
    "exists": true,
    "last_write_time": "2026-05-11T23:33:18",
    "size": 8109507
  },
  "app_yaml": {
    "path": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release\\apps\\legacy_flet_system_20260510\\app.yaml",
    "exists": true,
    "last_write_time": "2026-05-11T23:32:24",
    "size": 1577
  },
  "build_profile": {
    "path": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release\\apps\\legacy_flet_system_20260510\\build_profile.json",
    "exists": true,
    "last_write_time": "2026-05-11T23:32:24",
    "size": 2449
  },
  "timing_report": {
    "path": "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\timing_report.json",
    "exists": true,
    "last_write_time": "2026-05-11T23:32:24",
    "size": 1770
  }
}
```

Human approval is required before enabling this app in release/app_manifest.json.

# Frozen-Folder Distribution Check Report

- app_id: `legacy_flet_system_20260510`
- overall_status: `pass`
- approval_blocking_warnings_count: `0`
- non_blocking_warnings_count: `0`
- unresolved_distribution_risks_count: `0`

| Status | Category | Blocking | Check | Detail |
| --- | --- | --- | --- | --- |
| pass | info | false | frozen-folder executable exists | C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\bin\legacy_flet_system_20260510\legacy_flet_system_20260510.exe |
| pass | info | false | app.yaml run.entry | bin/legacy_flet_system_20260510/legacy_flet_system_20260510.exe |
| pass | info | false | requirements.lock exists | C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\requirements.lock |
| pass | info | false | distribution run.entry policy | bin/legacy_flet_system_20260510/legacy_flet_system_20260510.exe |
| pass | info | false | BUILD_REQUIRED marker removed | BUILD_REQUIRED.txt is not present in final_app/bin. |
| pass | info | false | pyinstaller layout command | PyInstaller command includes --contents-directory . for old-style onedir layout. |
| pass | info | false | required add-data files | 1 packaged data item(s) were found. |
| pass | info | false | forbidden payload files | No forbidden credential, log, cache, temp, or build_env files were found. |
| pass | info | false | build_env separation | build_env is outside final_app: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be |
| pass | info | false | frozen-folder size | 73299083 bytes (69.9 MB) |
| pass | info | false | add-data source size | 26604 bytes (0.0 MB) |
| pass | info | false | frozen smoke execution | Process stayed alive for 4.0s; no immediate crash was detected. |

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
  "pyinstaller_build_python": "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\be\\Scripts\\python.exe"
}
```

Normal App Studio registration verifies the generated exe/frozen-folder payload, not runtime/app_env.

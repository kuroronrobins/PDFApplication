# Approval Record

- status: `approved`
- recorded_at: `2026-05-11T06:28:00`
- app_id: `legacy_flet_system_20260510`
- version: `0.1.0`
- enabled: `True`
- manifest_enabled_after: `True`
- package: `C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_packs\legacy_flet_system_20260510-0.1.0.zip`
- targeted_verification_status: `ok`
- verify_release_before: `skipped`
- verify_release_after: `skipped`
- rollback_reason: ``

## Failures


## Targeted Verification

```json
{
  "status": "ok",
  "checks": [
    "manifest enabled=true",
    "app.yaml exists",
    "app.yaml parses; run.entry=bin/legacy_flet_system_20260510/legacy_flet_system_20260510.exe",
    "run.entry exists",
    "display.icon exists: icon.png",
    "runtime.requirements_lock exists: requirements.lock",
    "BUILD_REQUIRED.txt absent",
    "app pack exists: C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release\\release\\app_packs\\legacy_flet_system_20260510-0.1.0.zip",
    "app pack contains app.yaml and pack_manifest.json",
    "app pack contains run.entry",
    "app pack contains display.icon",
    "app pack contains runtime.requirements_lock"
  ],
  "failures": []
}
```

## Verify Release Gate

```json
{
  "rollback_required": false,
  "global_warning": false,
  "verify_release_before": "skipped",
  "verify_release_after": "skipped",
  "new_failures": [],
  "pre_existing_failures": [],
  "app_failures": [],
  "rollback_failures": [],
  "rollback_reason": ""
}
```

## execution_test_result.json

```json
{
  "app_id": "legacy_flet_system_20260510",
  "generated_at": "2026-05-11T06:27:30",
  "overall_status": "warn",
  "approval_allowed": true,
  "checks": [
    {
      "name": "app.yaml exists",
      "status": "pass",
      "detail": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release\\apps\\legacy_flet_system_20260510\\app.yaml",
      "approval_category": "info",
      "approval_blocking": false,
      "resolved": false
    },
    {
      "name": "app.yaml parse",
      "status": "pass",
      "detail": "runner=exe, entry=bin/legacy_flet_system_20260510/legacy_flet_system_20260510.exe",
      "approval_category": "info",
      "approval_blocking": false,
      "resolved": false
    },
    {
      "name": "runner supported",
      "status": "pass",
      "detail": "exe",
      "approval_category": "info",
      "approval_blocking": false,
      "resolved": false
    },
    {
      "name": "frozen-folder executable",
      "status": "pass",
      "detail": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release\\apps\\legacy_flet_system_20260510\\bin\\legacy_flet_system_20260510\\legacy_flet_system_20260510.exe",
      "approval_category": "info",
      "approval_blocking": false,
      "resolved": false
    },
    {
      "name": ".py run.entry blocked",
      "status": "pass",
      "detail": "bin/legacy_flet_system_20260510/legacy_flet_system_20260510.exe",
      "approval_category": "info",
      "approval_blocking": false,
      "resolved": false
    },
    {
      "name": "registered BUILD_REQUIRED marker",
      "status": "pass",
      "detail": "BUILD_REQUIRED.txt is not present in apps/<app_id>/bin.",
      "approval_category": "info",
      "approval_blocking": false,
      "resolved": false
    },
    {
      "name": "frozen data files",
      "status": "pass",
      "detail": "1 packaged data file(s) were found.",
      "approval_category": "info",
      "approval_blocking": false,
      "resolved": false
    },
    {
      "name": "forbidden registered payload",
      "status": "pass",
      "detail": "No forbidden credential, log, cache, temp, or build_env files were registered.",
      "approval_category": "info",
      "approval_blocking": false,
      "resolved": false
    },
    {
      "name": "secret scan",
      "status": "warn",
      "detail": "No Apply-blocking secret findings. warnings=6, manual_checks=6",
      "approval_category": "non_blocking_warning",
      "approval_blocking": false,
      "resolved": false
    },
    {
      "name": "distribution check",
      "status": "pass",
      "detail": "Distribution checks passed.",
      "approval_category": "info",
      "approval_blocking": false,
      "resolved": false
    },
    {
      "name": "runner dry execution",
      "status": "warn",
      "detail": "Skipped for exe/frozen-folder mode. Browser, login, and GUI flows require human launch verification.",
      "approval_category": "non_blocking_warning",
      "approval_blocking": false,
      "resolved": false
    }
  ],
  "evidence": {
    "app_studio_cli_path": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release\\tools\\app_studio\\main.py",
    "app_studio_policy_id": "normal_python_source_to_frozen_folder_build_env_v3",
    "registration_policy": "user-distribution",
    "repo_root": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release",
    "git_commit": "ba7f326",
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
      "last_write_time": "2026-05-11T06:27:23",
      "size": 11143
    },
    "frozen_exe": {
      "path": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release\\apps\\legacy_flet_system_20260510\\bin\\legacy_flet_system_20260510\\legacy_flet_system_20260510.exe",
      "exists": true,
      "last_write_time": "2026-05-11T06:27:22",
      "size": 8109507
    },
    "output_frozen_exe": {
      "path": "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\final_app\\bin\\legacy_flet_system_20260510\\legacy_flet_system_20260510.exe",
      "exists": true,
      "last_write_time": "2026-05-11T06:27:22",
      "size": 8109507
    },
    "app_yaml": {
      "path": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release\\apps\\legacy_flet_system_20260510\\app.yaml",
      "exists": true,
      "last_write_time": "2026-05-11T06:26:48",
      "size": 1577
    },
    "build_profile": {
      "path": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release\\apps\\legacy_flet_system_20260510\\build_profile.json",
      "exists": true,
      "last_write_time": "2026-05-11T06:26:48",
      "size": 2449
    },
    "timing_report": {
      "path": "C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\timing_report.json",
      "exists": true,
      "last_write_time": "2026-05-11T06:26:48",
      "size": 1769
    }
  },
  "approval_blocking_warnings_count": 0,
  "non_blocking_warnings_count": 2,
  "info_count": 9,
  "unresolved_distribution_risks_count": 0,
  "approval_blocking_reasons": [],
  "non_blocking_warning_summaries": [
    "secret scan: No Apply-blocking secret findings. warnings=6, manual_checks=6",
    "runner dry execution: Skipped for exe/frozen-folder mode. Browser, login, and GUI flows require human launch verification."
  ]
}
```

## verify_release.ps1 before

```json
{
  "status": "skipped",
  "reason": "scripts/verify_release.ps1 was not found."
}
```

## verify_release.ps1

```json
{
  "status": "skipped",
  "reason": "scripts/verify_release.ps1 was not found."
}
```

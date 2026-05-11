# App Studio Timing Report

- app_id: `legacy_flet_system_20260510`
- action: `apply`
- generated_at: `2026-05-11T23:30:46`
- estimated_total_seconds: `82`
- actual_total_seconds: `160.305`
- prediction_error_seconds: `78.305`
- prediction_source: `history`
- wall_clock_total_seconds: `160.305`
- cli_measured_total_seconds: `159.856`
- unmeasured_overhead_seconds: `0.449`
- total_duration_seconds: `159.856`

| Status | Phase | Duration sec | Detail |
| --- | --- | ---: | --- |
| pass | 事前確認 | 0.0 | CLI options and normal registration policy were validated. |
| pass | ファイル棚卸し | 0.077 |  |
| pass | 秘密情報検査 | 0.013 |  |
| pass | 依存関係解析 | 0.0 |  |
| pass | メタデータ生成 | 0.0 |  |
| pass | アイコン生成 | 97.614 |  |
| pass | 登録成果物の作成 | 0.094 |  |
| pass | ビルド用環境の作成と依存インストール | 1.023 |  |
| hit | build_env_cache | 0.0 | cache_hit=True; cache_miss_reason=none; cache_key=0baf5ac840363007fc657747ab91a3a583f2679f77c0d3dcf2409bab016c6e25; pip_cache_dir=C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pip |
| skipped | 依存関係インストール | 0.0 | Dependency install skipped because cached build_env was reused. |
| pass | requirements.lock 生成 | 2.01 |  |
| pass | ビルドツールインストール | 0.519 |  |
| hit | build_tools_cache | 0.0 | Build tool install skipped because installed versions satisfy requested specs. |
| included | PyInstaller 確認 | 0.0 | PyInstaller probe is executed inside the frozen-folder build phase and reported in frozen_folder_build_report.md. |
| pass | PyInstaller frozen-folder build | 50.985 |  |
| pass | 配布物検証 | 4.776 |  |
| pass | 登録コピーと App Pack 作成 | 2.641 |  |
| pass | registration_copy.backup_existing_total | 0.0 | measured_duration_seconds=0.000 |
| pass | registration_copy.remove_existing_app | 0.0 | measured_duration_seconds=0.000; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\apps\legacy_flet_system_20260510 |
| pass | registration_copy.copy_final_app_to_apps | 0.0 | measured_duration_seconds=0.389; files=359; bytes=73307432 (69.9 MB) |
| pass | registration_copy.manifest_update_before_pack | 0.0 | measured_duration_seconds=0.001; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_manifest.json |
| pass | registration_copy.load_manifest_for_pack | 0.0 | measured_duration_seconds=0.000; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_manifest.json |
| pass | registration_copy.validate_app_pack_inputs | 0.0 | measured_duration_seconds=0.004; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\apps\legacy_flet_system_20260510 |
| pass | registration_copy.remove_existing_app_pack | 0.0 | measured_duration_seconds=0.000; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_packs\legacy_flet_system_20260510-0.1.0.zip |
| pass | registration_copy.compress_app_pack | 0.0 | measured_duration_seconds=2.177; strategy=direct_zip_from_apps_dir; compression=ZIP_DEFLATED; compresslevel=1; policy=balanced_size_speed; entries=360; size_bytes=38357020 (36.6 MB); path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_packs\legacy_flet_system_20260510-0.1.0.zip |
| pass | registration_copy.inspect_app_pack_required_entries | 0.0 | measured_duration_seconds=0.002; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_packs\legacy_flet_system_20260510-0.1.0.zip |
| pass | registration_copy.sha256_app_pack | 0.0 | measured_duration_seconds=0.030; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_packs\legacy_flet_system_20260510-0.1.0.zip |
| pass | registration_copy.manifest_update_after_pack | 0.0 | measured_duration_seconds=0.001; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_manifest.json |
| pass | registration_copy.package_app_pack_total | 0.0 | measured_duration_seconds=2.215 |
| pass | registration_copy.copy_pack_to_output_mirror | 0.0 | measured_duration_seconds=0.013; path=C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\app_pack |
| pass | 承認前チェック | 0.104 |  |
| not_applicable | 結果再読み込み | 0.0 | GUI result refresh is measured in the launcher after CLI completion. |

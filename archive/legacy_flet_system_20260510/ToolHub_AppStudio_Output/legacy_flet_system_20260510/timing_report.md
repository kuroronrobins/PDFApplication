# App Studio Timing Report

- app_id: `legacy_flet_system_20260510`
- action: `apply`
- generated_at: `2026-05-11T06:25:30`
- estimated_total_seconds: `72`
- actual_total_seconds: `119.693`
- prediction_error_seconds: `47.693`
- prediction_source: `history`
- wall_clock_total_seconds: `119.693`
- cli_measured_total_seconds: `119.105`
- unmeasured_overhead_seconds: `0.588`
- total_duration_seconds: `119.105`

| Status | Phase | Duration sec | Detail |
| --- | --- | ---: | --- |
| pass | 事前確認 | 0.0 | CLI options and normal registration policy were validated. |
| pass | ファイル棚卸し | 0.154 |  |
| pass | 秘密情報検査 | 0.024 |  |
| pass | 依存関係解析 | 0.0 |  |
| pass | メタデータ生成 | 0.0 |  |
| pass | アイコン生成 | 76.907 |  |
| pass | 登録成果物の作成 | 0.116 |  |
| pass | ビルド用環境の作成と依存インストール | 1.192 |  |
| hit | build_env_cache | 0.0 | cache_hit=True; cache_miss_reason=none; cache_key=0baf5ac840363007fc657747ab91a3a583f2679f77c0d3dcf2409bab016c6e25; pip_cache_dir=C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pip |
| skipped | 依存関係インストール | 0.0 | Dependency install skipped because cached build_env was reused. |
| pass | requirements.lock 生成 | 0.767 |  |
| pass | ビルドツールインストール | 0.541 |  |
| hit | build_tools_cache | 0.0 | Build tool install skipped because installed versions satisfy requested specs. |
| included | PyInstaller 確認 | 0.0 | PyInstaller probe is executed inside the frozen-folder build phase and reported in frozen_folder_build_report.md. |
| pass | PyInstaller frozen-folder build | 31.918 |  |
| pass | 配布物検証 | 4.708 |  |
| pass | 登録コピーと App Pack 作成 | 2.668 |  |
| pass | registration_copy.backup_existing_app_move | 0.0 | measured_duration_seconds=0.003; strategy=move_existing_app_directory; backup_path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\backups\app_studio\20260511_062727\legacy_flet_system_20260510\app; files=359; bytes=73307286 (69.9 MB) |
| pass | registration_copy.backup_manifest | 0.0 | measured_duration_seconds=0.001; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_manifest.json |
| pass | registration_copy.backup_existing_total | 0.0 | measured_duration_seconds=0.025 |
| pass | registration_copy.remove_existing_app | 0.0 | measured_duration_seconds=0.000; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\apps\legacy_flet_system_20260510 |
| pass | registration_copy.copy_final_app_to_apps | 0.0 | measured_duration_seconds=0.372; files=359; bytes=73307432 (69.9 MB) |
| pass | registration_copy.manifest_update_before_pack | 0.0 | measured_duration_seconds=0.001; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_manifest.json |
| pass | registration_copy.load_manifest_for_pack | 0.0 | measured_duration_seconds=0.000; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_manifest.json |
| pass | registration_copy.validate_app_pack_inputs | 0.0 | measured_duration_seconds=0.004; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\apps\legacy_flet_system_20260510 |
| pass | registration_copy.remove_existing_app_pack | 0.0 | measured_duration_seconds=0.006; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_packs\legacy_flet_system_20260510-0.1.0.zip |
| pass | registration_copy.compress_app_pack | 0.0 | measured_duration_seconds=2.186; strategy=direct_zip_from_apps_dir; compression=ZIP_DEFLATED; compresslevel=1; policy=balanced_size_speed; entries=360; size_bytes=38357277 (36.6 MB); path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_packs\legacy_flet_system_20260510-0.1.0.zip |
| pass | registration_copy.inspect_app_pack_required_entries | 0.0 | measured_duration_seconds=0.002; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_packs\legacy_flet_system_20260510-0.1.0.zip |
| pass | registration_copy.sha256_app_pack | 0.0 | measured_duration_seconds=0.034; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_packs\legacy_flet_system_20260510-0.1.0.zip |
| pass | registration_copy.manifest_update_after_pack | 0.0 | measured_duration_seconds=0.001; path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_manifest.json |
| pass | registration_copy.package_app_pack_total | 0.0 | measured_duration_seconds=2.234 |
| pass | registration_copy.copy_pack_to_output_mirror | 0.0 | measured_duration_seconds=0.016; path=C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\app_pack |
| pass | 承認前チェック | 0.11 |  |
| not_applicable | 結果再読み込み | 0.0 | GUI result refresh is measured in the launcher after CLI completion. |

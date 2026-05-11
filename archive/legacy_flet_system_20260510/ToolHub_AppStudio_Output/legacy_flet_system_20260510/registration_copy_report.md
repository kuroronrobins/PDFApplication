# Registration Copy Report

- app_id: `legacy_flet_system_20260510`
- top_level_recorded_seconds: `2.618`
- leaf_recorded_seconds: `2.617`
- safety: App Pack structure, required-entry inspection, SHA256 calculation, and manifest update are preserved.
- backup_strategy: `move_existing_app_directory`
- backup_safety_note: Existing apps/<app_id> is moved under backups/app_studio before replacement; release/app_manifest.json is copied beside it for manual rollback.
- app_pack_strategy: `direct_zip_from_apps_dir`
- app_pack_compression_policy: `balanced_size_speed`
- app_pack_compression_policy_note: Use ZIP_DEFLATED compresslevel=1 for every normal App Studio registration. This keeps release/update payloads materially smaller than uncompressed zip while avoiding the slower high-compression levels.
- app_pack_distribution_note: App Pack generation never skips required-entry inspection, SHA256 calculation, or manifest updates; larger uncompressed App Packs would increase release storage and update transfer size.
- app_pack_zip_compression: `ZIP_DEFLATED`
- app_pack_zip_compresslevel: `1`
- rejected_backup_options: zip backup is dominated by compression time; App Pack only backup does not preserve a divergent apps tree.
- rejected_app_pack_options: ZIP_STORED: fastest, but produces much larger App Packs and update payloads.; ZIP_DEFLATED level 0: valid in Python zipfile, but effectively uncompressed and larger without distribution benefit.; ZIP_DEFLATED level 6 or 9: smaller than level 1, but slower and not enough smaller to justify as the default registration path.; app-specific compression switching: rejected to keep one standard App Pack generation path.

| Step | Status | Seconds | Detail |
| --- | --- | ---: | --- |
| `backup_existing_total` | `pass` | 0.000 |  |
| `remove_existing_app` | `pass` | 0.000 | path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\apps\legacy_flet_system_20260510 |
| `copy_final_app_to_apps` | `pass` | 0.389 | files=359; bytes=73307432 (69.9 MB) |
| `manifest_update_before_pack` | `pass` | 0.001 | path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_manifest.json |
| `load_manifest_for_pack` | `pass` | 0.000 | path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_manifest.json |
| `validate_app_pack_inputs` | `pass` | 0.004 | path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\apps\legacy_flet_system_20260510 |
| `remove_existing_app_pack` | `pass` | 0.000 | path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_packs\legacy_flet_system_20260510-0.1.0.zip |
| `compress_app_pack` | `pass` | 2.177 | strategy=direct_zip_from_apps_dir; compression=ZIP_DEFLATED; compresslevel=1; policy=balanced_size_speed; entries=360; size_bytes=38357020 (36.6 MB); path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_packs\legacy_flet_system_20260510-0.1.0.zip |
| `inspect_app_pack_required_entries` | `pass` | 0.002 | path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_packs\legacy_flet_system_20260510-0.1.0.zip |
| `sha256_app_pack` | `pass` | 0.030 | path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_packs\legacy_flet_system_20260510-0.1.0.zip |
| `manifest_update_after_pack` | `pass` | 0.001 | path=C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\release\app_manifest.json |
| `package_app_pack_total` | `pass` | 2.215 |  |
| `copy_pack_to_output_mirror` | `pass` | 0.013 | path=C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\app_pack |

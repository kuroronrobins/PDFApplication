# Build Plan

- app_id: `legacy_flet_system_20260510`
- name: `Legacy Flet System 20260510`
- selected_mode: `frozen-folder`
- runner: `exe`
- entry: `bin/legacy_flet_system_20260510/legacy_flet_system_20260510.exe`

## Reasons

- BuildMode was explicitly set to frozen-folder.

## Warnings

- Frozen-folder uses PyInstaller --onedir or an equivalent folder build.
- Use PyInstaller --onedir or equivalent. --onefile is not the ToolHub standard.

## frozen-folder Notes

- Build with a folder-based frozen output such as PyInstaller `--onedir`.
- Do not use `--onefile` as the standard packaging path.
- Expected executable after future build: `bin/legacy_flet_system_20260510/legacy_flet_system_20260510.exe`

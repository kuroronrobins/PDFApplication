# Build Plan

- app_id: `app_20251123_excelbatchreplace`
- name: `20251123 ExcelBatchReplace`
- selected_mode: `frozen-folder`
- runner: `exe`
- entry: `bin/app_20251123_excelbatchreplace/app_20251123_excelbatchreplace.exe`

## Reasons

- Many Python modules were detected: 13.

## Warnings

- Frozen-folder uses PyInstaller --onedir or an equivalent folder build.
- Use PyInstaller --onedir or equivalent. --onefile is not the ToolHub standard.

## frozen-folder Notes

- Build with a folder-based frozen output such as PyInstaller `--onedir`.
- Do not use `--onefile` as the standard packaging path.
- Expected executable after future build: `bin/app_20251123_excelbatchreplace/app_20251123_excelbatchreplace.exe`

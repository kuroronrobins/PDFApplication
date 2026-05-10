# Build Plan

- app_id: `app_20260215_pdfapplication`
- name: `PDF編集`
- selected_mode: `frozen-folder`
- runner: `exe`
- entry: `bin/app_20260215_pdfapplication/app_20260215_pdfapplication.exe`

## Reasons

- BuildMode was explicitly set to frozen-folder.

## Warnings

- Frozen-folder uses PyInstaller --onedir or an equivalent folder build.
- Use PyInstaller --onedir or equivalent. --onefile is not the ToolHub standard.

## frozen-folder Notes

- Build with a folder-based frozen output such as PyInstaller `--onedir`.
- Do not use `--onefile` as the standard packaging path.
- Expected executable after future build: `bin/app_20260215_pdfapplication/app_20260215_pdfapplication.exe`

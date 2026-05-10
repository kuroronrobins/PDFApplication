# Frozen Folder Build Report

- app_id: `legacy_flet_system_20260510`
- status: `PASS`
- expected_entry: `bin/legacy_flet_system_20260510/legacy_flet_system_20260510.exe`
- expected_exe: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\bin\legacy_flet_system_20260510\legacy_flet_system_20260510.exe`
- actual_exe: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\bin\legacy_flet_system_20260510\legacy_flet_system_20260510.exe`
- exe_path: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\bin\legacy_flet_system_20260510\legacy_flet_system_20260510.exe`
- selected_python: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\Scripts\python.exe`
- build_env_python: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\Scripts\python.exe`
- pyinstaller_probe_python: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\Scripts\python.exe`
- pyinstaller_build_python: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\Scripts\python.exe`
- pyinstaller_version: `6.20.0`
- working_directory: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510`
- pyinstaller_artifacts: `distpath=C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pyi\d, workpath=C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pyi\b, specpath=C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pyi\s`
- pyinstaller_layout: `--onedir --contents-directory .`
- contents_directory_dot: `True`
- no_user_site: `false`

## Execution Trace

```json
{
  "app_studio_cli_path": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release\\tools\\app_studio\\main.py",
  "app_studio_policy_id": "normal_python_source_to_frozen_folder_build_env_v3",
  "registration_policy": "user-distribution",
  "repo_root": "C:\\Users\\kuroron\\Documents\\RD\\20260426_Toolhub\\launcher\\src-tauri\\target\\release",
  "git_commit": "ba7f326",
  "main_py_hash": "ab3f8cc4599d07d19888c93aa253e43ba7bd6978b49923cc590f0a33452a3c82",
  "frozen_folder_builder_hash": "013fd7b68cfb7622a8f4166e34f7885e08b8cb18051d3d98ae034416bdc1f237",
  "argv": [],
  "normalized_options": {},
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

## Commands

- `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\Scripts\python.exe -m PyInstaller --version`
- `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\Scripts\python.exe -m PyInstaller --noconfirm --onedir --clean --contents-directory . --name legacy_flet_system_20260510 --distpath C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pyi\d --workpath C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pyi\b --specpath C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pyi\s --paths C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\pdf_app --hidden-import __init__ --hidden-import models --hidden-import pdf_app.__init__ --hidden-import pdf_app.models --hidden-import pdf_app.services.__init__ --hidden-import pdf_app.services.business --hidden-import pdf_app.services.common --hidden-import pdf_app.services.convert --hidden-import pdf_app.services.github_log_sink --hidden-import pdf_app.services.header_footer --hidden-import pdf_app.services.page_workspace --hidden-import pdf_app.services.pdf_ops --hidden-import pdf_app.services.text_edit --hidden-import pdf_app.services.usage_log --hidden-import services.__init__ --hidden-import services.business --hidden-import services.common --hidden-import services.convert --hidden-import services.github_log_sink --hidden-import services.header_footer --hidden-import services.page_workspace --hidden-import services.pdf_ops --hidden-import services.text_edit --hidden-import services.usage_log --hidden-import flet_desktop --collect-all flet --collect-all flet_desktop --add-data C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\sanitized_data\000_pdf_app_services;pdf_app/services C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\app.py`

## Payload Sanitizer

- add_data_entries: `1`
- staged_directories: `1`
- excluded_generated_files: `10`

| Status | Source | Destination | Included | Excluded | Reason |
| --- | --- | --- | ---: | ---: | --- |
| staged | `pdf_app/services` | `pdf_app/services` | 10 | 10 | directory add_data sanitized before PyInstaller |

## Output

```text

utput\\legacy_flet_system_20260510\\be\\Lib\\site-packages\\PyInstaller\\hooks\\rthooks'
24950 INFO: Including run-time hook 'pyi_rth_multiprocessing.py' from 'C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\be\\Lib\\site-packages\\PyInstaller\\hooks\\rthooks'
24952 INFO: Including run-time hook 'pyi_rth_setuptools.py' from 'C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\be\\Lib\\site-packages\\PyInstaller\\hooks\\rthooks'
24953 INFO: Including run-time hook 'pyi_rth_pywintypes.py' from 'C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\be\\Lib\\site-packages\\_pyinstaller_hooks_contrib\\rthooks'
24954 INFO: Including run-time hook 'pyi_rth_pythoncom.py' from 'C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\be\\Lib\\site-packages\\_pyinstaller_hooks_contrib\\rthooks'
24971 INFO: Creating base_library.zip...
24993 INFO: Looking for dynamic libraries
26500 INFO: Extra DLL search directories (AddDllDirectory): []
26500 INFO: Extra DLL search directories (PATH): []
26928 INFO: Warnings written to C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pyi\b\legacy_flet_system_20260510\warn-legacy_flet_system_20260510.txt
27053 INFO: Graph cross-reference written to C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pyi\b\legacy_flet_system_20260510\xref-legacy_flet_system_20260510.html
27133 INFO: checking PYZ
27133 INFO: Building PYZ because PYZ-00.toc is non existent
27133 INFO: Building PYZ (ZlibArchive) C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pyi\b\legacy_flet_system_20260510\PYZ-00.pyz
28381 INFO: Building PYZ (ZlibArchive) C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pyi\b\legacy_flet_system_20260510\PYZ-00.pyz completed successfully.
28416 INFO: checking PKG
28416 INFO: Building PKG because PKG-00.toc is non existent
28416 INFO: Building PKG (CArchive) legacy_flet_system_20260510.pkg
28496 INFO: Building PKG (CArchive) legacy_flet_system_20260510.pkg completed successfully.
28499 INFO: Bootloader C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\Lib\site-packages\PyInstaller\bootloader\Windows-64bit-intel\run.exe
28500 INFO: checking EXE
28500 INFO: Building EXE because EXE-00.toc is non existent
28500 INFO: Building EXE from EXE-00.toc
28500 INFO: Copying bootloader EXE to C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pyi\b\legacy_flet_system_20260510\legacy_flet_system_20260510.exe
28616 INFO: Copying icon to EXE
28707 INFO: Copying 0 resources to EXE
28707 INFO: Embedding manifest in EXE
28799 INFO: Appending PKG archive to EXE
29161 INFO: Fixing EXE headers
29833 INFO: Building EXE from EXE-00.toc completed successfully.
29845 INFO: checking COLLECT
29845 INFO: Building COLLECT because COLLECT-00.toc is non existent
29846 INFO: Building COLLECT COLLECT-00.toc
30656 INFO: Building COLLECT COLLECT-00.toc completed successfully.
30665 INFO: Build complete! The results are available in: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pyi\d
```

## Environment Summary

- PYTHONNOUSERSITE: `false`
- PATH entries: `33`

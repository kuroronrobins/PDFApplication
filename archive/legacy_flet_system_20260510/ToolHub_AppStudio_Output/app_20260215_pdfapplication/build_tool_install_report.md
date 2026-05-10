# Build Tool Install Report

- app_id: `app_20260215_pdfapplication`
- status: `PASS`
- app_env_path: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_env`
- python_path: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_env\Scripts\python.exe`
- python_source: `build_env`

## Notes

- Installing build-only dependencies into internal build_env.
- Build tools are not written to requirements.lock.
- Packages: PyInstaller>=6,<7, pyinstaller-hooks-contrib>=2024.0
- pip_cache_dir: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_tmp\pip_cache
- pip probe for build tools: exit_code=0
command: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_env\Scripts\python.exe -m pip --version
stdout:
pip 24.3.1 from C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_env\Lib\site-packages\pip (python 3.13)
stderr:

- build tool version check: [{"installed_version": "", "package": "PyInstaller", "satisfied": false, "spec": "PyInstaller>=6,<7"}, {"installed_version": "", "package": "pyinstaller-hooks-contrib", "satisfied": false, "spec": "pyinstaller-hooks-contrib>=2024.0"}]
- pip install build tools: exit_code=0
command: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_env\Scripts\python.exe -m pip install --disable-pip-version-check PyInstaller>=6,<7 pyinstaller-hooks-contrib>=2024.0
stdout:
Collecting PyInstaller<7,>=6
  Using cached pyinstaller-6.20.0-py3-none-win_amd64.whl.metadata (8.5 kB)
Collecting pyinstaller-hooks-contrib>=2024.0
  Using cached pyinstaller_hooks_contrib-2026.5-py3-none-any.whl.metadata (16 kB)
Collecting altgraph (from PyInstaller<7,>=6)
  Using cached altgraph-0.17.5-py2.py3-none-any.whl.metadata (7.5 kB)
Collecting packaging>=22.0 (from PyInstaller<7,>=6)
  Using cached packaging-26.2-py3-none-any.whl.metadata (3.5 kB)
Collecting pefile>=2022.5.30 (from PyInstaller<7,>=6)
  Using cached pefile-2024.8.26-py3-none-any.whl.metadata (1.4 kB)
Collecting pywin32-ctypes>=0.2.1 (from PyInstaller<7,>=6)
  Using cached pywin32_ctypes-0.2.3-py3-none-any.whl.metadata (3.9 kB)
Collecting setuptools>=42.0.0 (from PyInstaller<7,>=6)
  Using cached setuptools-82.0.1-py3-none-any.whl.metadata (6.5 kB)
Using cached pyinstaller-6.20.0-py3-none-win_amd64.whl (1.4 MB)
Using cached pyinstaller_hooks_contrib-2026.5-py3-none-any.whl (457 kB)
Using cached packaging-26.2-py3-none-any.whl (100 kB)
Using cached pefile-2024.8.26-py3-none-any.whl (74 kB)
Using cached pywin32_ctypes-0.2.3-py3-none-any.whl (30 kB)
Using cached setuptools-82.0.1-py3-none-any.whl (1.0 MB)
Using cached altgraph-0.17.5-py2.py3-none-any.whl (21 kB)
Installing collected packages: altgraph, setuptools, pywin32-ctypes, pefile, packaging, pyinstaller-hooks-contrib, PyInstaller
Successfully installed PyInstaller-6.20.0 altgraph-0.17.5 packaging-26.2 pefile-2024.8.26 pyinstaller-hooks-contrib-2026.5 pywin32-ctypes-0.2.3 setuptools-82.0.1
stderr:

- build tool version check: [{"installed_version": "6.20.0", "package": "PyInstaller", "satisfied": true, "spec": "PyInstaller>=6,<7"}, {"installed_version": "2026.5", "package": "pyinstaller-hooks-contrib", "satisfied": true, "spec": "pyinstaller-hooks-contrib>=2024.0"}]

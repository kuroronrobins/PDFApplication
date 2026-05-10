# Build Env Report

- app_id: `legacy_flet_system_20260510`
- status: `PASS`
- app_env_path: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be`
- python_path: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\Scripts\python.exe`
- python_source: `toolhub_runtime_python`

## Notes

- This is an internal build environment for PyInstaller.
- It is not a user-facing app_env and must not be packaged into final_app, App Pack, release, or runtime/app_envs.
- build_env_cache_hit: False
- build_env_cache_miss_reason: cache key mismatch
- cache_key: 0baf5ac840363007fc657747ab91a3a583f2679f77c0d3dcf2409bab016c6e25
- cache_metadata: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\toolhub_build_env_cache.json
- pip_cache_dir: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\bt\pip
- Base Python source: toolhub_runtime_python
- Base Python: C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\runtime\python\python.exe
- Base Python version: Python 3.13.2
- venv create: exit_code=0
command: C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\runtime\python\python.exe -m venv C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be
stdout:

stderr:

- pip probe: exit_code=0
command: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\Scripts\python.exe -m pip --version
stdout:
pip 24.3.1 from C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\Lib\site-packages\pip (python 3.13)
stderr:

- pip install app requirements: exit_code=0
command: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\Scripts\python.exe -m pip install --disable-pip-version-check -r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\requirements.txt
stdout:
ve\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\requirements.txt (line 1))
  Using cached oauthlib-3.3.1-py3-none-any.whl.metadata (7.9 kB)
Collecting httpx>=0.28.1 (from flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\requirements.txt (line 1))
  Using cached httpx-0.28.1-py3-none-any.whl.metadata (7.1 kB)
Collecting repath>=0.9.0 (from flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\requirements.txt (line 1))
  Using cached repath-0.9.0-py3-none-any.whl.metadata (899 bytes)
Collecting msgpack>=1.1.0 (from flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\requirements.txt (line 1))
  Using cached msgpack-1.1.2-cp313-cp313-win_amd64.whl.metadata (8.4 kB)
Collecting anyio (from httpx>=0.28.1->flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\requirements.txt (line 1))
  Using cached anyio-4.13.0-py3-none-any.whl.metadata (4.5 kB)
Collecting certifi (from httpx>=0.28.1->flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\requirements.txt (line 1))
  Using cached certifi-2026.4.22-py3-none-any.whl.metadata (2.5 kB)
Collecting httpcore==1.* (from httpx>=0.28.1->flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\requirements.txt (line 1))
  Using cached httpcore-1.0.9-py3-none-any.whl.metadata (21 kB)
Collecting idna (from httpx>=0.28.1->flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\requirements.txt (line 1))
  Downloading idna-3.14-py3-none-any.whl.metadata (8.0 kB)
Collecting h11>=0.16 (from httpcore==1.*->httpx>=0.28.1->flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\requirements.txt (line 1))
  Using cached h11-0.16.0-py3-none-any.whl.metadata (8.3 kB)
Collecting six>=1.9.0 (from repath>=0.9.0->flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\final_app\requirements.txt (line 1))
  Using cached six-1.17.0-py2.py3-none-any.whl.metadata (1.7 kB)
Using cached flet-0.85.0-py3-none-any.whl (579 kB)
Using cached pypdf-6.11.0-py3-none-any.whl (338 kB)
Using cached pymupdf-1.27.2.3-cp310-abi3-win_amd64.whl (19.2 MB)
Using cached pywin32-311-cp313-cp313-win_amd64.whl (9.5 MB)
Using cached httpx-0.28.1-py3-none-any.whl (73 kB)
Using cached httpcore-1.0.9-py3-none-any.whl (78 kB)
Using cached msgpack-1.1.2-cp313-cp313-win_amd64.whl (72 kB)
Using cached oauthlib-3.3.1-py3-none-any.whl (160 kB)
Using cached repath-0.9.0-py3-none-any.whl (4.7 kB)
Using cached six-1.17.0-py2.py3-none-any.whl (11 kB)
Using cached anyio-4.13.0-py3-none-any.whl (114 kB)
Downloading idna-3.14-py3-none-any.whl (72 kB)
Using cached certifi-2026.4.22-py3-none-any.whl (135 kB)
Using cached h11-0.16.0-py3-none-any.whl (37 kB)
Installing collected packages: pywin32, six, pypdf, PyMuPDF, oauthlib, msgpack, idna, h11, certifi, repath, httpcore, anyio, httpx, flet
Successfully installed PyMuPDF-1.27.2.3 anyio-4.13.0 certifi-2026.4.22 flet-0.85.0 h11-0.16.0 httpcore-1.0.9 httpx-0.28.1 idna-3.14 msgpack-1.1.2 oauthlib-3.3.1 pypdf-6.11.0 pywin32-311 repath-0.9.0 six-1.17.0
stderr:

- Framework runtime package check: {"flet": "0.85.0", "flet-desktop": ""}
- pip install framework runtime packages: exit_code=0
command: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\archive\legacy_flet_system_20260510\ToolHub_AppStudio_Output\legacy_flet_system_20260510\be\Scripts\python.exe -m pip install --disable-pip-version-check flet-desktop==0.85.0
stdout:
Collecting flet-desktop==0.85.0
  Using cached flet_desktop-0.85.0-py3-none-any.whl.metadata (790 bytes)
Requirement already satisfied: flet==0.85.0 in c:\users\kuroron\documents\rd\20260215_pdfapplication\archive\legacy_flet_system_20260510\toolhub_appstudio_output\legacy_flet_system_20260510\be\lib\site-packages (from flet-desktop==0.85.0) (0.85.0)
Requirement already satisfied: oauthlib>=3.2.2 in c:\users\kuroron\documents\rd\20260215_pdfapplication\archive\legacy_flet_system_20260510\toolhub_appstudio_output\legacy_flet_system_20260510\be\lib\site-packages (from flet==0.85.0->flet-desktop==0.85.0) (3.3.1)
Requirement already satisfied: httpx>=0.28.1 in c:\users\kuroron\documents\rd\20260215_pdfapplication\archive\legacy_flet_system_20260510\toolhub_appstudio_output\legacy_flet_system_20260510\be\lib\site-packages (from flet==0.85.0->flet-desktop==0.85.0) (0.28.1)
Requirement already satisfied: repath>=0.9.0 in c:\users\kuroron\documents\rd\20260215_pdfapplication\archive\legacy_flet_system_20260510\toolhub_appstudio_output\legacy_flet_system_20260510\be\lib\site-packages (from flet==0.85.0->flet-desktop==0.85.0) (0.9.0)
Requirement already satisfied: msgpack>=1.1.0 in c:\users\kuroron\documents\rd\20260215_pdfapplication\archive\legacy_flet_system_20260510\toolhub_appstudio_output\legacy_flet_system_20260510\be\lib\site-packages (from flet==0.85.0->flet-desktop==0.85.0) (1.1.2)
Requirement already satisfied: anyio in c:\users\kuroron\documents\rd\20260215_pdfapplication\archive\legacy_flet_system_20260510\toolhub_appstudio_output\legacy_flet_system_20260510\be\lib\site-packages (from httpx>=0.28.1->flet==0.85.0->flet-desktop==0.85.0) (4.13.0)
Requirement already satisfied: certifi in c:\users\kuroron\documents\rd\20260215_pdfapplication\archive\legacy_flet_system_20260510\toolhub_appstudio_output\legacy_flet_system_20260510\be\lib\site-packages (from httpx>=0.28.1->flet==0.85.0->flet-desktop==0.85.0) (2026.4.22)
Requirement already satisfied: httpcore==1.* in c:\users\kuroron\documents\rd\20260215_pdfapplication\archive\legacy_flet_system_20260510\toolhub_appstudio_output\legacy_flet_system_20260510\be\lib\site-packages (from httpx>=0.28.1->flet==0.85.0->flet-desktop==0.85.0) (1.0.9)
Requirement already satisfied: idna in c:\users\kuroron\documents\rd\20260215_pdfapplication\archive\legacy_flet_system_20260510\toolhub_appstudio_output\legacy_flet_system_20260510\be\lib\site-packages (from httpx>=0.28.1->flet==0.85.0->flet-desktop==0.85.0) (3.14)
Requirement already satisfied: h11>=0.16 in c:\users\kuroron\documents\rd\20260215_pdfapplication\archive\legacy_flet_system_20260510\toolhub_appstudio_output\legacy_flet_system_20260510\be\lib\site-packages (from httpcore==1.*->httpx>=0.28.1->flet==0.85.0->flet-desktop==0.85.0) (0.16.0)
Requirement already satisfied: six>=1.9.0 in c:\users\kuroron\documents\rd\20260215_pdfapplication\archive\legacy_flet_system_20260510\toolhub_appstudio_output\legacy_flet_system_20260510\be\lib\site-packages (from repath>=0.9.0->flet==0.85.0->flet-desktop==0.85.0) (1.17.0)
Using cached flet_desktop-0.85.0-py3-none-any.whl (6.2 kB)
Installing collected packages: flet-desktop
Successfully installed flet-desktop-0.85.0
stderr:

- Installed framework runtime package: flet-desktop==0.85.0

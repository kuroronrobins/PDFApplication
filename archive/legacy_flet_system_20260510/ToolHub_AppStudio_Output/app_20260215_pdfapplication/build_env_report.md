# Build Env Report

- app_id: `app_20260215_pdfapplication`
- status: `PASS`
- app_env_path: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_env`
- python_path: `C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_env\Scripts\python.exe`
- python_source: `toolhub_runtime_python`

## Notes

- This is an internal build environment for PyInstaller.
- It is not a user-facing app_env and must not be packaged into final_app, App Pack, release, or runtime/app_envs.
- build_env_cache_hit: False
- build_env_cache_miss_reason: cache key mismatch
- cache_key: b8ce135e88e96758ab597d37ea1105ccce3d2ae442d06506c2409c32407a48a7
- cache_metadata: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_env\toolhub_build_env_cache.json
- pip_cache_dir: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_tmp\pip_cache
- Base Python source: toolhub_runtime_python
- Base Python: C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\runtime\python\python.exe
- Base Python version: Python 3.13.2
- venv create: exit_code=0
command: C:\Users\kuroron\Documents\RD\20260426_Toolhub\launcher\src-tauri\target\release\runtime\python\python.exe -m venv C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_env
stdout:

stderr:

- pip probe: exit_code=0
command: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_env\Scripts\python.exe -m pip --version
stdout:
pip 24.3.1 from C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_env\Lib\site-packages\pip (python 3.13)
stderr:

- pip install app requirements: exit_code=0
command: C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\build_env\Scripts\python.exe -m pip install --disable-pip-version-check -r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\final_app\requirements.txt
stdout:
pplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\final_app\requirements.txt (line 4))
  Using cached pywin32-311-cp313-cp313-win_amd64.whl.metadata (10 kB)
Collecting oauthlib>=3.2.2 (from flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\final_app\requirements.txt (line 1))
  Using cached oauthlib-3.3.1-py3-none-any.whl.metadata (7.9 kB)
Collecting httpx>=0.28.1 (from flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\final_app\requirements.txt (line 1))
  Using cached httpx-0.28.1-py3-none-any.whl.metadata (7.1 kB)
Collecting repath>=0.9.0 (from flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\final_app\requirements.txt (line 1))
  Using cached repath-0.9.0-py3-none-any.whl.metadata (899 bytes)
Collecting msgpack>=1.1.0 (from flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\final_app\requirements.txt (line 1))
  Using cached msgpack-1.1.2-cp313-cp313-win_amd64.whl.metadata (8.4 kB)
Collecting anyio (from httpx>=0.28.1->flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\final_app\requirements.txt (line 1))
  Using cached anyio-4.13.0-py3-none-any.whl.metadata (4.5 kB)
Collecting certifi (from httpx>=0.28.1->flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\final_app\requirements.txt (line 1))
  Using cached certifi-2026.4.22-py3-none-any.whl.metadata (2.5 kB)
Collecting httpcore==1.* (from httpx>=0.28.1->flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\final_app\requirements.txt (line 1))
  Using cached httpcore-1.0.9-py3-none-any.whl.metadata (21 kB)
Collecting idna (from httpx>=0.28.1->flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\final_app\requirements.txt (line 1))
  Using cached idna-3.13-py3-none-any.whl.metadata (8.0 kB)
Collecting h11>=0.16 (from httpcore==1.*->httpx>=0.28.1->flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\final_app\requirements.txt (line 1))
  Using cached h11-0.16.0-py3-none-any.whl.metadata (8.3 kB)
Collecting six>=1.9.0 (from repath>=0.9.0->flet>=0.23.2->-r C:\Users\kuroron\Documents\RD\20260215_PDFApplication\ToolHub_AppStudio_Output\app_20260215_pdfapplication\final_app\requirements.txt (line 1))
  Using cached six-1.17.0-py2.py3-none-any.whl.metadata (1.7 kB)
Downloading flet-0.85.0-py3-none-any.whl (579 kB)
   --------------------------------------- 579.7/579.7 kB 66.1 kB/s eta 0:00:00
Downloading pypdf-6.11.0-py3-none-any.whl (338 kB)
Using cached pymupdf-1.27.2.3-cp310-abi3-win_amd64.whl (19.2 MB)
Using cached pywin32-311-cp313-cp313-win_amd64.whl (9.5 MB)
Using cached httpx-0.28.1-py3-none-any.whl (73 kB)
Using cached httpcore-1.0.9-py3-none-any.whl (78 kB)
Using cached msgpack-1.1.2-cp313-cp313-win_amd64.whl (72 kB)
Using cached oauthlib-3.3.1-py3-none-any.whl (160 kB)
Using cached repath-0.9.0-py3-none-any.whl (4.7 kB)
Using cached six-1.17.0-py2.py3-none-any.whl (11 kB)
Using cached anyio-4.13.0-py3-none-any.whl (114 kB)
Using cached idna-3.13-py3-none-any.whl (68 kB)
Using cached certifi-2026.4.22-py3-none-any.whl (135 kB)
Using cached h11-0.16.0-py3-none-any.whl (37 kB)
Installing collected packages: pywin32, six, pypdf, PyMuPDF, oauthlib, msgpack, idna, h11, certifi, repath, httpcore, anyio, httpx, flet
Successfully installed PyMuPDF-1.27.2.3 anyio-4.13.0 certifi-2026.4.22 flet-0.85.0 h11-0.16.0 httpcore-1.0.9 httpx-0.28.1 idna-3.13 msgpack-1.1.2 oauthlib-3.3.1 pypdf-6.11.0 pywin32-311 repath-0.9.0 six-1.17.0
stderr:


# 2026-05-16 PyMuPDF Diagnostic Output Hardening

## Scope

Investigated and fixed a load failure for a valid PDF that PyMuPDF can render, but that emits recoverable MuPDF structure-tree diagnostics before the worker JSON response.

## Changed files

- `src-python/pdf_workbench_engine/services/pdf_document.py`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`
- `docs/reports/2026-05-16-mupdf-diagnostic-output-hardening.md`

## User-visible behavior

- The reported PDF now loads through the active worker thumbnail path.
- Recoverable MuPDF diagnostics no longer corrupt the worker stdout JSON protocol.
- Actual worker errors still return through the normal JSON error envelope.

## Root cause

The PDF itself was readable and not encrypted. `pypdf` inspected it successfully, and PyMuPDF rendered all pages successfully. During thumbnail rendering, MuPDF printed recoverable diagnostics such as `No common ancestor in structure tree` to stdout before the JSON payload. Rust parses the entire worker stdout as JSON, so the extra diagnostic lines made a successful worker process look like a load failure.

## Verification commands

```powershell
$env:PDF_TARGET = (Get-Item -LiteralPath '<reported Downloads PDF>').FullName
$env:PYTHONIOENCODING = 'utf-8'
# Ran the active pdf_workbench_engine.cli worker with inspect_pdf and render_thumbnails payloads.
```

Result:

- `inspect_pdf`: return code 0, stdout parsed as JSON, 18 pages, not encrypted.
- `render_thumbnails`: return code 0, stdout parsed as JSON, generated 18 thumbnail/preview entries.
- `stderr`: empty for both worker calls.
- Temporary verification thumbnails were deleted after the run.

```powershell
python -m compileall src-python\pdf_workbench_engine
```

Result: success.

```powershell
npm run typecheck
```

Result: success.

```powershell
npm run build
```

Result: the first sandboxed run failed with Vite `spawn EPERM`; rerunning the same command outside the sandbox succeeded.

## Screenshot paths

None. This was a backend worker protocol fix.

## Known limitations

- This change suppresses PyMuPDF's direct display of MuPDF warnings/errors to stdout. If future debugging needs the original warning text, it should be collected separately and forwarded through structured logs rather than printed before the JSON response.

## Next recommended step

Open the reported PDF in the Tauri app and confirm the file card expands normally in the full desktop UI.

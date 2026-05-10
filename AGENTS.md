# AGENTS.md

## 1. Project Mission

This repository is the new Tauri-based rebuild of the PDF application. Codex agents must build **PDF Workbench**, a polished desktop PDF workflow app where users can add PDF/Office files, arrange them as file cards, expand files into page thumbnails, visually split/delete/reorder/decorate pages, and export the whole workspace as one batch job.

The source of truth for the product direction is:

- `docs/tauri_ui_redesign_plan.md`
- `docs/processing_engine_plan.md`
- `docs/assets/ui_mockups/`
- `docs/development_process.md`

The old Flet/Python system is archived only for reference:

- `archive/legacy_flet_system_20260510/`

Do not mix old application files back into the new root. Do not build new features inside `archive/`.

## 2. Non-Negotiable UI Requirements

- No left sidebar.
- No permanent large right-side settings panel.
- The app must be a one-screen central workbench.
- Default workspace view is **one file = one grouped file card**.
- Page thumbnails are shown only after a file card is expanded.
- File-card drag and drop changes merge order.
- Expanded page drag and drop changes page order and may move pages across file boundaries.
- Scissors tool inserts split lines between pages.
- Trash tool marks pages as excluded from output, not physically deleted.
- Header, footer, page number, and watermark tools are placed directly onto page hot zones.
- Tool settings appear in compact floating panels near the selected target.
- Bottom output bar always shows planned output count, output names, progress, and log access.
- Detailed logs are hidden by default and shown only in the bottom log drawer.
- UI density must work at 1366x768 while still looking like paid desktop software.

## 3. Office File Policy

Excel, Word, and PowerPoint files must be accepted as first-class input files.

Behavior:

- Office files appear immediately as draggable file cards.
- Office file cards can be reordered, excluded, and included in export before conversion completes.
- Office files are converted to temporary PDF cache in the background.
- Cache is **session-only**. Do not persist converted PDFs for reuse across app restarts.
- Cache must be removed on app exit, workspace reset, source-file update, or conversion-setting change.
- Office conversion should run one file at a time by default for stability.
- If the user expands an unready Office card, that conversion receives priority.
- Full page editing is enabled only after the temporary PDF is ready.

States:

- `queued`: waiting for PDF conversion
- `converting`: PDF conversion in progress
- `ready`: temporary PDF is ready
- `error`: conversion failed
- `stale`: source or settings changed; reconversion required

## 3.1 Current Implementation Boundary

As of 2026-05-11, the React/Tauri workbench implements the full UI, state model, session-cache command boundary, export-job progress model, logs, visual verification screens for Phases 0-11, the first real processing-engine connection in Phase 12, and streaming/cancel support for the active export worker process.

Do not overclaim this as a completed production PDF engine. The current backend still needs real PDF/Office processing integration for:

- Full cancellation for pre-export Office/PDF preparation jobs
- Real Microsoft Office COM verification for Word/Excel/PowerPoint
- Python runtime and dependency packaging for end-user PCs
- Large-PDF lazy thumbnail generation
- Full input-password unlock UX

The accepted processing direction is:

- Use Microsoft Office COM only for Office-to-PDF conversion. Do not add LibreOffice fallback unless the user explicitly changes this decision.
- Accept Microsoft Office as a runtime dependency.
- Reuse the archived Python service logic as the first production processing engine, but do not import or execute files from `archive/` at runtime.
- Port reviewed processing code into the active `src-python/pdf_workbench_engine/` structure documented in `docs/processing_engine_plan.md`; do not import `archive/` at runtime.
- Keep Rust/Tauri responsible for job orchestration, session cache management, progress events, worker launch, and error normalization.
- Implement search/replace as position detection plus visual overwrite/redaction, not full PDF text-object reconstruction.

When implementing those items, connect them behind explicit Tauri job/cache commands and update `docs/implementation_roadmap.md` and `docs/reports/` in the same change.

## 4. Legacy Archive Rules

The archive is reference-only.

Allowed:

- Read archived files to understand existing PDF operations.
- Copy small, reviewed algorithmic ideas into new code.
- Reference ToolHub reports for release-quality expectations.

Forbidden:

- Moving files from `archive/` back into the root as-is.
- Reintroducing Flet UI.
- Adding new implementation files under `archive/`.
- Treating old `ToolHub_AppStudio_Output` as active build output.
- Reusing archived generated cache/build artifacts in the new product.

If old Python PDF services are reused, wrap them behind a new, explicit bridge in the new architecture and document the boundary.

## 5. Expected Architecture

Initial implementation should prefer:

- Frontend: React + TypeScript + Vite 8
- Desktop shell: Tauri v2
- Icons: `lucide-react`
- State: lightweight store such as Zustand
- PDF preview: PDF.js or an equivalent proven PDF renderer
- Backend: Tauri commands for filesystem, process, job, and cache control
- Office/PDF processing: isolated worker or CLI boundary; never block the UI thread

Keep the code modular:

- `src/`: frontend application
- `src/components/`: reusable UI components
- `src/features/workbench/`: file cards, page timeline, tools, output preview
- `src/features/jobs/`: progress, log drawer, export orchestration
- `src/features/cache/`: Office temporary PDF cache state
- `src-python/pdf_workbench_engine/`: active Python worker for Office COM conversion and PDF byte processing
- `src-tauri/`: Tauri commands and desktop integration
- `docs/`: design, process, reports, screenshots

If the actual scaffold uses different paths, update this file and `docs/development_process.md` in the same change.

## 6. ToolHub-Inspired Deliverable Discipline

Every substantial change must leave evidence, similar to ToolHub output discipline.

For each milestone, create or update:

- A short implementation note in `docs/reports/`
- A verification note with commands run and results
- Screenshots for UI-affecting work, saved under `docs/reports/screenshots/`
- Any known risks or skipped checks

Do not claim completion without evidence.

Minimum report fields:

- Scope
- Changed files
- User-visible behavior
- Verification commands
- Screenshot paths, when UI changed
- Known limitations
- Next recommended step

## 7. Quality Gates

Before a feature is considered done:

- TypeScript type check passes.
- Lint passes if configured.
- Unit tests pass if configured.
- Tauri/frontend build passes when feasible.
- UI changes are opened in the browser or Tauri dev view and visually checked.
- 1366x768 layout is checked for overlap, clipping, and unusable density.
- Drag interactions are checked with real pointer behavior when implemented.
- No new code writes durable Office PDF cache files unless explicitly part of an export.
- No old Flet UI dependencies are added to active app code.

If a check cannot run, write why in the final response and in the relevant report.

## 8. Development Rules for Codex

- Start every task by reading `docs/tauri_ui_redesign_plan.md` and this file when the task touches app behavior or UI.
- Prefer existing documented decisions over new invention.
- If a request conflicts with the design plan, update the design document first or explicitly note the conflict.
- Keep root clean. New build/cache output should go under ignored build directories, not arbitrary root folders.
- Use `apply_patch` for manual file edits.
- Do not use destructive git commands unless explicitly requested.
- Do not revert user changes.
- Do not edit generated mockup images unless the user asks.
- Keep implementation scoped to the requested milestone.
- For frontend UI, use icons for tools rather than text-heavy buttons.
- Avoid marketing-style pages; the first screen must be the usable workbench.

## 9. Definition of Done

A task is done only when:

- The requested behavior is implemented or the blocker is clearly documented.
- Documentation that future Codex runs need has been updated.
- Verification has been run or explicitly marked as not run with reason.
- Any generated artifacts required for review are stored under `docs/`.
- Final response lists changed files and verification outcome.

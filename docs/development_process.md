# Development Process

## 1. Purpose

This process keeps PDF Workbench development predictable for Codex and humans. It combines the confirmed UI direction with ToolHub-style evidence: every milestone should define scope, produce concrete files, run checks, and leave a short report.

## 2. Source Of Truth

Read these before implementation work:

1. `AGENTS.md`
2. `docs/tauri_ui_redesign_plan.md`
3. `docs/implementation_roadmap.md`
4. `docs/assets/ui_mockups/`
5. Relevant archived reference code under `archive/legacy_flet_system_20260510/`, only when PDF behavior needs clarification

The design document decides product behavior. `AGENTS.md` decides how Codex should work in this repository.
`docs/implementation_roadmap.md` decides the active task order and should be updated whenever the backlog changes.

## 3. Milestone Flow

Each milestone follows the same flow.

### 3.1 Define

Create or update a short milestone note in `docs/reports/`.
Check `docs/implementation_roadmap.md` first and mark which Phase/Task IDs are in scope.

Required fields:

- Goal
- Roadmap task IDs
- In scope
- Out of scope
- Acceptance criteria
- Risk notes

### 3.2 Implement

Keep changes scoped. Prefer vertical slices that can be visually tested.

Recommended order:

1. Project scaffold and build baseline
2. Static one-screen workbench shell
3. File card model and file import UI
4. File-card drag reorder
5. Session-only Office PDF cache job model
6. File expansion and page thumbnails
7. Page drag reorder and file-boundary handling
8. Scissors split markers
9. Trash exclusion
10. Direct page decoration tools
11. Search/replace, lock, and info tools
12. Batch export orchestration
13. Progress bar and log drawer
14. Packaging and release-readiness checks

### 3.3 Verify

Run the strongest checks available for the current scaffold.

Typical checks:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run tauri build`
- Visual check at 1366x768
- Visual check at 1920x1080

If a command is unavailable, record that fact instead of inventing success.

### 3.4 Capture Evidence

For UI changes:

- Save screenshots to `docs/reports/screenshots/`.
- Include at least 1366x768 for dense layout changes.
- Check no text or controls overlap.
- Check drag previews and insertion guides when drag behavior changes.

For backend/job changes:

- Include command output summary.
- Include sample job log or JSON event where useful.
- Confirm temporary cache cleanup behavior.

### 3.5 Report

Add or update a milestone report in `docs/reports/`.

Template:

```md
# Milestone Report: <name>

## Scope

## Roadmap Tasks

## Changed Files

## User-Visible Behavior

## Verification

## Screenshots

## Known Limitations

## Next Step
```

## 3.6 Update Roadmap

After each milestone:

- Mark completed task IDs in `docs/implementation_roadmap.md` by moving them into the current status or noting completion in the phase section.
- Add newly discovered tasks to the appropriate phase.
- If the phase order changes, explain why in the milestone report.

## 4. Acceptance Criteria By Area

### 4.1 Workbench Shell

- No left sidebar.
- No permanent large right settings panel.
- Top app bar, tool bar, central workspace, and bottom output/log bar are visible at 1366x768.
- First screen is the actual app, not a landing page.

### 4.2 File Cards

- Each input file is one grouped card by default.
- File drag uses a visible ghost preview and insertion guide.
- Office files show cache state.
- PDF files can become ready immediately when metadata/summaries are available.

### 4.3 Office Temporary Cache

- Office file addition does not block basic file-card editing.
- Conversion progresses in the background.
- Conversion is session-only and cleaned up on reset/exit.
- Unready Office cards cannot enter full page editing without a clear waiting/progress state.

### 4.4 Page Editing

- Expanded files show page thumbnails.
- Pages can be reordered.
- Page movement across file boundaries is supported when visible.
- Folded file cards preserve page edits.

### 4.5 Scissors And Trash

- Scissors can be placed between pages.
- Split markers update output count immediately.
- Trash marks pages excluded, with visible greyed state.
- Exclusion is undoable.

### 4.6 Decoration Tools

- Header, footer, page number, and watermark are placed directly on page hot zones.
- Settings are edited with a compact floating panel.
- Scope can be selected: all pages, selected pages, or this output group.

### 4.7 Export And Logs

- Export runs as a single batch job from workspace state.
- Bottom bar shows stage, progress, and output plan.
- Detailed logs are hidden by default and visible in a bottom drawer.
- Errors attach to the relevant file/page/job and offer retry or exclusion where appropriate.

## 5. Release Readiness

Before distribution:

- Dependency lock file exists.
- Build artifacts are reproducible.
- Runtime assets are declared.
- Secret scan has no blocking findings.
- Execution test reaches final checks.
- Human approval is recorded if release tooling requires it.
- App metadata is present and accurate.

ToolHub reference reports are archived at:

- `archive/legacy_flet_system_20260510/ToolHub_AppStudio_Output/app_20260215_pdfapplication/`

Use them as examples of evidence and release gates, not as active build output.

## 6. Reporting Naming Convention

Use date-prefixed reports:

- `docs/reports/2026-05-10-milestone-name.md`

Use screenshot names that describe the state:

- `docs/reports/screenshots/2026-05-10-workbench-1366x768.png`
- `docs/reports/screenshots/2026-05-10-export-log-drawer.png`

## 7. Change Control

When a product decision changes:

1. Update `docs/tauri_ui_redesign_plan.md`.
2. Update `docs/implementation_roadmap.md` if the task order or remaining work changes.
3. Update `AGENTS.md` if the instruction affects future Codex behavior.
4. Update this process document if the workflow or gates change.
5. Mention the decision in the final response.

# Startup Splash A Picture Adoption

## Scope

Replace only the startup splash hero picture with the previously selected A direction.

## Changed Files

- `public/splashscreen.html`
- `public/assets/splash-workbench-a.png`
- `docs/tauri_ui_redesign_plan.md`
- `docs/implementation_roadmap.md`
- `docs/reports/2026-05-13-startup-splash-a-picture.md`
- `docs/reports/screenshots/2026-05-13-startup-splash-a-picture.png`

## User-Visible Behavior

- The startup mini window now uses the earlier A-direction premium glass desk / PDF workbench picture.
- The picture is cropped to emphasize the document work surface and avoid making the lock motif the main visual signal.
- The existing splash behavior, license row, version row, spinner, and rotating startup status line are unchanged.

## Verification Commands

- `npm run typecheck`: passed.
- Headless Edge screenshot of `public/splashscreen.html`: generated after rerunning outside the sandbox because headless Edge was blocked by Windows sandbox permissions.
- `npm run build`: sandbox blocked Vite config loading with `spawn EPERM`; rerun outside sandbox passed.

## Screenshot

- `docs/reports/screenshots/2026-05-13-startup-splash-a-picture.png`

## Known Limitations

- This change updates only the static startup picture. Startup telemetry is still the lightweight local rotating status line.
- The source concept image remains in the Codex generated image cache; the repository stores only the cropped app asset.

## Next Recommended Step

- Re-check the release executable startup flow on the target PC after the next full Tauri build.

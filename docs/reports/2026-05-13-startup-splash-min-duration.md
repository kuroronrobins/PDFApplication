# 2026-05-13 Startup Splash Minimum Display Duration

## Scope

- Keep the startup splash visible long enough to be perceived even when the application initializes very quickly.

## Changed Files

- `src-tauri/src/lib.rs`
- `docs/implementation_roadmap.md`
- `docs/reports/2026-05-13-startup-splash-min-duration.md`

## User-Visible Behavior

- The splash window remains visible for at least 4 seconds from application launch.
- If startup preparation takes longer than 4 seconds, the main window opens as soon as preparation is complete.
- The splash artwork and layout are unchanged.

## Verification Commands

- `cargo fmt --check`
- `cargo check`
- `npm run typecheck`
- `npm run tauri build`

## Screenshot Paths

- Visual asset unchanged; existing screenshot remains `docs/reports/screenshots/2026-05-13-startup-splash-a-picture.png`.

## Known Limitations

- The build verifies code and packaging. Human timing perception should be confirmed by launching the regenerated installer build on the target PC.

## Next Recommended Step

- Install or launch the regenerated build and confirm the splash remains visible for roughly 4 seconds before the main workbench appears.

# 2026-05-13 Installer Japanese Alpha Text

## Scope

- Localize installer-facing text to Japanese.
- Make it clear that the distributed build is a limited alpha version.
- Keep the application product identity stable as `PDF Workbench`.

## Changed Files

- `src-tauri/tauri.conf.json`
- `src-tauri/installer/alpha-notice-ja.txt`
- `src-tauri/installer/nsis/Japanese.nsh`
- `src-tauri/installer/wix/ja-JP.wxl`
- `docs/implementation_roadmap.md`
- `docs/reports/2026-05-13-installer-japanese-alpha-text.md`

## User-Visible Behavior

- NSIS installer language is Japanese.
- NSIS custom maintenance/WebView2/runtime messages are Japanese.
- MSI locale is configured as Japanese.
- The installer shows an alpha notice before installation through the shared license/notice file.
- Publisher and copyright metadata are set to `koki kurokawa`.

## Verification Commands

- `node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8')); console.log('tauri config ok')"`: passed.
- `npm run typecheck`: passed.
- `cargo check`: passed.
- `npm run tauri build`: passed and regenerated the release exe plus NSIS/MSI bundles.
- Generated NSIS source inspection: passed.
  - `src-tauri/target/release/nsis/x64/installer.nsi` includes Japanese language setup, `koki kurokawa` metadata, and the license/alpha notice page.
  - `src-tauri/target/release/nsis/x64/Japanese.nsh` includes the Japanese custom installer strings.
- Generated WiX source inspection: passed.
  - `src-tauri/target/release/wix/x64/main.wxs` includes `Manufacturer="koki kurokawa"` and the generated license RTF.
  - `src-tauri/target/release/wix/x64/locale.wxl` includes the Japanese locale strings.

## Generated Installers

- `src-tauri/target/release/bundle/nsis/PDF Workbench_0.1.0_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/PDF Workbench_0.1.0_x64_ja-JP.msi`

## Screenshot Paths

- Not captured because the installer GUI was not launched during this change.

## Known Limitations

- Installer UI text is verified through generated NSIS/WiX source inspection and build success. Final visual confirmation should be done by launching the regenerated installer on the target Windows workflow.

## Next Recommended Step

- Open the regenerated NSIS installer and confirm the welcome, alpha notice, install, and finish screens read naturally in Japanese.

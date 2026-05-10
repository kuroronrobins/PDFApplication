# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

datas = [('C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\ToolHub_AppStudio_Output\\legacy_flet_system_20260510\\bt\\sanitized_data\\000_pdf_app_services', 'pdf_app/services')]
binaries = []
hiddenimports = ['__init__', 'models', 'pdf_app.__init__', 'pdf_app.models', 'pdf_app.services.__init__', 'pdf_app.services.business', 'pdf_app.services.common', 'pdf_app.services.convert', 'pdf_app.services.github_log_sink', 'pdf_app.services.header_footer', 'pdf_app.services.page_workspace', 'pdf_app.services.pdf_ops', 'pdf_app.services.text_edit', 'pdf_app.services.usage_log', 'services.__init__', 'services.business', 'services.common', 'services.convert', 'services.github_log_sink', 'services.header_footer', 'services.page_workspace', 'services.pdf_ops', 'services.text_edit', 'services.usage_log', 'flet_desktop']
tmp_ret = collect_all('flet')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('flet_desktop')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\app.py'],
    pathex=['C:\\Users\\kuroron\\Documents\\RD\\20260215_PDFApplication\\archive\\legacy_flet_system_20260510\\pdf_app'],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='legacy_flet_system_20260510',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    contents_directory='.',
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='legacy_flet_system_20260510',
)

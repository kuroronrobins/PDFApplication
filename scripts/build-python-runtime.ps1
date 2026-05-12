$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Python = if ($env:PDF_WORKBENCH_BUILD_PYTHON) { $env:PDF_WORKBENCH_BUILD_PYTHON } else { "python" }
$RuntimeRoot = Join-Path $ProjectRoot "build\python-runtime\python"

$InfoJson = & $Python -c "import json, site, sys; print(json.dumps({'base_prefix': sys.base_prefix, 'executable': sys.executable, 'usersite': site.getusersitepackages()}))"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to inspect build Python."
}
$Info = $InfoJson | ConvertFrom-Json
$Base = [string]$Info.base_prefix
$UserSite = [string]$Info.usersite

if (-not (Test-Path -LiteralPath (Join-Path $Base "python.exe"))) {
  throw "Build Python executable was not found under $Base"
}

if (Test-Path -LiteralPath $RuntimeRoot) {
  Remove-Item -LiteralPath $RuntimeRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null

$RootFiles = @(
  "python.exe",
  "pythonw.exe",
  "python3.dll",
  "python313.dll",
  "vcruntime140.dll",
  "vcruntime140_1.dll",
  "LICENSE.txt"
)

foreach ($file in $RootFiles) {
  $source = Join-Path $Base $file
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination $RuntimeRoot -Force
  }
}

foreach ($dir in @("DLLs", "Lib")) {
  $source = Join-Path $Base $dir
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $RuntimeRoot $dir) -Recurse -Force
  }
}

$TargetSite = Join-Path $RuntimeRoot "Lib\site-packages"
New-Item -ItemType Directory -Force -Path $TargetSite | Out-Null

$PackagePatterns = @(
  "pypdf",
  "pypdf-*.dist-info",
  "fitz",
  "pymupdf",
  "pymupdf-*.dist-info",
  "win32",
  "win32com",
  "win32comext",
  "win32ctypes",
  "pywin32_system32",
  "pywin32-*.dist-info",
  "pywin32_ctypes-*.dist-info",
  "pythoncom.py",
  "pywin32.pth",
  "pywin32.version.txt",
  "pywin32_bootstrap.py",
  "Pythonwin"
)

foreach ($pattern in $PackagePatterns) {
  Get-ChildItem -Path $UserSite -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $TargetSite -Recurse -Force
  }
}

Get-ChildItem -Path $RuntimeRoot -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

& (Join-Path $RuntimeRoot "python.exe") -E -s -c "import pypdf, fitz, win32com.client, pythoncom; print('bundled python runtime ok')"
if ($LASTEXITCODE -ne 0) {
  throw "Bundled Python runtime smoke test failed."
}

Write-Host "Built bundled Python runtime: $RuntimeRoot"

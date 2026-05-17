$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$TemplateRoot = Join-Path $ProjectRoot "toolhub\pdf_workbench"
$ReleaseRoot = Join-Path $ProjectRoot "src-tauri\target\release"
$StageRoot = Join-Path $ProjectRoot "build\toolhub-registration\pdf_workbench"
$PayloadRoot = Join-Path $StageRoot "assets\payload"

if (-not (Test-Path -LiteralPath $TemplateRoot -PathType Container)) {
  throw "ToolHub launcher template was not found: $TemplateRoot"
}

$ReleaseExe = Join-Path $ReleaseRoot "pdf-workbench.exe"
if (-not (Test-Path -LiteralPath $ReleaseExe -PathType Leaf)) {
  throw "Release executable was not found. Run npm run tauri build first: $ReleaseExe"
}

if (Test-Path -LiteralPath $StageRoot) {
  Remove-Item -LiteralPath $StageRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $StageRoot | Out-Null
New-Item -ItemType Directory -Force -Path $PayloadRoot | Out-Null

foreach ($ItemName in @("main.py", "requirements.txt", ".toolhubignore", "README.md", "app.yaml.example", "pdf_workbench_toolhub")) {
  $SourceItem = Join-Path $TemplateRoot $ItemName
  if (-not (Test-Path -LiteralPath $SourceItem)) {
    throw "ToolHub template item was not found: $SourceItem"
  }
  Copy-Item -LiteralPath $SourceItem -Destination $StageRoot -Recurse -Force
}

Copy-Item -LiteralPath $ReleaseExe -Destination (Join-Path $PayloadRoot "pdf-workbench.exe") -Force

foreach ($DirName in @("src-python", "python", "resources")) {
  $Source = Join-Path $ReleaseRoot $DirName
  if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
    throw "Release payload directory was not found: $Source"
  }
  Copy-Item -LiteralPath $Source -Destination (Join-Path $PayloadRoot $DirName) -Recurse -Force
}

$PruneRelativeDirs = @(
  "python\Lib\test",
  "python\Lib\ensurepip",
  "python\Lib\site-packages\pip",
  "python\Lib\site-packages\pymupdf\mupdf-devel",
  "python\Lib\site-packages\win32\Demos",
  "python\Lib\site-packages\win32com\demos",
  "python\Lib\site-packages\win32ctypes\tests"
)
foreach ($RelativeDir in $PruneRelativeDirs) {
  $Target = Join-Path $PayloadRoot $RelativeDir
  if (Test-Path -LiteralPath $Target -PathType Container) {
    Remove-Item -LiteralPath $Target -Recurse -Force
  }
}
Get-ChildItem -LiteralPath (Join-Path $PayloadRoot "python\Lib\site-packages") -Directory -Filter "pip-*.dist-info" -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Get-ChildItem -LiteralPath $StageRoot -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -LiteralPath $StageRoot -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Extension -in @(".pyc", ".pyo") } |
  Remove-Item -Force -ErrorAction SilentlyContinue

$IconSource = Join-Path $ProjectRoot "src-tauri\icons\icon.png"
if (Test-Path -LiteralPath $IconSource -PathType Leaf) {
  Copy-Item -LiteralPath $IconSource -Destination (Join-Path $StageRoot "icon.png") -Force
}

$Manifest = [ordered]@{
  appId = "pdf_workbench"
  stagedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  stageRoot = $StageRoot
  payloadExe = Join-Path $PayloadRoot "pdf-workbench.exe"
  smokeCommand = "python main.py --toolhub-smoke"
  launchCommand = "python main.py --window main"
}
$Manifest | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 (Join-Path $StageRoot "toolhub-stage-manifest.json")

Write-Host "Staged ToolHub app source: $StageRoot"
Write-Host "Run smoke check from the staged folder:"
Write-Host "  python main.py --toolhub-smoke"

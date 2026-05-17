$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PackageJsonPath = Join-Path $ProjectRoot "package.json"
$PackageJson = Get-Content -Raw -Path $PackageJsonPath | ConvertFrom-Json
$Version = [string]$PackageJson.version

if ([string]::IsNullOrWhiteSpace($Version)) {
  throw "package.json version is empty."
}

$StageRoot = Join-Path $ProjectRoot "build\release-artifacts\v$Version"
if (Test-Path -LiteralPath $StageRoot) {
  Remove-Item -LiteralPath $StageRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $StageRoot | Out-Null

$Artifacts = @(
  @{
    Label = "release executable"
    Path = "src-tauri\target\release\pdf-workbench.exe"
  },
  @{
    Label = "NSIS installer"
    Path = "src-tauri\target\release\bundle\nsis\PDF Workbench_${Version}_x64-setup.exe"
  },
  @{
    Label = "MSI installer"
    Path = "src-tauri\target\release\bundle\msi\PDF Workbench_${Version}_x64_ja-JP.msi"
  }
)

foreach ($Artifact in $Artifacts) {
  $Source = Join-Path $ProjectRoot $Artifact.Path
  if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
    throw "$($Artifact.Label) was not found: $Source"
  }

  Copy-Item -LiteralPath $Source -Destination $StageRoot -Force
  Write-Host "Staged $($Artifact.Label): $Source"
}

Write-Host "Release artifacts staged in: $StageRoot"

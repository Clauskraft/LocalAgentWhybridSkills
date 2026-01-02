$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$toolsDir = Join-Path $root "tools\\rg"
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

$arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()

switch ($arch) {
  "arm64" { $asset = "ripgrep-15.1.0-aarch64-pc-windows-msvc.zip" }
  "x64"   { $asset = "ripgrep-15.1.0-x86_64-pc-windows-msvc.zip" }
  default { throw "Unsupported architecture: $arch" }
}

$uri = "https://github.com/BurntSushi/ripgrep/releases/download/15.1.0/$asset"
$zip = Join-Path $toolsDir "ripgrep.zip"

Write-Host "Downloading $uri"
Invoke-WebRequest -Uri $uri -OutFile $zip -UseBasicParsing

Write-Host "Extracting to $toolsDir"
Expand-Archive -Path $zip -DestinationPath $toolsDir -Force

$rgExe = Get-ChildItem -Path $toolsDir -Recurse -Filter "rg.exe" | Select-Object -First 1
if (-not $rgExe) { throw "rg.exe not found after unzip" }

$target = Join-Path $toolsDir "rg.exe"
Copy-Item -Force $rgExe.FullName $target

Write-Host "Installed ripgrep:"
Write-Host "  $target"
& $target --version



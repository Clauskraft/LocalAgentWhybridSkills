#!/usr/bin/env pwsh
param(
  [string]$RepoRoot,
  [string]$WebUrl = "http://127.0.0.1:5175/"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
}

function New-Shortcut {
  param(
    [Parameter(Mandatory=$true)][string]$ShortcutPath,
    [Parameter(Mandatory=$true)][string]$TargetPath,
    [string]$Arguments = "",
    [string]$WorkingDirectory = "",
    [string]$IconLocation = ""
  )

  $shell = New-Object -ComObject WScript.Shell
  $sc = $shell.CreateShortcut($ShortcutPath)
  $sc.TargetPath = $TargetPath
  if ($Arguments) { $sc.Arguments = $Arguments }
  if ($WorkingDirectory) { $sc.WorkingDirectory = $WorkingDirectory }
  if ($IconLocation) { $sc.IconLocation = $IconLocation }
  $sc.Save()
}

function Find-DesktopExe {
  param([string]$RepoRootPath)
  $distRoots = @(
    (Join-Path $RepoRootPath "apps\\desktop\\dist-electron"),
    (Join-Path $RepoRootPath "apps\\desktop\\dist-electron2")
  ) | Where-Object { Test-Path $_ }

  if (-not $distRoots -or $distRoots.Count -eq 0) { return $null }

  # Prefer unpacked win output (arm64/x64) and pick the newest app exe at depth 1
  $candidates = $distRoots | ForEach-Object {
    Get-ChildItem -Path $_ -Recurse -Filter *.exe -ErrorAction SilentlyContinue
  } |
    Where-Object {
      $_.FullName -match "win-.*-unpacked" -and
      $_.Name -notin @("chrome_elf.exe","electron.exe","squirrel.exe","update.exe")
    } |
    Sort-Object LastWriteTime -Descending

  return ($candidates | Select-Object -First 1)
}

$desktopDir = [Environment]::GetFolderPath("Desktop")
if (-not $desktopDir) { throw "Could not resolve Desktop folder." }

Write-Host "RepoRoot: $RepoRoot"
Write-Host "Desktop:  $desktopDir"

# 1) Web shortcut
$webLnk = Join-Path $desktopDir "SCA-01 Web.lnk"
$webArgs = ('/c start "" "{0}"' -f $WebUrl)
New-Shortcut `
  -ShortcutPath $webLnk `
  -TargetPath $env:ComSpec `
  -Arguments $webArgs `
  -WorkingDirectory $RepoRoot
Write-Host "Created:  $webLnk"

# 2) Desktop app shortcut (built exe preferred; dev fallback)
$desktopExe = Find-DesktopExe -RepoRootPath $RepoRoot
$desktopLnk = Join-Path $desktopDir "SCA-01 Desktop.lnk"
if ($desktopExe) {
  New-Shortcut `
    -ShortcutPath $desktopLnk `
    -TargetPath $desktopExe.FullName `
    -WorkingDirectory $desktopExe.DirectoryName `
    -IconLocation $desktopExe.FullName
  Write-Host ("Created:  {0} -> {1}" -f $desktopLnk, $desktopExe.FullName)
} else {
  # Dev fallback if no build artifacts exist yet
  New-Shortcut `
    -ShortcutPath $desktopLnk `
    -TargetPath "pwsh.exe" `
    -Arguments ("-NoExit -Command `"cd `"$RepoRoot`"; npm run desktop`"") `
    -WorkingDirectory $RepoRoot
  Write-Host ("Created:  {0} -> dev runner" -f $desktopLnk)
}

# 3) CLI shortcut
$cliLnk = Join-Path $desktopDir "SCA-01 CLI.lnk"
New-Shortcut `
  -ShortcutPath $cliLnk `
  -TargetPath "pwsh.exe" `
  -Arguments ("-NoExit -Command `"cd `"$RepoRoot`"; npm run cli:doctor; npm run cli`"") `
  -WorkingDirectory $RepoRoot `
  -IconLocation "pwsh.exe"
Write-Host "Created:  $cliLnk"

Write-Host "Done."



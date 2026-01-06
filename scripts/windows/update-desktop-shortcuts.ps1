$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  $here = Split-Path -Parent $PSScriptRoot
  # scripts/windows -> scripts -> repo root
  return (Resolve-Path (Join-Path $here "..")).Path
}

function New-OrUpdate-Shortcut {
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
  $sc.Arguments = $Arguments
  if ($WorkingDirectory -and (Test-Path $WorkingDirectory)) { $sc.WorkingDirectory = $WorkingDirectory }
  if ($IconLocation) { $sc.IconLocation = $IconLocation }
  $sc.Save()
}

$repoRoot = Get-RepoRoot
$desktopDir = [Environment]::GetFolderPath("DesktopDirectory")
if (-not $desktopDir) { throw "Could not resolve DesktopDirectory" }

$webUrl = "https://sca-01-web-production.up.railway.app"

# Desktop app exe (prefer packaged build if present)
$desktopExe = Get-ChildItem -Path (Join-Path $repoRoot "apps\\desktop\\dist-electron") -Recurse -File -Filter "*.exe" -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -eq "SCA-01 The Finisher.exe" } |
  Select-Object -First 1

if (-not $desktopExe) {
  # Fallback to dev start (opens a terminal)
  $desktopTarget = (Get-Command pwsh).Source
  $desktopArgs = "-NoExit -Command `"cd '$repoRoot'; npm --prefix apps/desktop run start`""
  $desktopWorkDir = $repoRoot
  $desktopIcon = ""
} else {
  $desktopTarget = $desktopExe.FullName
  $desktopArgs = ""
  $desktopWorkDir = $desktopExe.DirectoryName
  $desktopIcon = $desktopExe.FullName
}

# CLI shortcut (opens terminal at repo root)
$cliTarget = (Get-Command pwsh).Source
$cliArgs = "-NoExit -Command `"cd '$repoRoot'; npm --prefix apps/cli run sca`""
$cliWorkDir = $repoRoot

# Web shortcut (opens default browser)
$webTarget = (Get-Command pwsh).Source
$webArgs = "-NoProfile -WindowStyle Hidden -Command `"Start-Process '$webUrl'`""

New-OrUpdate-Shortcut -ShortcutPath (Join-Path $desktopDir "SCA-01 Web.lnk") -TargetPath $webTarget -Arguments $webArgs -WorkingDirectory $repoRoot
New-OrUpdate-Shortcut -ShortcutPath (Join-Path $desktopDir "SCA-01 Desktop App.lnk") -TargetPath $desktopTarget -Arguments $desktopArgs -WorkingDirectory $desktopWorkDir -IconLocation $desktopIcon
# Back-compat name (older shortcut)
New-OrUpdate-Shortcut -ShortcutPath (Join-Path $desktopDir "SCA-01 Desktop.lnk") -TargetPath $desktopTarget -Arguments $desktopArgs -WorkingDirectory $desktopWorkDir -IconLocation $desktopIcon
New-OrUpdate-Shortcut -ShortcutPath (Join-Path $desktopDir "SCA-01 CLI.lnk") -TargetPath $cliTarget -Arguments $cliArgs -WorkingDirectory $cliWorkDir

Write-Host "Updated shortcuts on Desktop:"
Write-Host " - $(Join-Path $desktopDir 'SCA-01 Web.lnk')"
Write-Host " - $(Join-Path $desktopDir 'SCA-01 Desktop App.lnk')"
Write-Host " - $(Join-Path $desktopDir 'SCA-01 CLI.lnk')"
Write-Host ""
Write-Host "Repo root: $repoRoot"
if ($desktopExe) { Write-Host "Desktop app target: $($desktopExe.FullName)" } else { Write-Host "Desktop app target: (dev) pwsh + npm start" }
Write-Host "Web URL: $webUrl"


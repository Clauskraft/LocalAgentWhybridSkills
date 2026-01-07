$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "SCA-01 The Finisher.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "C:\Users\claus\Projects\Local_Agent\apps\desktop\dist-electron\win-arm64-unpacked\SCA-01 The Finisher.exe"
$Shortcut.WorkingDirectory = "C:\Users\claus\Projects\Local_Agent\apps\desktop\dist-electron\win-arm64-unpacked"
$Shortcut.Description = "SCA-01 The Finisher - AI Agent Desktop"
$Shortcut.Save()
Write-Host "Desktop shortcut created: $ShortcutPath"

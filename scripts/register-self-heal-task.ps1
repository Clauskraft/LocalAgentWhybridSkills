# 🤖 Register CI Self-Healing Task for Windows Task Scheduler
# Run this script as Administrator to set up hourly self-healing

$TaskName = "ROMA-CI-SelfHeal"
$ScriptPath = "C:\Users\claus\Projects\Local_Agent\scripts\missions\run-ci-self-heal.ts"
$WorkingDir = "C:\Users\claus\Projects\WidgeTDC_fresh"

# Create the action (run the self-healing script)
$Action = New-ScheduledTaskAction -Execute "node" `
    -Argument "--import tsx `"$ScriptPath`"" `
    -WorkingDirectory $WorkingDir

# Create the trigger (every hour)
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration ([TimeSpan]::MaxValue)

# Create settings
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

# Register the task
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "ROMA CI/CD Self-Healing Mission - Automatically detects and repairs GitHub workflow failures"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ ROMA CI Self-Healing Task Registered!"
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "   Task Name: $TaskName"
Write-Host "   Runs: Every hour"
Write-Host "   Working Dir: $WorkingDir"
Write-Host ""
Write-Host "   To view: Get-ScheduledTask -TaskName '$TaskName'"
Write-Host "   To run now: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "   To remove: Unregister-ScheduledTask -TaskName '$TaskName'"
Write-Host ""

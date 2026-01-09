# scripts/mcp_health_check.ps1
# Registers a Windows Scheduled Task that checks the MCP health endpoint every 5 minutes.

$taskName = "MCPHealthCheck"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -Command \"Invoke-WebRequest -Uri http://localhost:3001/api/mcp/status -UseBasicParsing | Out-Null\""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration ([TimeSpan]::MaxValue)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register the task (overwrite if exists)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force

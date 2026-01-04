#!/usr/bin/env pwsh
param(
  [int]$Port = 5175,
  [string]$CloudApiBaseUrl = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Building web UI (apps/web)..." -ForegroundColor Cyan
pwsh -NoProfile -Command "npm --prefix apps/web run build"

Write-Host "" 
Write-Host "Starting PROD web server on http://127.0.0.1:$Port" -ForegroundColor Green
Write-Host "Note: port 3000 is often used by Docker on Windows; default is 5175." -ForegroundColor Yellow

# Use cmd to set env vars reliably in this environment
$cmd = "set PORT=$Port&& node apps/web/server.mjs"
if ($CloudApiBaseUrl) {
  $cmd = "set PORT=$Port&& set CLOUD_API_BASE_URL=$CloudApiBaseUrl&& node apps/web/server.mjs"
}

cmd /c $cmd



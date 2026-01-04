#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Run($cmd) {
  Write-Host ""
  Write-Host "==> $cmd" -ForegroundColor Cyan
  pwsh -NoProfile -Command $cmd
}

Run "npm run install:all"

# Cloud
Run "npm --prefix services/cloud run build"
Run "npm --prefix services/cloud run lint"
Run "npm --prefix services/cloud run test"
Run "npm --prefix services/cloud audit --audit-level=high"

# Web
Run "npm --prefix apps/web run typecheck"
Run "npm --prefix apps/web run lint"
Run "npm --prefix apps/web run build"
Run "npm --prefix apps/web run test:smoke:ci"
Run "npm --prefix apps/web audit --audit-level=high"

# Desktop
Run "npm --prefix apps/desktop run typecheck"
Run "npm --prefix apps/desktop run lint"
Run "npm --prefix apps/desktop run test"
Run "npm --prefix apps/desktop run build"
Run "npm --prefix apps/desktop audit --audit-level=high"

# CLI
Run "npm --prefix apps/cli run build"
Run "npm --prefix apps/cli run lint"
Run "npm --prefix apps/cli run test"

Write-Host ""
Write-Host "All gates completed." -ForegroundColor Green



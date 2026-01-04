# SCA-01 Release Script
# Builds and publishes a new version to GitHub Releases

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("patch", "minor", "major")]
    [string]$VersionBump = "patch",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 SCA-01 Release Script" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Check for GH_TOKEN
if (-not $env:GH_TOKEN -and -not $env:GITHUB_TOKEN) {
    Write-Host "❌ Error: GH_TOKEN or GITHUB_TOKEN environment variable required" -ForegroundColor Red
    Write-Host "Set it with: `$env:GH_TOKEN = '<github_token>'" -ForegroundColor Yellow
    exit 1
}

# Navigate to project root
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Get current version
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$currentVersion = $packageJson.version
Write-Host "📦 Current version: $currentVersion" -ForegroundColor White

# Calculate new version
$parts = $currentVersion.Split('.')
switch ($VersionBump) {
    "major" { 
        $parts[0] = [int]$parts[0] + 1
        $parts[1] = "0"
        $parts[2] = "0"
    }
    "minor" { 
        $parts[1] = [int]$parts[1] + 1
        $parts[2] = "0"
    }
    "patch" { 
        $parts[2] = [int]$parts[2] + 1
    }
}
$newVersion = $parts -join '.'
Write-Host "📦 New version: $newVersion" -ForegroundColor Green

if ($DryRun) {
    Write-Host "🧪 DRY RUN - No changes will be made" -ForegroundColor Yellow
    exit 0
}

# Update version in package.json
Write-Host "`n📝 Updating package.json..." -ForegroundColor Cyan
npm version $newVersion --no-git-tag-version

# Build the application
Write-Host "`n🔨 Building application..." -ForegroundColor Cyan
npm run build

# Build installers and publish to GitHub
Write-Host "`n📤 Building and publishing to GitHub Releases..." -ForegroundColor Cyan
npx electron-builder --win --publish always

# Commit and push
Write-Host "`n📤 Committing and pushing..." -ForegroundColor Cyan
git add -A
git commit -m "release: v$newVersion"
git tag -a "v$newVersion" -m "Release v$newVersion"
git push origin main
git push origin "v$newVersion"

Write-Host "`n✅ Release v$newVersion published successfully!" -ForegroundColor Green
Write-Host "🔗 https://github.com/Clauskraft/LocalAgentWhybridSkills/releases/tag/v$newVersion" -ForegroundColor Blue


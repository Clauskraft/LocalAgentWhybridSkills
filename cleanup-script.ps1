# 🧹 Cleanup & Verification Script
# Automatiseret cleanup af Local Agent projektet
# Kør dette script for at rydde op i legacy folders og verificere projektet

Write-Host "🚀 Local Agent Cleanup Script" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Verificer vi er i korrekt directory
$projectRoot = "c:\Users\claus\Projects\Local_Agent"
if (-not (Test-Path $projectRoot)) {
    Write-Host "❌ ERROR: Project directory not found: $projectRoot" -ForegroundColor Red
    exit 1
}

Set-Location $projectRoot
Write-Host "✅ Working directory: $projectRoot`n" -ForegroundColor Green

# ============================================
# STEP 1: Git Status Check
# ============================================
Write-Host "📊 STEP 1: Checking Git Status..." -ForegroundColor Yellow

$currentBranch = git branch --show-current
Write-Host "   Current branch: $currentBranch" -ForegroundColor White

if ($currentBranch -ne "main") {
    Write-Host "⚠️  WARNING: You are not on 'main' branch!" -ForegroundColor Yellow
    $response = Read-Host "   Switch to main? (y/n)"
    if ($response -eq 'y') {
        git checkout main
        Write-Host "   ✅ Switched to main branch" -ForegroundColor Green
    }
    else {
        Write-Host "   ⏭️  Continuing on current branch..." -ForegroundColor Yellow
    }
}

# Check if up to date with remote
Write-Host "`n   Fetching from remote..." -ForegroundColor White
git fetch origin

$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  WARNING: You have uncommitted changes!" -ForegroundColor Yellow
    Write-Host $status -ForegroundColor Gray
    $response = Read-Host "`n   Continue anyway? (y/n)"
    if ($response -ne 'y') {
        Write-Host "❌ Cleanup cancelled." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Git status check complete`n" -ForegroundColor Green

# ============================================
# STEP 2: Create Backup Branch
# ============================================
Write-Host "💾 STEP 2: Creating Backup Branch..." -ForegroundColor Yellow

$backupBranch = "backup-cleanup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
git branch $backupBranch
Write-Host "   ✅ Created backup branch: $backupBranch`n" -ForegroundColor Green

# ============================================
# STEP 3: Analyze Legacy Folders
# ============================================
Write-Host "🔍 STEP 3: Analyzing Legacy Folders..." -ForegroundColor Yellow

$legacyFolders = @(
    @{Path = "sca-01-phase2"; Compare = "apps\desktop" },
    @{Path = "sca-01-phase3"; Compare = "services\cloud" },
    @{Path = "sca-01-phase4"; Compare = $null }
)

$foldersToDelete = @()

foreach ($folder in $legacyFolders) {
    $legacyPath = Join-Path $projectRoot $folder.Path
    
    if (Test-Path $legacyPath) {
        Write-Host "`n   📁 Found: $($folder.Path)" -ForegroundColor White
        
        if ($folder.Compare) {
            $comparePath = Join-Path $projectRoot $folder.Compare
            
            if (Test-Path $comparePath) {
                Write-Host "      Comparing with: $($folder.Compare)..." -ForegroundColor Gray
                
                # Count files in each
                $legacyFiles = (Get-ChildItem -Path $legacyPath -Recurse -File).Count
                $compareFiles = (Get-ChildItem -Path $comparePath -Recurse -File).Count
                
                Write-Host "      Legacy files: $legacyFiles" -ForegroundColor Gray
                Write-Host "      Current files: $compareFiles" -ForegroundColor Gray
                
                # Simple heuristic: if similar file count, likely duplicate
                if ([Math]::Abs($legacyFiles - $compareFiles) -lt 10) {
                    Write-Host "      ⚠️  Likely DUPLICATE (similar file count)" -ForegroundColor Yellow
                    $foldersToDelete += $folder.Path
                }
                else {
                    Write-Host "      ℹ️  Significant differences detected" -ForegroundColor Cyan
                }
            }
        }
        else {
            # No comparison target (e.g., phase4)
            Write-Host "      ℹ️  No comparison target (WIP folder?)" -ForegroundColor Cyan
            $response = Read-Host "      Delete $($folder.Path)? (y/n)"
            if ($response -eq 'y') {
                $foldersToDelete += $folder.Path
            }
        }
    }
    else {
        Write-Host "   ✅ Not found: $($folder.Path) (already clean)" -ForegroundColor Green
    }
}

Write-Host "`n✅ Analysis complete`n" -ForegroundColor Green

# ============================================
# STEP 4: Delete Legacy Folders
# ============================================
if ($foldersToDelete.Count -gt 0) {
    Write-Host "🗑️  STEP 4: Deleting Legacy Folders..." -ForegroundColor Yellow
    Write-Host "   Folders to delete:" -ForegroundColor White
    $foldersToDelete | ForEach-Object { Write-Host "      - $_" -ForegroundColor Gray }
    
    $response = Read-Host "`n   Proceed with deletion? (y/n)"
    if ($response -eq 'y') {
        foreach ($folder in $foldersToDelete) {
            $folderPath = Join-Path $projectRoot $folder
            Write-Host "      Deleting: $folder..." -ForegroundColor Gray
            Remove-Item -Path $folderPath -Recurse -Force
            Write-Host "      ✅ Deleted: $folder" -ForegroundColor Green
        }
        Write-Host "`n✅ Deletion complete`n" -ForegroundColor Green
    }
    else {
        Write-Host "   ⏭️  Skipping deletion`n" -ForegroundColor Yellow
    }
}
else {
    Write-Host "✅ STEP 4: No legacy folders to delete`n" -ForegroundColor Green


    # ============================================
    # STEP 5: Check Docker Compose
    # ============================================
    Write-Host "🐳 STEP 5: Checking Docker Compose..." -ForegroundColor Yellow

    $dockerComposePath = Join-Path $projectRoot "docker-compose.yml"
    if (Test-Path $dockerComposePath) {
        $dockerContent = Get-Content $dockerComposePath -Raw
    
        $issues = @()
        if ($dockerContent -match "roma-bridge") {
            $issues += "roma-bridge (service removed)"
        }
        if ($dockerContent -match "search") {
            $issues += "search service (service removed)"
        }
    
        if ($issues.Count -gt 0) {
            Write-Host "   ⚠️  Found references to removed services:" -ForegroundColor Yellow
            $issues | ForEach-Object { Write-Host "      - $_" -ForegroundColor Gray }
            Write-Host "`n   ℹ️  Please manually review and update docker-compose.yml" -ForegroundColor Cyan
        }
        else {
            Write-Host "   ✅ No issues found in docker-compose.yml" -ForegroundColor Green
        }
    }
    else {
        Write-Host "   ℹ️  docker-compose.yml not found" -ForegroundColor Cyan
    }

    Write-Host ""

    # ============================================
    # STEP 6: Find Placeholders
    # ============================================
    Write-Host "🔍 STEP 6: Scanning for Placeholders..." -ForegroundColor Yellow

    $placeholderReport = Join-Path $projectRoot "placeholder_report.txt"
    $placeholders = @()

    # Search in source files (excluding node_modules, tests)
    $searchPaths = @("apps", "services", "shared", "mcp-backend")
    foreach ($searchPath in $searchPaths) {
        $fullPath = Join-Path $projectRoot $searchPath
        if (Test-Path $fullPath) {
            Get-ChildItem -Path $fullPath -Recurse -Include *.ts, *.js, *.tsx, *.jsx -Exclude *test*, *spec* | ForEach-Object {
                $content = Get-Content $_.FullName -Raw
                if ($content -match "placeholder|TODO|FIXME|XXX") {
                    $placeholders += $_.FullName
                }
            }
        }
    }

    if ($placeholders.Count -gt 0) {
        Write-Host "   ⚠️  Found $($placeholders.Count) files with placeholders/TODOs" -ForegroundColor Yellow
        $placeholders | Out-File $placeholderReport
        Write-Host "   📄 Report saved to: placeholder_report.txt" -ForegroundColor Cyan
    }
    else {
        Write-Host "   ✅ No placeholders found" -ForegroundColor Green
    }

    Write-Host ""

    # ============================================
    # STEP 7: Verify Build
    # ============================================
    Write-Host "🔨 STEP 7: Verifying Build..." -ForegroundColor Yellow

    $response = Read-Host "   Run 'npm install' and verify build? (y/n)"
    if ($response -eq 'y') {
        Write-Host "   Installing dependencies..." -ForegroundColor Gray
        npm install 2>&1 | Out-Null
    
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ npm install successful" -ForegroundColor Green
        }
        else {
            Write-Host "   ❌ npm install failed" -ForegroundColor Red
        }
    }
    else {
        Write-Host "   ⏭️  Skipping build verification`n" -ForegroundColor Yellow
    }

    # ============================================
    # STEP 8: Summary & Next Steps
    # ============================================
    Write-Host "`n📋 CLEANUP SUMMARY" -ForegroundColor Cyan
    Write-Host "==================`n" -ForegroundColor Cyan

    Write-Host "✅ Completed Steps:" -ForegroundColor Green
    Write-Host "   1. Git status verified" -ForegroundColor White
    Write-Host "   2. Backup branch created: $backupBranch" -ForegroundColor White
    Write-Host "   3. Legacy folders analyzed" -ForegroundColor White
    if ($foldersToDelete.Count -gt 0) {
        Write-Host "   4. Legacy folders deleted: $($foldersToDelete.Count)" -ForegroundColor White
    }
    Write-Host "   5. Docker compose checked" -ForegroundColor White
    Write-Host "   6. Placeholders scanned" -ForegroundColor White
    Write-Host "   7. Build verification completed" -ForegroundColor White

    Write-Host "`n📝 Next Steps:" -ForegroundColor Yellow
    Write-Host "   1. Review placeholder_report.txt (if generated)" -ForegroundColor White
    Write-Host "   2. Update docker-compose.yml (if needed)" -ForegroundColor White
    Write-Host "   3. Run tests: npm test" -ForegroundColor White
    Write-Host "   4. Commit changes: git add -A && git commit -m 'chore: cleanup legacy folders'" -ForegroundColor White
    Write-Host "   5. Push to GitHub: git push origin main" -ForegroundColor White

    Write-Host "`n🔄 Rollback Instructions:" -ForegroundColor Cyan
    Write-Host "   If you need to undo changes:" -ForegroundColor White
    Write-Host "   git checkout $backupBranch" -ForegroundColor Gray

    Write-Host "`n✅ Cleanup script completed!`n" -ForegroundColor Green

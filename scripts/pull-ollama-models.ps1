# Pull models to Railway Ollama instance
$ollamaUrl = "https://ollama-production-a63f.up.railway.app/api/pull"

$models = @(
    "qwen2.5:3b",
    "phi3:mini", 
    "qwen2.5-coder:3b",
    "gemma2:2b",
    "deepseek-coder:1.3b"
)

foreach ($model in $models) {
    Write-Host ""
    Write-Host "Pulling model: $model" -ForegroundColor Cyan
    $body = @{ name = $model; stream = $false } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $ollamaUrl -Method POST -Body $body -ContentType "application/json" -TimeoutSec 600
        Write-Host "Successfully pulled: $model" -ForegroundColor Green
        Write-Host $response
    }
    catch {
        Write-Host "Failed to pull $model" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

Write-Host ""
Write-Host "Checking installed models..." -ForegroundColor Yellow
try {
    $tags = Invoke-RestMethod -Uri "https://ollama-production-a63f.up.railway.app/api/tags" -Method GET
    Write-Host "Installed models:" -ForegroundColor Green
    foreach ($m in $tags.models) {
        $sizeGB = [math]::Round($m.size / 1GB, 2)
        Write-Host "  - $($m.name) ($sizeGB GB)"
    }
}
catch {
    Write-Host "Failed to list models" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

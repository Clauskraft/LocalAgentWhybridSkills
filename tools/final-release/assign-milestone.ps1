#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repo = gh repo view --json nameWithOwner --jq .nameWithOwner
$owner = ($repo -split "/")[0]
$name = ($repo -split "/")[1]

$title = "Final Release"
$ms = $null

try {
  $ms = gh api -X POST "repos/$owner/$name/milestones" -f title="$title" -f state=open | ConvertFrom-Json
} catch {
  $ms = $null
}

if (-not $ms) {
  $msList = gh api "repos/$owner/$name/milestones?state=open" | ConvertFrom-Json
  $ms = $msList | Where-Object { $_.title -eq $title } | Select-Object -First 1
}

if (-not $ms) {
  throw "Could not create or find milestone '$title'"
}

$msNum = $ms.number
Write-Host "Milestone: $title (#$msNum)"

$issueNumbers = @(35, 36, 37, 38)
foreach ($n in $issueNumbers) {
  gh api -X PATCH "repos/$owner/$name/issues/$n" -f milestone=$msNum *> $null
  Write-Host "Assigned issue #$n -> milestone #$msNum"
}



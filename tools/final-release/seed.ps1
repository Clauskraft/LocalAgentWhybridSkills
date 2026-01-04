#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Ok($msg) { Write-Host $msg -ForegroundColor Green }

Write-Info "Detecting repo..."
$repo = (gh repo view --json nameWithOwner --jq .nameWithOwner)
Write-Ok "Repo: $repo"

Write-Info "Ensuring labels..."
$labels = @(
  @{ name = "prio:P0"; color = "d73a4a"; description = "Release blocker" },
  @{ name = "prio:P1"; color = "fbca04"; description = "Must-have for release quality" },
  @{ name = "prio:P2"; color = "cfd3d7"; description = "Nice-to-have" },
  @{ name = "area:cloud"; color = "1d76db"; description = "services/cloud" },
  @{ name = "area:web"; color = "1d76db"; description = "apps/web" },
  @{ name = "area:desktop"; color = "1d76db"; description = "apps/desktop" },
  @{ name = "area:cli"; color = "1d76db"; description = "apps/cli" },
  @{ name = "area:release"; color = "5319e7"; description = "Final release coordination" }
)

foreach ($l in $labels) {
  gh label create $l.name --color $l.color --description $l.description --force *> $null
}
Write-Ok "Labels ensured."

Write-Info "Creating seed issues..."

$issues = @(
  @{
    title = "Final Release Kickoff (feature freeze + rest backlog execution)"
    labels = "area:release,prio:P0"
    body = @"
Use the kickoff checklist from the repo:

- `docs/FINAL_RELEASE.md`
- `docs/REST_BACKLOG_FINAL_RELEASE.md`
- `docs/HANDOVER_LOG.md`

Goal: create the release board, capture rest backlog, and start execution.

Blocked item:
- GitHub Project requires `gh` token scope: `project` (see `docs/REST_BACKLOG_FINAL_RELEASE.md`).
"@
  },
  @{
    title = "P0: Enable GitHub Project scope and create 'Final Release' Project"
    labels = "area:release,prio:P0"
    body = @"
`gh project` requires token scope `project`.

Verify:
```sh
gh auth status
gh project list --owner Clauskraft
```

Fix:
```sh
gh auth refresh -s project -h github.com
```

Then:
- Create GitHub Project "Final Release"
- Seed issues into the project columns (Backlog/Ready/In Progress/In Review/Done/Blocked)
"@
  },
  @{
    title = "P1: Desktop lint warning cleanup (unused imports + unused eslint-disable)"
    labels = "area:desktop,prio:P1"
    body = @"
Desktop lint is green but still produces warnings (dead code/unused imports and one unused eslint-disable).

Verify:
```sh
npm --prefix apps/desktop run lint
```
"@
  },
  @{
    title = "P2: Track remaining moderate npm audit findings (esbuild/Vite chain)"
    labels = "area:release,prio:P2"
    body = @"
High-severity audits are green, but moderate findings remain and would require major upgrades (e.g. Vite 7).

Verify:
```sh
npm --prefix apps/web audit --audit-level=high
npm --prefix services/cloud audit --audit-level=high
npm --prefix apps/desktop audit --audit-level=high
```
"@
  }
)

foreach ($i in $issues) {
  $url = (gh issue create --repo $repo --title $i.title --label $i.labels --body $i.body)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($url)) {
    throw "Failed to create issue: $($i.title)"
  }
  $num = ($url.Trim().Split("/") | Select-Object -Last 1)
  Write-Ok "Created issue #${num}: $($i.title) ($url)"
}

Write-Info "Attempting to create GitHub Project (requires 'project' scope)..."
gh project list --owner Clauskraft *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Warn "Could not access Projects. You likely need to grant the 'project' scope:"
  Write-Warn "  gh auth refresh -s project,read:project -h github.com"
  Write-Warn "Fallback: using a Milestone named \"Final Release\" (run tools/final-release/assign-milestone.ps1)."
} else {
  $projCreateOut = (gh project create --owner Clauskraft --title "Final Release")
  if ($LASTEXITCODE -ne 0) {
    Write-Warn "Could not create project (unknown error)."
  } else {
    Write-Ok "Project created: $projCreateOut"
    Write-Info "Next: add issues to the project with: gh project item-add <projectNumber> --owner Clauskraft --url <issue_url>"
  }
}

Write-Ok "Seed complete."



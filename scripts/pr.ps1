param(
  [Parameter(Mandatory = $false)]
  [string]$Title = ""
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "GitHub CLI (gh) is not installed. Install it, then rerun."
}

if ($Title -ne "") {
  gh pr create --title $Title --fill
} else {
  gh pr create --fill
}



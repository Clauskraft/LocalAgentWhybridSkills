#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is not installed. Install it, then rerun." >&2
  exit 1
fi

if [[ "${1:-}" != "" ]]; then
  gh pr create --title "$1" --fill
else
  gh pr create --fill
fi



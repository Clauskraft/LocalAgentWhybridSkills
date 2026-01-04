# Workflow (branch → PR → merge)

This repo uses a **PR-first** workflow.

## Quick start

```bash
git checkout main
git pull
git checkout -b feat/<short-slug>
```

Commit as usual:

```bash
git add -A
git commit -m "feat(web): ..."
git push -u origin HEAD
```

Create a PR:

```bash
gh pr create --fill
```

Merge the PR after CI is green:

```bash
gh pr merge --merge --delete-branch
```

## Branch naming

- `feat/<slug>`: new feature
- `fix/<slug>`: bug fix
- `chore/<slug>`: maintenance
- `docs/<slug>`: documentation-only

## Notes

- Prefer **small PRs** (easy review + easy rollback).
- If you need to land a hotfix quickly: `fix/<slug>` branch + PR is still the path.
- Branch protection (required reviews / required checks) is configured in GitHub repo settings.



# Rest Backlog — Final Release

This is the **execution backlog** for the final release under **feature freeze**.

## Current gate status (local, Windows)

- **Cloud (`services/cloud/`)**
  - build ✅
  - lint ✅
  - tests ✅ (Vitest)
  - audit (`--audit-level=high`) ✅ (moderate vulns remain)

- **Web (`apps/web/`)**
  - typecheck ✅
  - lint ✅
  - build ✅
  - smoke ✅ (Playwright)
  - audit (`--audit-level=high`) ✅ (moderate vulns remain)

- **Desktop (`apps/desktop/`)**
  - typecheck ✅
  - build ✅
  - tests ✅ (Vitest)
  - lint ✅ (warnings only; no errors)
  - audit (`--audit-level=high`) ✅ (moderate vulns remain)

- **CLI (`apps/cli/`)**
  - build ✅
  - lint ✅
  - tests ✅

## P0 (release blockers)

### P0 — None (gates green)

All core gates (build/lint/test/smoke + `npm audit --audit-level=high`) are green.

## P1 (should fix for release quality)

### P1 — Reduce Desktop lint warnings (cleanup)

**Why:** Lint is green, but the warnings indicate dead code/unused imports and one unused eslint-disable.

**How to verify**

```sh
npm --prefix apps/desktop run lint
```

## P2 (nice-to-have; do not block release)

### P2 — (Optional) GitHub Projects board

**Why:** Nice-to-have for visual workflow. Not required because milestone is in use.

**Blocker:** `gh project` requires token scopes (`project, read:project`).

**How to verify**

```sh
gh auth status
gh project list --owner Clauskraft
```

**Fix**

```sh
gh auth refresh -s project,read:project -h github.com
```

### P2 — Reduce remaining moderate `npm audit` findings (esbuild/Vite chain)

**Why:** `npm audit --audit-level=high` is green, but moderate vulnerabilities remain and would require a major upgrade (Vite 7) to fully clear.

**How to verify**

```sh
npm --prefix apps/web audit --audit-level=high
npm --prefix services/cloud audit --audit-level=high
npm --prefix apps/desktop audit --audit-level=high
```



# Final Release Plan (Desktop)

This is the concrete checklist to ship a **desktop release** to GitHub Releases with reproducible builds and clear gates.

## Goals for “Final”

- **Quality gates**: `lint`, `tsc --noEmit`, `vitest`, Playwright smoke all pass
- **Security gates**: `npm audit --audit-level=high` clean (or documented exceptions), no secrets committed
- **Packaging**: Electron app builds for Win/Mac/Linux in CI
- **Update story**: auto-updater status is explicitly documented (enabled or intentionally disabled with rationale)

## Pre-flight

- Confirm Node version: **Node 20+**
- Clean tree: no uncommitted changes
- Install: `npm ci` (preferred) or `npm install` (dev)

## Local gates (developer machine)

Run from `apps/desktop/`:

### Quality

- `npm run lint`
- `npx tsc -p tsconfig.json --noEmit`
- `npm run test`
- `npm run test:smoke` (Playwright)

### Security

- `npm audit --audit-level=high`
- Manually confirm these files contain no real secrets:
  - `config/integrations.example.json`
  - docs (no token-like examples)

### Packaging (sanity)

- `npm run build`
- `npm run build:ui:dir` (Windows-friendly unpacked build)

## CI gates (GitHub Actions)

Ensure the workflow runs these as required checks:

- Lint
- Typecheck
- Unit/integration tests (Vitest)
- E2E smoke (Playwright)
- Build artifacts for Win/Mac/Linux

If any job is flaky, fix before tagging a final release.

### Current workflow names / recommended required checks

In GitHub repository settings, mark these checks as **required** for `main`:

- **Workflow**: `CI`
  - `lint-and-test (node-version: 20)` (Phase 2 lint + typecheck + vitest + Playwright smoke)
  - `build-check (ubuntu-latest)` / `build-check (windows-latest)` / `build-check (macos-latest)`
  - `security-audit`

## Release execution

### Preferred: tag-based release (CI)

1. Merge to `main`
2. Create an annotated tag `vX.Y.Z`
3. Push tag → CI builds artifacts and publishes GitHub Release

### Scripted release (manual)

Use the provided scripts:

- Windows: `scripts/release.ps1`
- macOS/Linux: `scripts/release.sh`

They expect `GH_TOKEN` or `GITHUB_TOKEN` set in the environment and will:

- bump version
- build
- run `electron-builder --publish always`
- commit + tag + push

## Auto-updater milestone (decide before “final”)

The desktop app includes `electron-updater`, but it may be disabled in the main process pending module-loading fixes.

Pick one before final:

- **Option A (enable)**: fix ESM/CJS load, enable updater in `src/ui/main.ts`, add a smoke test that checks update-check call path does not throw.
- **Option B (disable, documented)**: keep it off, and ensure docs explicitly say manual install is the update path.

## Post-release validation

After the GitHub Release is published:

- Download installer/artifact for each platform
- Launch app
- Run a basic workflow:
  - `npm run dev:ui` (dev) or packaged app
  - Open Settings
  - Run a safe tool action (read a file under safe dir)
- Confirm audit logs are written to `SCA_LOG_DIR`
- If auto-updater is enabled: confirm update check runs without errors (and is pointed at the correct release feed)



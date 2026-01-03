# Docs ↔ Implementation Audit (Enterprise)

This document validates **documentation claims** against the **current implementation** and records corrective actions.

## Scope

- Root docs: `README.md`, `docs/*.md`
- Phases: `sca-01-phase{1,2,3,4}/README.md` + relevant `docs/`
- Shared packages: `shared/*/README.md`
- CI: `.github/workflows/*.yml`

## Summary (P0/P1 findings)

### P0 (Onboarding breakage)
- **Phase 2 docs mention non-existent scripts** (`dev:chat`, `dev:cockpit`).
  - **Reality**: Phase 2 uses `npm run dev:ui` (auto-port launcher) and `npm start` for packaged run.
  - **Fix**: update root `README.md` + `sca-01-phase2/README.md` to reference `dev:ui` and remove/mark legacy scripts.

### P1 (Incorrect / inconsistent details)
- **Phase 3 port mismatch**: docs mention `:3000` and `:8787`.
  - **Reality**: `sca-01-phase3/src/server/httpServer.ts` defaults to `8787` in dev; `PORT` env overrides (Railway typically sets `PORT=3000`).
  - **Fix**: update `sca-01-phase3/README.md` to reflect default + override behavior consistently.

- **Phase 4 roadmap drift**: docs list “HTTP transport support” as TODO.
  - **Reality**: Phase 4 implements HTTP transport + `mesh ping` / enhanced `mesh status`.
  - **Fix**: update `sca-01-phase4/README.md` (roadmap + examples).

## Validation Notes (How this was checked)

- **Scripts** validated against each package’s `package.json`.
- **Ports/endpoints** validated against server entrypoints (e.g. `httpServer.ts`) and route registrations.
- **CLI behavior** validated by reading CLI source (`src/cli.ts`) for each phase.

## Follow-ups (Enterprise hardening)

- Add an automated “docs script sanity” check in CI (optional): parse markdown `npm run <script>` blocks and verify the script exists in the intended package.
- Ensure each phase README includes:
  - **Quick Start**
  - **Environment Variables**
  - **Health Check**
  - **Security posture** (what is blocked/allowed by default)



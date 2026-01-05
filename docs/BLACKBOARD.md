# Blackboard (optional extended state)

Use this file for **longer-lived context** that multiple Cursor agents need during the final release.

## Final release: scope + decisions

- **Release goal**: final release (see `docs/FINAL_RELEASE.md`)
- **Release Captain**: (assigned in chat)
- **Scope policy**: **Feature freeze**. Execute **P0/P1/P2** from the rest backlog. No new features outside the backlog without explicit Release Captain approval.

## Known hotspots / risk areas

- Auth & security-sensitive flows
- Env var changes and `.env.example` drift
- Cross-app contract changes (cloud ↔ web ↔ desktop)

## Current blockers

- None listed yet

## Notes

- **CI status**: ✅ green on `main` (GitHub Actions run `20700894841`)
  - Fixed `apps/desktop` `package-lock.json` mismatch (CI `npm ci --force`).
  - Fixed `mcp-backend` build/test under CI (shared middleware module resolution + Vitest aliases + plugin compatibility).
  - Stabilized desktop Playwright smoke selectors (MCP header button + model dropdown in Cloud/Ollama).
- Keep this concise. Prefer GitHub issues for actionable work.



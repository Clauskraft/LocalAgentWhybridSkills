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

## Source of Truth (SoT) — full URLs (Local + Railway)

> Canonical base URLs (as configured in Matrix / WidgetTDC setup):
> - Railway backend: `https://backend-production-d3da.up.railway.app`
> - Local backend: `http://127.0.0.1:3001`
> - Local frontend v1: `http://localhost:5173` (proxy to backend)
> - Local frontend v2: `http://localhost:5174` (proxy to backend)

### Local (direct to backend)

- Health: `http://127.0.0.1:3001/health`
- Contracts: `http://127.0.0.1:3001/api/contracts`
- MCP tools (list + schemas): `http://127.0.0.1:3001/api/mcp/tools`
- MCP tool execute (REST): `http://127.0.0.1:3001/api/mcp/route`
- MCP events (SSE): `http://127.0.0.1:3001/api/mcp/events`
- MCP WebSocket (optional): `ws://127.0.0.1:3001/mcp/ws`

### Local via `matrix-frontend` (v1 proxy, port 5173)

- Health: `http://localhost:5173/health`
- Contracts: `http://localhost:5173/api/contracts`
- MCP tools: `http://localhost:5173/api/mcp/tools`
- MCP execute: `http://localhost:5173/api/mcp/route`
- MCP SSE: `http://localhost:5173/api/mcp/events`
- MCP WS (proxied): `ws://localhost:5173/mcp/ws` (only if Vite proxy/WS is enabled; otherwise use direct backend WS above)

### Local via `matrix-frontend-v2` (v2 proxy, port 5174)

- Health: `http://localhost:5174/health`
- Contracts: `http://localhost:5174/api/contracts`
- MCP tools: `http://localhost:5174/api/mcp/tools`
- MCP execute: `http://localhost:5174/api/mcp/route`
- MCP SSE: `http://localhost:5174/api/mcp/events`
- MCP WS (proxied): `ws://localhost:5174/mcp/ws` (only if proxy/WS is enabled; otherwise use direct backend WS)

### Railway (production backend)

- Health: `https://backend-production-d3da.up.railway.app/health`
- Contracts: `https://backend-production-d3da.up.railway.app/api/contracts`
- MCP tools: `https://backend-production-d3da.up.railway.app/api/mcp/tools`
- MCP execute: `https://backend-production-d3da.up.railway.app/api/mcp/route`
- MCP SSE: `https://backend-production-d3da.up.railway.app/api/mcp/events`
- MCP WebSocket (optional): `wss://backend-production-d3da.up.railway.app/mcp/ws` (prod baseline: SSE; `/api/contracts` may mark WS unavailable)

### Notion (optional integration; must not be SPOF)

#### Full backend endpoints (Notion-related)

- Railway (prod):
  - Chat REST:
    - `https://backend-production-d3da.up.railway.app/api/chat/send`
    - `https://backend-production-d3da.up.railway.app/api/chat/history`
    - `https://backend-production-d3da.up.railway.app/api/chat/status`
  - Chat MCP (via MCP route):
    - `https://backend-production-d3da.up.railway.app/api/mcp/route` (tools: `global_chat.post`, `global_chat.read`, `global_chat.subscribe`)
- Local (direct backend):
  - Chat REST:
    - `http://127.0.0.1:3001/api/chat/send`
    - `http://127.0.0.1:3001/api/chat/history`
    - `http://127.0.0.1:3001/api/chat/status`
  - Chat MCP:
    - `http://127.0.0.1:3001/api/mcp/route` (tools: `global_chat.post`, `global_chat.read`, `global_chat.subscribe`)

> UI via proxy uses the same paths on `http://localhost:5173/...` (v1) or `http://localhost:5174/...` (v2).

#### SoT for “Notion works”

- Primary SoT (config): env vars (Railway / local `.env`) — `NOTION_API_TOKEN` (+ any required DB/page IDs)
- Secondary SoT: Notion database schema (properties)
- Runtime SoT (truth in code): handler must degrade gracefully (fallback to HyperLog) if token missing / schema mismatch / timeout — tool returns success, but does not write to Notion

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



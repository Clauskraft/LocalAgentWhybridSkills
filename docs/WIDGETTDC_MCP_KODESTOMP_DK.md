# Local Agent KODESTOMP (DK) — WidgeTDC MCP integration (contract-first)

Denne fil er en **ren, copy/paste-klar** instruktion til en lokal agent, så den integrerer korrekt med WidgeTDC via **MCP som core** og **`/api/contracts` som Source of Truth**.

> **Hard rule:** Never hardcode paths/tools. Discover via:
> - `GET /api/contracts`
> - `GET /api/mcp/tools`

---

## Quick Start (lokalt + Railway)

### 1) Vælg BASE_URL
- **Lokalt (backend)**: `http://127.0.0.1:3001`
- **Railway (backend)**: `https://backend-production-d3da.up.railway.app`

### 2) PowerShell smoke (ingen dependencies)

```powershell
$BASE_URL="http://127.0.0.1:3001"
Invoke-RestMethod "$BASE_URL/health" | ConvertTo-Json -Depth 10

$contracts = Invoke-RestMethod "$BASE_URL/api/contracts"
$contracts | ConvertTo-Json -Depth 10

$tools = Invoke-RestMethod "$BASE_URL/api/mcp/tools"
$tools.tools | Select-Object -First 25
```

### 3) Contract-first “golden path”
Din agent skal følge denne rækkefølge (altid):
- **Discover**: `GET /api/contracts`
- **Tool schemas**: `GET /api/mcp/tools` (brug `inputSchema`/`outputSchema` til validering + auto-form/presets)
- **Execute**: `POST /api/mcp/route`
- **Realtime (prod anbefalet)**: `GET /api/mcp/events` (SSE)
- **Realtime (optional)**: `WS /mcp/ws` *(kun hvis `/api/contracts.mcpWebSocket.available=true`)*

---

## Environment Variables (SoT + minimum)

> Ingen secrets committed. Brug lokale `.env` filer og `.env.example`/Railway Variables templates.

### Lokal udvikling (typisk)
Sæt i `apps/backend/.env` (ikke commit):
- **PORT**: `3001`
- **NODE_ENV**: `development`
- **NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD**: hvis Neo4j-features kræves
- **REDIS_URL**: hvis Redis-features kræves
- **DATABASE_URL**: hvis Postgres/Prisma-features kræves (Notes, m.fl.)
- **NOTION_API_TOKEN**: kun hvis Notion skal være “ok” (ellers degraderer vi)

### Railway (prod)
Sæt i Railway Variables (template: `RAILWAY_ENV_VARS.example.txt`):
- **NODE_ENV**: `production`
- **NEO4J_***, **REDIS_URL**, **DATABASE_URL** (efter behov)
- **NOTION_API_TOKEN** (optional)

---

## Health Check (krav for agenten)

### HTTP health
- `GET /health` skal returnere 200 hurtigt.

### Contracts health (SoT)
- `GET /api/contracts` skal returnere:
  - `http.*` endpoints
  - `websocket.*` paths
  - `mcpTools.*` snapshot (count + tools)
  - `mcpWebSocket.*` flags (available/allowRailway osv.)
  - *(optional)* `integrations.*` status (for capability gating)

### Notion probe (capability gating — IKKE blocker)
Hvis backend eksponerer `contracts.integrations.notion`, er det **kun** en lightweight sanity check:
- `configured=false` → `NOTION_API_TOKEN` mangler (forvent degraded)
- `status=degraded` → token findes, men Notion er ikke reachable/valid (forvent degraded)
- `status=ok` → Notion API reachable og token valid

**Regel**: Notion “degraded” må **aldrig** stoppe agent-flow. Global chat degraderer til HyperLog.

> **Obs:** Hvis `integrations.notion` ikke findes i contracts, så treat Notion som “unknown” og kør videre (non-blocking).

---

## MCP Execution Contract (hard rules)

### 1) Tool discovery og schema-validering
Din agent må ikke gætte tool-navne eller payload shape:
- Læs `GET /api/mcp/tools`
- Find tool i `definitions[]`
- Valider payload mod `inputSchema`

### 2) Tool execution
`POST /api/mcp/route`

```json
{
  "tool": "tool.name",
  "payload": {}
}
```

**Krav**:
- Log aldrig secrets/tokens
- Respektér rate limits + backoff (jitter) ved 429/503
- Behandl `degraded:true` som “partial success” hvis caller accepterer det

---

## Realtime / Observability

### SSE (anbefalet i prod)
- `GET /api/mcp/events`
- Brug den til audit trails (fx `mcp.tool.executed`)

### WS (optional)
- `WS /mcp/ws` *(kun hvis contracts siger det er available)*
- Hvis handshake fejler i prod, slå WS fra i klient og brug SSE + HTTP MCP.

---

## Source of Truth matrix (kort)
- **Paths + runtime contracts**: `GET /api/contracts`
- **Tool schemas**: `GET /api/mcp/tools`
- **Tool execution**: `POST /api/mcp/route`
- **Realtime events**: `GET /api/mcp/events`
- **Notion integration status**: `contracts.integrations.notion` *(kun hvis eksponeret)*

---

## Railway verifikation (hurtigst)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-deployment-status.ps1 -RailwayUrl https://backend-production-d3da.up.railway.app
```



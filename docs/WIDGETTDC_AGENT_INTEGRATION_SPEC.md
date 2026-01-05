# WidgeTDC Agent Integration Spec (Enterprise)

This document specifies how **integrating/external agents** (CLI agents, SaaS agents, partner systems) interact with **WidgeTDC** across:
- **HTTP APIs** (REST endpoints)
- **MCP over HTTP** (`/api/mcp/route`, `/api/mcp/tools`)
- **MCP over WebSocket** (`/mcp/ws`) *(optional)*
- **Data surfaces** (Wiki corpus, Intel Stream, SRAG, Notes, OSINT, etc.)
- **Operational requirements** (timeouts, rate limits, security, observability)

If you only follow one rule: **never hardcode paths/tools**—discover everything via `/api/contracts` and `/api/mcp/tools`.

---

## 0) Full URLs (Local + Railway)

> Configure agents with a single **Backend Base URL** and derive everything else by discovery.

### Local (direct to backend)

- Health: `http://127.0.0.1:3001/health`
- Contracts: `http://127.0.0.1:3001/api/contracts`
- MCP tools (list + schemas): `http://127.0.0.1:3001/api/mcp/tools`
- MCP tool execute (REST): `http://127.0.0.1:3001/api/mcp/route`
- MCP events (SSE): `http://127.0.0.1:3001/api/mcp/events`
- MCP WebSocket: `ws://127.0.0.1:3001/mcp/ws`

### Local via matrix-frontend (v1 proxy, port 5173)

- Health: `http://localhost:5173/health`
- Contracts: `http://localhost:5173/api/contracts`
- MCP tools: `http://localhost:5173/api/mcp/tools`
- MCP execute: `http://localhost:5173/api/mcp/route`
- MCP SSE: `http://localhost:5173/api/mcp/events`
- MCP WS (proxied): `ws://localhost:5173/mcp/ws` *(only if Vite proxy/WS is enabled; otherwise use direct backend WS above)*

### Local via matrix-frontend-v2 (v2 proxy, port 5174)

- Health: `http://localhost:5174/health`
- Contracts: `http://localhost:5174/api/contracts`
- MCP tools: `http://localhost:5174/api/mcp/tools`
- MCP execute: `http://localhost:5174/api/mcp/route`
- MCP SSE: `http://localhost:5174/api/mcp/events`
- MCP WS (proxied): `ws://localhost:5174/mcp/ws` *(only if proxy/WS is enabled; otherwise use direct backend WS)*

### Railway (production backend)

- Health: `https://backend-production-d3da.up.railway.app/health`
- Contracts: `https://backend-production-d3da.up.railway.app/api/contracts`
- MCP tools: `https://backend-production-d3da.up.railway.app/api/mcp/tools`
- MCP execute: `https://backend-production-d3da.up.railway.app/api/mcp/route`
- MCP SSE: `https://backend-production-d3da.up.railway.app/api/mcp/events`
- MCP WebSocket: `wss://backend-production-d3da.up.railway.app/mcp/ws` *(optional; see `/api/contracts` flags)*

---

## 1) Base URLs and environments

An agent must be configured with a single **Backend Base URL**:
- Example: `https://<backend-host>`
- All HTTP endpoints below are relative to this base URL.

**Discovery-first rule**:
- First call: `GET /api/contracts`
- Then use the returned catalog to drive all follow-up calls (HTTP + WS + MCP tools).

---

## 2) Authentication & authorization

WidgeTDC supports multiple auth methods, intended for enterprise + service-to-service.

### 2.1 HTTP (REST) auth

Send one of:
- **JWT**: `Authorization: Bearer <JWT>`
- **API Key**: `X-API-Key: <API_KEY>`

> Note: Some deployments expose discovery endpoints publicly to enable safe automation. If you gate them, ensure agents can still discover `/api/contracts` and `/api/mcp/tools`.

### 2.2 MCP WebSocket auth

MCP WebSocket supports auth via:
- Preferred: `Sec-WebSocket-Protocol` token transport
- Alternative: `?token=<...>` query parameter (legacy)

Relevant env knobs:
- `MCP_WS_REQUIRE_AUTH=true|false`
- `MCP_WS_ALLOWED_ORIGINS=<csv>|*`
- `MCP_WS_PERMESSAGE_DEFLATE=true|false`
- `MCP_WS_HEARTBEAT_MS=15000`
- `MCP_WS_MAX_PAYLOAD_BYTES=131072`

---

## 3) Runtime discovery (mandatory)

### 3.1 Contracts (source of truth)

**Request**
- `GET /api/contracts`

**Response provides**
- **HTTP** endpoints catalog
- **WebSocket** paths
- **MCP** tool list snapshot (`mcpTools.tools`)
- MCP WebSocket config hints (auth/heartbeat/etc.)
- **Integrations** status snapshot (for capability gating; e.g. Notion) *(if present)*

Agents should cache this response for a short period (e.g. 60s) and refresh on error/timeout.

#### 3.1.1 Integrations: Notion probe (capability gating)

If exposed by backend as `/api/contracts.integrations.notion`, it is a **lightweight connectivity sanity check**:
- Validates **token presence** and probes `GET https://api.notion.com/v1/users/me` with a **short timeout**
- Does **not** validate Notion *database schema* (validated inside tool handlers on write)

Shape (example):

```json
{
  "configured": true,
  "status": "ok",
  "checkedAt": "2026-01-05T12:34:56.000Z",
  "latencyMs": 210
}
```

Meaning:
- `configured=false`: token missing → treat Notion features as **degraded**
- `status=degraded`: token present but probe failed/timeout/auth issue → treat as **degraded** (but do **not** fail your flow)
- `status=ok`: Notion API reachable and token valid

### 3.2 MCP tool discovery

**Request**
- `GET /api/mcp/tools`

**Response**
- `tools: string[]`
- `definitions: { name, description?, inputSchema, outputSchema }[]`

Use this to:
- Gate capability usage (don’t call tools that aren’t registered)
- Generate forms/presets externally (schema-driven)
- Validate payloads client-side (enterprise agents should reject invalid payloads)

---

## 4) MCP over HTTP (primary agent execution path)

### 4.1 Execute tool

**Request**
- `POST /api/mcp/route`
- `Content-Type: application/json`

**Body**

```json
{
  "tool": "tool.name",
  "payload": {
    "...": "params"
  }
}
```

**Response (typical)**

```json
{
  "success": true,
  "messageId": "uuid",
  "result": {}
}
```

**Error handling**
- Treat HTTP 5xx and `success:false` as retryable only if the tool is known to be idempotent
- Use exponential backoff with jitter for retries
- Use tool-specific timeouts (see Section 9)

---

## 5) MCP over WebSocket (optional real-time + streaming)

### 5.1 Connect

Use `/api/contracts.websocket.mcp` (usually `/mcp/ws`) as the WS path.

### 5.2 Heartbeats & payload limits

Respect:
- `MCP_WS_HEARTBEAT_MS`
- `MCP_WS_MAX_PAYLOAD_BYTES`

Agents should:
- Reconnect with backoff (e.g. 1s → 2s → 5s → 10s, max 30s)
- Keep a single connection per agent instance unless explicitly sharded

---

## 6) Canonical data surfaces (HTTP)

### 6.1 Health
- `GET /health`

### 6.2 Intel Stream (Observatory news feed)
- `GET /api/news/stream?limit=100`

Guarantees:
- Returns JSON with `success:true` and `items` (fallback may be `rss`/`demo` if upstream is unavailable)

### 6.3 Wiki (structured search + drill-down)

**Search**
- `GET /api/wiki/search?q=<query>&limit=<n>&types=<csv>&sources=<csv>&orgId=<org>`

**Entity drill-down**
- `GET /api/wiki/entity/:id` (examples):
  - `neo4j:<elementId>`
  - `pg:rawDocument:<id>`
  - `file:<relativePath>`
  - `notion:<pageId>`

**Corpus status**
- `GET /api/wiki/corpus/status?orgId=<org>`

Guarantees:
- Must return within bounded time
- If DB is down or env missing, returns `success:true` with `degraded:true` and a hint (never hang)

### 6.4 Notes (CRUD)
Routes live under `/api/notes` (discover exact subpaths via `/api/contracts`).

---

## 7) Canonical data surfaces (MCP tools)

The tool list is runtime-defined. Always confirm tool existence via `/api/mcp/tools`.

### 7.1 Wiki MCP tools (external-agent baseline)
- `wiki.search`
- `wiki.entity.get`
- `wiki.corpus.status`

### 7.2 Capability contracts MCP tool (external-agent baseline)
- `capabilities.contracts.get`
  - Returns stable pointers to `/api/contracts`, `/api/mcp/tools`, `/api/mcp/route`, and Wiki endpoints.

### 7.3 Global Chat (Notion-backed, gracefully degraded)
Common tools (discover at runtime via `/api/mcp/tools`):
- `global_chat.post`
- `global_chat.read`
- `global_chat.subscribe`

Operational contract:
- If Notion is missing/misconfigured, backend must not hard-fail tool execution.
- In degraded mode, writes fall back to HyperLog while still returning `success:true`.
- Agents may use `/api/contracts.integrations.notion` for capability gating + operator hints only (not a hard blocker).

---

## 8) Reliability contracts (timeouts, retries, idempotency)

### 8.1 Timeouts (recommended)
- `GET /api/contracts`: 3s
- `GET /api/mcp/tools`: 3s
- `POST /api/mcp/route`: 10–60s depending on tool
- `GET /api/wiki/*`: 3–5s
- `GET /api/news/stream`: 3–5s

### 8.2 Retries
- Retry on:
  - network errors / timeouts
  - 502/503/504
- Use exponential backoff with jitter and a max retry budget.

### 8.3 Idempotency
When possible:
- Provide a caller-generated `requestId` in tool payloads
- Prefer tools/endpoints that accept deterministic identifiers

---

## 9) Reality check vs current Railway contracts (snapshot)

As of the current `/api/contracts` on Railway:
- **MCP SSE**: enabled and recommended for production realtime (`/api/mcp/events`)
- **MCP WebSocket**: marked **unavailable** on Railway (`mcpWebSocket.allowRailway=false`, `available=false`)
  - Agents should default to **REST (`/api/mcp/route`) + SSE (`/api/mcp/events`)** in prod



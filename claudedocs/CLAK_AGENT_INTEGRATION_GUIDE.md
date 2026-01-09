# CLAK Agent Integration Guide

## 1️⃣ Architecture Overview

- High‑level system diagram (flow‑chart) describing:
  - CLAK core, EventBus, Memory tiers, MCP router, Decision Engine, Front‑end widgets.
- Text description of each component’s responsibilities.

## 2️⃣ CLAK Taxonomy Reference

- Complete list of **categories**, **threat actors**, and **Danish keywords** used by the taxonomy.
- Table format (`| Category | Description |` etc.) for easy lookup.

## 3️⃣ EventBus Integration

- Enumerated **event types** (`harvest:high_priority`, `mcp.tool.executed`, …) with payload schemas.
- Example subscription code (TypeScript) and best‑practice notes.

## 4️⃣ Memory System Integration

- Explanation of the **four memory tiers**:
  1. **Working Memory** – transient per‑request state.
  2. **Procedural Memory** – rule engine placeholder.
  3. **Semantic (CMA) Memory** – long‑term entity storage.
  4. **Episodic Memory** – task‑execution logs.
- API surface (`unifiedMemorySystem.enrichMCPRequest`, `store`, `recallEpisodes`, …).

## 5️⃣ API Endpoints

- Full list of MCP HTTP endpoints (`/api/mcp/route`, `/api/mcp/tools`, `/api/mcp/events`, …).
- Request/response examples (JSON) for each endpoint.

## 6️⃣ Front‑end Widget Integration

- SSE subscription flow for real‑time events.
- Widget registration steps (ID, source, schema).
- Minimal UI example (React component) that renders a WidgetDC widget.

## 7️⃣ Code Samples

- **Full agent implementation** (class with `init`, `handleTool`, `decide`, `emitEvents`).
- **MCP tool definitions** (Zod schemas, registration via `mcpRegistry`).
- **Decision Engine** snippet showing `HybridSearchEngine` usage.

## 8️⃣ Best Practices

- Event handling patterns (debounce, idempotency).
- Memory management (when to persist, TTL, cache invalidation).
- Handling Danish‑specific content (localisation, keyword enrichment).

## 9️⃣ Troubleshooting

- Common failure modes (missing `recallEpisodes`, DB connection errors, rate‑limit handling).
- Debug commands (`npm run dev`, `npx tsc --noEmit`, `vitest` test runner).
- Performance tuning tips (batch inserts, Redis cache sizing).

## 🔟 Type Definitions

- Exported interfaces (`McpContext`, `HarvestedItemForMemory`, `EventPayload`, `WidgetSchema`).
- Example `d.ts` snippets for IDE autocomplete.

## 📄 Quick Reference Card (ASCII)

```
+-------------------+-------------------+
|   EventBus Types  |   Memory Methods  |
+-------------------+-------------------+
| harvest:high_pri | store(data)       |
| mcp.tool.executed| recallEpisodes()  |
| …                 | …                 |
+-------------------+-------------------+
```

*(Copy‑paste into terminal for a fast cheat sheet.)*

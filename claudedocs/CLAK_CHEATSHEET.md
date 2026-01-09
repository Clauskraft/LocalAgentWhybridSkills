# CLAK Cheatsheet

## Essential Imports

```ts
import { unifiedMemorySystem } from '@/mcp/cognitive/UnifiedMemorySystem';
import { eventBus } from '@/mcp/EventBus';
import { mcpRegistry } from '@/mcp/mcpRegistry';
import { hybridSearchEngine } from '@/mcp/cognitive/HybridSearchEngine';
```

## Analyse Examples

```ts
const result = await unifiedMemorySystem.enrichMCPRequest(msg, ctx);
const insights = await hybridSearchEngine.search('phishing', { orgId: ctx.orgId, limit: 5 });
```

## Event Subscription / Emission

```ts
// Subscribe
eventBus.onEvent('harvest:high_priority', (payload) => {
  console.log('🔥 High‑priority harvest:', payload);
});

// Emit
eventBus.emit('mcp.tool.executed', {
  tool: 'widgetdc.osint-investigate',
  payload,
  userId: ctx.userId,
  orgId: ctx.orgId,
  success: true,
  duration: 123,
});
```

## Memory Operations

```ts
// Store a new entity
await unifiedMemorySystem.store({
  type: 'threat_intel',
  content: JSON.stringify(data),
  orgId: ctx.orgId,
  userId: ctx.userId,
});

// Retrieve recent episodic logs
const episodes = await unifiedMemorySystem.recallEpisodes('task_execution', 20);
```

## Priority Thresholds

| Score | Importance |
|------|------------|
| ≥ 90 | 5 (Critical) |
| 70‑89| 4 (High) |
| 50‑69| 3 (Medium) |
| 30‑49| 2 (Low) |
| < 30 | 1 (Minimal) |

## API Calls (MCP)

```bash
curl -X POST http://localhost:3001/api/mcp/route \
     -H "Content-Type: application/json" \
     -d '{"tool":"widgetdc.osint-investigate","payload":{"target":"example.com"}}'
```

## SSE Front‑end Boilerplate

```tsx
const source = new EventSource('/api/mcp/events?topics=harvest,tool');
source.addEventListener('event', (e) => {
  const data = JSON.parse(e.data);
  // render widget or update UI
});
```

## Agent Registration (MCP)

```ts
mcpRegistry.registerTool({
  name: 'widgetdc.osint-investigate',
  description: 'Launch OSINT investigation',
  inputSchema: {/* Zod schema */},
  handler: async (params) => {
    // call WidgetDC bridge
    return await widgetBridge.launchOSINTInvestigation(params.target, params.type);
  },
});
```

## Debug Commands

```bash
# Type‑check only
npx tsc --noEmit

# Run unit tests
npx vitest run

# Watch for file changes
npm run dev
```

## File Locations (relative to repo root)

```
/apps/backend/src/mcp/cognitive/UnifiedMemorySystem.ts
/apps/backend/src/mcp/EventBus.ts
/apps/backend/src/mcp/mcpRouter.ts
/integrations/widgetdc/mcp-bridge.ts
/claudedocs/CLAK_AGENT_INTEGRATION_GUIDE.md
/claudedocs/CLAK_CHEATSHEET.md
```

## Quick ASCII Reference Card

```
+-------------------+-------------------+
|   Events          |   Methods         |
+-------------------+-------------------+
| harvest:high_pri | store()           |
| mcp.tool.exec    | recallEpisodes()  |
| …                 | …                 |
+-------------------+-------------------+
```

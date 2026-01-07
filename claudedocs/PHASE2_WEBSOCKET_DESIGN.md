# Phase 2: WebSocket Transport Design

**Generated**: 2026-01-07
**Status**: Design Complete - Ready for Implementation

---

## Executive Summary

The Agent-Mesh currently supports `stdio` and `http` transports. WebSocket transport is needed for:
- Real-time bidirectional communication
- Lower latency for agent-to-agent messaging
- Connection persistence (no re-auth per request)
- Event streaming and notifications

---

## Current State Analysis

### Existing Transport Architecture

```typescript
// sca-01-phase4/src/types/agent.ts
export type AgentTransport = "stdio" | "http" | "websocket";  // ← websocket defined
```

### MeshOrchestrator Gap

```typescript
// sca-01-phase4/src/orchestrator/meshOrchestrator.ts:288-291
if (entry.manifest.transport !== "stdio") {
  throw new Error(`Unsupported transport: ${entry.manifest.transport}`);
}
// → Only stdio and http implemented, websocket throws error
```

---

## WebSocket Transport Design

### 2A.1: Protocol Specification

```typescript
// New file: sca-01-phase4/src/transport/websocket.ts

interface WebSocketMessage {
  type: 'request' | 'response' | 'notification' | 'heartbeat';
  id: string;           // UUID for request correlation
  timestamp: number;    // Unix epoch ms
  payload: unknown;
}

interface WebSocketToolRequest extends WebSocketMessage {
  type: 'request';
  payload: {
    method: 'tools/call' | 'tools/list' | 'ping';
    params: {
      name?: string;
      arguments?: Record<string, unknown>;
    };
  };
}

interface WebSocketToolResponse extends WebSocketMessage {
  type: 'response';
  payload: {
    success: boolean;
    result?: unknown;
    error?: { code: number; message: string };
  };
}
```

### 2A.2: Server Implementation

```typescript
// Extension to meshOrchestrator.ts

import { WebSocketServer, WebSocket } from 'ws';

class WebSocketTransportServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();  // agentId → socket

  constructor(port: number = 8765) {
    this.wss = new WebSocketServer({ port });
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.wss.on('connection', (ws, req) => {
      const agentId = this.authenticateConnection(req);
      if (!agentId) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      this.clients.set(agentId, ws);

      ws.on('message', (data) => this.handleMessage(agentId, data));
      ws.on('close', () => this.clients.delete(agentId));
      ws.on('error', console.error);
    });
  }

  private authenticateConnection(req: IncomingMessage): string | null {
    // Extract token from URL query or header
    const token = new URL(req.url!, 'ws://localhost').searchParams.get('token');
    return this.validateToken(token);
  }
}
```

### 2A.3: Client Adapter

```typescript
// New file: sca-01-phase4/src/transport/WebSocketClientTransport.ts

export class WebSocketClientTransport {
  private ws: WebSocket | null = null;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private url: string, private token: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${this.url}?token=${this.token}`);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => this.handleMessage(event.data);
      this.ws.onclose = () => this.handleDisconnect();
      this.ws.onerror = reject;
    });
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.ws!.send(JSON.stringify({
        type: 'request',
        id,
        timestamp: Date.now(),
        payload: { method: 'tools/call', params: { name, arguments: args } }
      }));

      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }
}
```

### 2A.4: Reconnection & Heartbeat

```typescript
class WebSocketClientTransport {
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'heartbeat',
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          payload: {}
        }));
      }
    }, 30000);
  }

  private async handleDisconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    await new Promise(r => setTimeout(r, delay));
    await this.connect();
  }
}
```

---

## Integration Points

### MeshOrchestrator Updates

```typescript
// meshOrchestrator.ts additions

type ActiveWebSocketConnection = {
  agentId: string;
  transport: WebSocketClientTransport;
  lastUsed: Date;
};

// Update connectAgent method
private async connectAgent(entry: AgentRegistryEntry): Promise<void> {
  if (entry.manifest.transport === "websocket") {
    const transport = new WebSocketClientTransport(
      entry.manifest.endpoint,
      await this.getAgentToken(entry.manifest.id)
    );
    await transport.connect();

    this.connections.set(entry.manifest.id, {
      agentId: entry.manifest.id,
      transport,
      lastUsed: new Date(),
    });

    this.registry.updateStatus(entry.manifest.id, "online");
    return;
  }
  // ... existing stdio/http logic
}
```

---

## Testing Strategy

### 2A.5: Integration Tests

```typescript
// sca-01-phase4/src/transport/websocket.node.test.ts

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

describe('WebSocket Transport', () => {
  let server: WebSocketTransportServer;
  let client: WebSocketClientTransport;

  before(async () => {
    server = new WebSocketTransportServer(8765);
    client = new WebSocketClientTransport('ws://localhost:8765', 'test-token');
    await client.connect();
  });

  after(() => {
    client.close();
    server.close();
  });

  it('should call tool and receive response', async () => {
    const result = await client.callTool('echo', { message: 'test' });
    assert.strictEqual(result.message, 'test');
  });

  it('should handle reconnection', async () => {
    server.close();
    await new Promise(r => setTimeout(r, 1000));
    server = new WebSocketTransportServer(8765);
    await new Promise(r => setTimeout(r, 3000));

    const result = await client.callTool('ping', {});
    assert.ok(result);
  });
});
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `sca-01-phase4/src/transport/websocket.ts` | Create | Protocol types and server |
| `sca-01-phase4/src/transport/WebSocketClientTransport.ts` | Create | Client transport adapter |
| `sca-01-phase4/src/transport/index.ts` | Create | Export all transports |
| `sca-01-phase4/src/orchestrator/meshOrchestrator.ts` | Modify | Add websocket case |
| `sca-01-phase4/src/transport/websocket.node.test.ts` | Create | Integration tests |
| `sca-01-phase4/package.json` | Modify | Add `ws` dependency |

---

## Implementation Checklist

- [ ] 2A.1: Define WebSocket protocol spec (types)
- [ ] 2A.2: Implement WebSocket server in mesh
- [ ] 2A.3: Implement WebSocket client adapter
- [ ] 2A.4: Add reconnection & heartbeat logic
- [ ] 2A.5: Create integration tests
- [ ] 2B.1: Define agent addressing scheme (use existing manifest.id)
- [ ] 2B.2: Implement message routing (via orchestrator)
- [ ] 2B.3: Add request/response correlation (UUID-based)
- [ ] 2B.4: Implement broadcast/multicast (extend existing broadcast method)
- [ ] 2C.1: Agent registry schema (already exists)
- [ ] 2C.2: Registration endpoints (HTTP /agents/register)
- [ ] 2C.3: Health checking/TTL (heartbeat-based)
- [ ] 2C.4: Capability advertising (manifest.capabilities)

---

## Dependencies

```json
{
  "dependencies": {
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.10"
  }
}
```

---

## Estimated Effort

| Task | Effort |
|------|--------|
| Protocol spec | 2 hours |
| Server implementation | 4 hours |
| Client adapter | 4 hours |
| Reconnection/heartbeat | 2 hours |
| Integration tests | 4 hours |
| Documentation | 2 hours |
| **Total** | **~18 hours** |

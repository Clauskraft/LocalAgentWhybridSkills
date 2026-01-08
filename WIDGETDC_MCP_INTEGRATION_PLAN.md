# 🔗 Local Agent ↔ WidgeTDC MCP Integration Plan

**Dato:** 2026-01-08 14:30 CET  
**Mål:** Opret stabil, testet version af Local Agent med MCP integration til WidgeTDC

---

## 🎯 Overordnet Strategi

### Arkitektur

```
┌─────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Local Agent     │◄───────►│  WidgeTDC_fresh  │         │
│  │  (SCA-01)        │   MCP   │  (59+ tools)     │         │
│  └──────────────────┘         └──────────────────┘         │
│         │                              │                    │
│         │                              │                    │
│         ▼                              ▼                    │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Ollama          │         │  Neo4j + Postgres│         │
│  │  (qwen3)         │         │  + Redis + Notion│         │
│  └──────────────────┘         └──────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Komponenter

1. **Local Agent (Client)**
   - Kører lokalt
   - Forbinder til Ollama
   - Bruger MCP client til at kalde WidgeTDC tools

2. **WidgeTDC (MCP Server)**
   - Eksponerer 59+ MCP tools
   - Adgang til Neo4j, PostgreSQL, Redis, Notion
   - Kører på localhost:3001

---

## 📋 Implementation Plan

### Phase 1: Cleanup & Stabilization (30 min)

#### 1.1 Local Agent Cleanup

```bash
cd c:\Users\claus\Projects\Local_Agent

# Opret backup
git branch backup-stable-$(date +%Y%m%d)

# Verificer struktur
git status

# Fjern legacy folders (manuel)
# - Sammenlign først
# - Slet hvis duplikater
```

#### 1.2 Test Core Functionality

```bash
# Test CLI
cd apps/cli
npm install
npm test

# Test Desktop
cd apps/desktop
npm install
npm run build

# Test Cloud
cd services/cloud
npm install
npm test
```

---

### Phase 2: MCP Client Integration (1 time)

#### 2.1 Opret MCP Client Package

**Fil:** `packages/mcp-widgetdc-client/package.json`

```json
{
  "name": "@local-agent/mcp-widgetdc-client",
  "version": "1.0.0",
  "description": "MCP client for WidgeTDC integration",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

#### 2.2 Opret MCP Client

**Fil:** `packages/mcp-widgetdc-client/src/index.ts`

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface WidgeTDCClientConfig {
  serverUrl?: string;
  timeout?: number;
}

export class WidgeTDCMCPClient {
  private client: Client;
  private transport: StdioClientTransport;
  
  constructor(private config: WidgeTDCClientConfig = {}) {
    this.config.serverUrl = config.serverUrl || 'http://localhost:3001';
    this.config.timeout = config.timeout || 30000;
  }

  async connect(): Promise<void> {
    // Connect to WidgeTDC MCP server
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [
        'c:\\Users\\claus\\Projects\\WidgeTDC_fresh\\packages\\mcp-server\\dist\\index.js'
      ],
    });

    this.client = new Client({
      name: 'local-agent-client',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    await this.client.connect(this.transport);
  }

  async listTools(): Promise<any[]> {
    const response = await this.client.listTools();
    return response.tools;
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    const response = await this.client.callTool({
      name,
      arguments: args,
    });
    return response;
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }
}

// Convenience exports
export async function createWidgeTDCClient(
  config?: WidgeTDCClientConfig
): Promise<WidgeTDCMCPClient> {
  const client = new WidgeTDCMCPClient(config);
  await client.connect();
  return client;
}
```

#### 2.3 Integration i Desktop App

**Fil:** `apps/desktop/src/mcp/widgetdcClient.ts`

```typescript
import { createWidgeTDCClient, WidgeTDCMCPClient } from '@local-agent/mcp-widgetdc-client';

let widgetdcClient: WidgeTDCMCPClient | null = null;

export async function initWidgeTDCClient(): Promise<void> {
  if (widgetdcClient) return;
  
  try {
    widgetdcClient = await createWidgeTDCClient();
    console.log('✅ WidgeTDC MCP client connected');
    
    // List available tools
    const tools = await widgetdcClient.listTools();
    console.log(`📦 Available tools: ${tools.length}`);
  } catch (error) {
    console.error('❌ Failed to connect to WidgeTDC MCP:', error);
    throw error;
  }
}

export function getWidgeTDCClient(): WidgeTDCMCPClient {
  if (!widgetdcClient) {
    throw new Error('WidgeTDC client not initialized. Call initWidgeTDCClient() first.');
  }
  return widgetdcClient;
}

// Example tool wrappers
export async function queryNeo4j(cypher: string): Promise<any> {
  const client = getWidgeTDCClient();
  return await client.callTool('neo4j_query', { cypher });
}

export async function createNote(title: string, content: string): Promise<any> {
  const client = getWidgeTDCClient();
  return await client.callTool('create_note', { title, content });
}

export async function runPrometheusAnalysis(): Promise<any> {
  const client = getWidgeTDCClient();
  return await client.callTool('prometheus_analyze', {});
}
```

---

### Phase 3: Testing & Verification (30 min)

#### 3.1 Unit Tests

**Fil:** `packages/mcp-widgetdc-client/src/index.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createWidgeTDCClient, WidgeTDCMCPClient } from './index';

describe('WidgeTDC MCP Client', () => {
  let client: WidgeTDCMCPClient;

  beforeAll(async () => {
    client = await createWidgeTDCClient();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should connect to MCP server', async () => {
    expect(client).toBeDefined();
  });

  it('should list available tools', async () => {
    const tools = await client.listTools();
    expect(tools).toBeInstanceOf(Array);
    expect(tools.length).toBeGreaterThan(0);
  });

  it('should call a tool successfully', async () => {
    const result = await client.callTool('system_health', {});
    expect(result).toBeDefined();
  });
});
```

#### 3.2 Integration Test

**Fil:** `apps/desktop/tests/widgetdc-integration.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { initWidgeTDCClient, queryNeo4j, createNote } from '../src/mcp/widgetdcClient';

describe('WidgeTDC Integration', () => {
  beforeAll(async () => {
    await initWidgeTDCClient();
  });

  it('should query Neo4j', async () => {
    const result = await queryNeo4j('MATCH (n) RETURN count(n) as count LIMIT 1');
    expect(result).toBeDefined();
  });

  it('should create a note', async () => {
    const result = await createNote('Test Note', 'This is a test');
    expect(result).toBeDefined();
  });
});
```

---

### Phase 4: Documentation (30 min)

#### 4.1 Integration Guide

**Fil:** `docs/WIDGETDC_INTEGRATION.md`

```markdown
# WidgeTDC MCP Integration

## Quick Start

1. Start WidgeTDC backend:
   ```bash
   cd c:\Users\claus\Projects\WidgeTDC_fresh
   npm run dev:backend
   ```

1. Start Local Agent:

   ```bash
   cd c:\Users\claus\Projects\Local_Agent
   npm run desktop
   ```

2. Test integration:

   ```typescript
   import { queryNeo4j } from './mcp/widgetdcClient';
   const result = await queryNeo4j('MATCH (n) RETURN n LIMIT 10');
   ```

## Available Tools

### Knowledge Graph (Neo4j)

- `neo4j_query` - Run Cypher queries
- `neo4j_create_node` - Create nodes
- `neo4j_create_relationship` - Create relationships

### Memory

- `store_memory` - Store knowledge
- `retrieve_memory` - Retrieve knowledge
- `search_memory` - Search memories

### Notes

- `create_note` - Create note
- `list_notes` - List all notes
- `search_notes` - Search notes

### Prometheus

- `prometheus_analyze` - Code analysis
- `prometheus_suggest` - Get suggestions

## Configuration

Set environment variables:

```bash
$env:WIDGETDC_MCP_URL = "http://localhost:3001"
$env:WIDGETDC_MCP_TIMEOUT = "30000"
```

```

---

## 🔧 Implementation Steps

### Step 1: Prepare Local Agent
```bash
cd c:\Users\claus\Projects\Local_Agent

# Backup
git branch backup-mcp-integration-$(date +%Y%m%d)

# Clean install
npm install

# Verify build
npm run build
```

### Step 2: Create MCP Client Package

```bash
# Create directory
mkdir -p packages/mcp-widgetdc-client/src

# Create files (see above)
# - package.json
# - src/index.ts
# - src/index.test.ts
# - tsconfig.json
```

### Step 3: Integrate into Desktop App

```bash
cd apps/desktop

# Add dependency
npm install @local-agent/mcp-widgetdc-client

# Create integration file
# - src/mcp/widgetdcClient.ts

# Update bootstrap
# - src/startup/bootstrap.ts (add initWidgeTDCClient())
```

### Step 4: Test

```bash
# Unit tests
cd packages/mcp-widgetdc-client
npm test

# Integration tests
cd apps/desktop
npm test

# Manual test
npm run dev
```

---

## ✅ Verification Checklist

- [ ] Local Agent builds successfully
- [ ] MCP client package created
- [ ] Integration tests pass
- [ ] Desktop app connects to WidgeTDC
- [ ] Can call MCP tools
- [ ] Documentation updated
- [ ] Git committed

---

## 📊 Success Criteria

1. **Connectivity:** Desktop app kan forbinde til WidgeTDC MCP server
2. **Functionality:** Kan kalde mindst 5 forskellige MCP tools
3. **Stability:** Ingen crashes eller memory leaks
4. **Performance:** Tool calls < 1 sekund response time
5. **Documentation:** Komplet setup guide

---

## 🚀 Next Steps

Efter integration:

1. Opret example workflows
2. Tilføj error handling
3. Implementer retry logic
4. Tilføj logging/monitoring
5. Deploy til production

---

**Estimeret tid:** 2-3 timer  
**Risiko:** 🟢 LAV (med backup)  
**Prioritet:** 🔴 HØJ

# 🔗 WidgeTDC MCP Client

MCP client package for integrating Local Agent with WidgeTDC's 59+ MCP tools.

## Features

- ✅ **59+ MCP Tools** - Access to all WidgeTDC capabilities
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Easy Integration** - Simple API with convenience methods
- ✅ **Singleton Support** - Global client instance for convenience
- ✅ **Error Handling** - Robust error handling and logging

## Installation

```bash
cd packages/mcp-widgetdc-client
npm install
npm run build
```

## Quick Start

```typescript
import { createWidgeTDCClient } from '@local-agent/mcp-widgetdc-client';

// Create and connect client
const client = await createWidgeTDCClient({
  debug: true
});

// List available tools
const tools = await client.listTools();
console.log(`Available tools: ${tools.length}`);

// Query Neo4j
const result = await client.queryNeo4j('MATCH (n) RETURN count(n) as count');

// Create a note
await client.createNote('Meeting Summary', 'Discussed MCP integration');

// Disconnect
await client.disconnect();
```

## Available Tools

### Knowledge Graph (Neo4j)

- `queryNeo4j(cypher, params)` - Run Cypher queries
- Plus 20+ other Neo4j tools via `callTool()`

### Memory

- `storeMemory(key, value, metadata)` - Store knowledge
- `retrieveMemory(key)` - Retrieve knowledge
- Plus 6+ other memory tools

### Notes

- `createNote(title, content, tags)` - Create note
- Plus 4+ other note tools

### Code Analysis

- `runPrometheusAnalysis(path)` - Analyze code
- Plus 2+ other Prometheus tools

### System

- `checkHealth()` - System health check

## API Reference

### WidgeTDCMCPClient

#### Constructor

```typescript
new WidgeTDCMCPClient(config?: WidgeTDCClientConfig)
```

#### Methods

- `connect()` - Connect to MCP server
- `disconnect()` - Disconnect from server
- `isConnected()` - Check connection status
- `listTools()` - List all available tools
- `callTool(name, args)` - Call any MCP tool

#### Convenience Methods

- `queryNeo4j(cypher, params)`
- `createNote(title, content, tags)`
- `storeMemory(key, value, metadata)`
- `retrieveMemory(key)`
- `runPrometheusAnalysis(path)`
- `checkHealth()`

### Helper Functions

```typescript
// Create and connect client
const client = await createWidgeTDCClient(config);

// Get or create global singleton
const client = await getGlobalWidgeTDCClient(config);

// Disconnect global client
await disconnectGlobalClient();
```

## Configuration

```typescript
interface WidgeTDCClientConfig {
  /** Path to WidgeTDC MCP server script */
  serverPath?: string;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}
```

### Default Configuration

```typescript
{
  serverPath: 'c:\\Users\\claus\\Projects\\WidgeTDC_fresh\\packages\\mcp-backend-core\\dist\\index.js',
  timeout: 30000,
  debug: false
}
```

## Testing

```bash
npm test
```

## License

MIT

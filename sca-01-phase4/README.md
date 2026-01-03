# SCA-01 Phase 4 - Agent-Mesh

🔗 Multi-agent coordination and orchestration for distributed tool calling.

## Overview

Phase 4 enables SCA-01 to coordinate with multiple specialized agents, creating a mesh of capabilities that can work together.

```
┌─────────────────────────────────────────────────────────┐
│                   MESH ORCHESTRATOR                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Agent 1   │  │   Agent 2   │  │   Agent 3   │     │
│  │  (Phase 1)  │  │  (Desktop)  │  │  (Cloud)    │     │
│  │   stdio     │  │   stdio     │  │   http      │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          │                              │
│                   ┌──────▼──────┐                       │
│                   │  Registry   │                       │
│                   │ (AGENTS.md) │                       │
│                   └─────────────┘                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Features

### 🗂️ Agent Registry
- Register agents with manifests
- Track agent status and metrics
- Markdown blackboard (docs/AGENTS.md)
- Capability-based discovery

### 🔗 Mesh Orchestrator
- Connect to multiple agents
- Route tool calls to correct agent
- Retry with backoff
- Broadcast to multiple agents
- Heartbeat monitoring

### 🔒 Trust Levels
- `untrusted` - Unknown source, restricted
- `local` - Local development agent
- `verified` - Verified identity
- `signed` - Cryptographically signed

## Quick Start

```bash
# Install dependencies
npm install

# Initialize agent-mesh
npm run dev -- init

# Register an agent
npm run dev -- registry add agent-manifest.json

# List registered agents
npm run dev -- registry list

# Check mesh status
npm run dev -- mesh status

# Ping/heartbeat a specific agent
npm run dev -- mesh ping <agentId>

# List all available tools
npm run dev -- mesh tools

# Call a tool on an agent
npm run dev -- mesh call sca-01-tools read_file '{"path":"README.md"}'
```

## Agent Manifest

Agents are registered using a JSON manifest:

```json
{
  "id": "my-agent",
  "name": "My Custom Agent",
  "version": "1.0.0",
  "description": "What this agent does",
  
  "transport": "stdio",
  "endpoint": "npx tsx path/to/server.ts",
  
  "capabilities": [
    {
      "name": "my_tool",
      "description": "What this tool does",
      "inputSchema": { "type": "object", "properties": {} }
    }
  ],
  
  "trustLevel": "local",
  "tags": ["category1", "category2"],
  
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

## Transport Types

### stdio (Local)
```json
{
  "transport": "stdio",
  "endpoint": "npx tsx path/to/server.ts"
}
```

### http (Remote)
```json
{
  "transport": "http",
  "endpoint": "https://api.example.com/mcp"
}
```

### websocket (Real-time)
```json
{
  "transport": "websocket",
  "endpoint": "wss://api.example.com/mcp"
}
```

## Project Structure

```
sca-01-phase4/
├── src/
│   ├── types/
│   │   └── agent.ts           # Type definitions
│   ├── registry/
│   │   └── agentRegistry.ts   # Agent management
│   ├── orchestrator/
│   │   └── meshOrchestrator.ts # Tool routing
│   └── cli.ts                 # CLI interface
├── docs/
│   └── AGENTS.md              # Agent registry (auto-generated)
└── package.json
```

## CLI Commands

### Registry Management

```bash
# List all agents
npm run dev -- registry list

# Add agent from manifest
npm run dev -- registry add path/to/manifest.json

# Remove agent
npm run dev -- registry remove agent-id
```

### Mesh Operations

```bash
# Start orchestrator and show status
npm run dev -- mesh status

# List all tools from all agents
npm run dev -- mesh tools

# Call a specific tool
npm run dev -- mesh call <agent-id> <tool-name> '{"arg":"value"}'
```

## Security

### Trust Verification
- `local` agents run on your machine
- `verified` agents have confirmed identity
- `signed` agents have cryptographic signatures

### Policy Enforcement
- Only talk to registered agents
- Deny-by-default network calls
- Signature verification for packages

## Integration with Other Phases

### Phase 1 (CLI Tools)
```bash
# Register Phase 1 tool server
echo '{
  "id": "sca-01-tools",
  "name": "SCA-01 Tool Server",
  "transport": "stdio",
  "endpoint": "npx tsx ../sca-01-phase1/src/mcp/toolServer.ts"
}' > phase1-manifest.json

npm run dev -- registry add phase1-manifest.json
```

### Phase 2 (Desktop)
```bash
# Register Phase 2 full tools
echo '{
  "id": "sca-01-desktop",
  "name": "SCA-01 Desktop Tools",
  "transport": "stdio",
  "endpoint": "npx tsx ../sca-01-phase2/src/mcp/toolServerFull.ts"
}' > phase2-manifest.json

npm run dev -- registry add phase2-manifest.json
```

### Phase 3 (Cloud)
```bash
# Register cloud MCP endpoint
echo '{
  "id": "sca-01-cloud",
  "name": "SCA-01 Cloud API",
  "transport": "http",
  "endpoint": "https://sca-01-phase3-production.up.railway.app/mcp"
}' > phase3-manifest.json

npm run dev -- registry add phase3-manifest.json
```

## Roadmap

- [x] HTTP transport support
- [ ] WebSocket transport for real-time
- [ ] Agent-to-agent direct communication
- [ ] Load balancing for redundant agents
- [ ] Signature verification
- [ ] Capability negotiation
- [ ] Event broadcasting

## License

Private - SCA-01 Project


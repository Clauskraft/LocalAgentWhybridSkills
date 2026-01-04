# SCA-01 Phase 2 - Desktop Agent

Electron desktop application for SCA-01 (Phase 2).

## Features

### 🛠️ Tools
- **Shell Execution** - Run any shell command
- **File System** - Read, write, delete files anywhere
- **System Info** - CPU, memory, disk, processes
- **Clipboard** - Read/write system clipboard
- **Browser Automation** - Puppeteer-based web control
- **Network Requests** - HTTP client for APIs

### 🔒 Security
- **Approval Queue** - User approval for risky operations
- **Policy Engine** - Configurable access controls
- **Audit Logging** - HyperLog JSONL trail

### ☁️ Cloud Integration
- **Railway Sync** - Sessions synced to cloud
- **Notion Integration** - Blackboard sync to Notion
- **Multi-device** - Access from desktop, mobile, web

## Requirements

- Node.js 20+
- Windows/macOS/Linux

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run Desktop App (recommended)
# Starts Electron + Vite renderer on an auto-selected free port.
npm run dev:ui

# Run CLI
npm run dev -- doctor
```

## Cloud Mode (multi-device, no localhost)

For multi-device usage, run the UI in cloud mode and point it at the Railway backend:

- Set `SCA_USE_CLOUD=true`
- Set `SCA_BACKEND_URL=https://sca-01-phase3-production.up.railway.app`
- Ensure the Railway backend has `OLLAMA_HOST` configured to a non-local Ollama instance (reachable from Railway)

In cloud mode, chat requests are made from the Electron **main process** to the cloud backend (`/api/chat`) via IPC, to avoid browser CORS issues.

## UI Applications

### React Renderer (nyt flow)
- React 19 + Tailwind v3 via Vite (`npm run dev:renderer`)
- Electron loader peger på Vite dev-server eller den byggede renderer i `build/ui`
- Temaer (dark/light/tdc-blue/tdc-purple) kan vælges i Settings

> Note: Older “chat.html” / “cockpit.html” entrypoints are considered legacy in Phase 2.
> The supported desktop entrypoint is `npm run dev:ui`.

## Project Structure

```
sca-01-phase2/
├── src/
│   ├── agent/
│   │   └── DesktopAgent.ts     # Main agent logic
│   ├── approval/
│   │   └── approvalQueue.ts    # Approval system
│   ├── config/
│   │   └── configStore.ts      # Persistent config
│   ├── logging/
│   │   └── hyperlog.ts         # JSONL logging
│   ├── mcp/
│   │   ├── mcpToolClient.ts    # MCP client
│   │   └── toolServerFull.ts   # Extended tool server
│   ├── security/
│   │   └── policy.ts           # Policy engine
│   ├── sync/
│   │   └── cloudSync.ts        # Cloud synchronization
│   ├── tools/
│   │   ├── browserTools.ts     # Puppeteer automation
│   │   ├── clipboardTools.ts   # Clipboard access
│   │   ├── fileTools.ts        # File operations
│   │   ├── networkTools.ts     # HTTP requests
│   │   ├── shellTools.ts       # Shell execution
│   │   └── systemTools.ts      # System info
│   ├── ui/                      # Electron main/preload (loader React renderer)
│   ├── renderer/                # React + Tailwind renderer (ny UI)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── styles/
│   │   └── main.tsx
│   └── cli.ts                  # CLI entry
├── docs/
│   └── CAPABILITY_MATRIX.md    # What agent can/cannot do
└── package.json
```

## Deprecated
- Python FastAPI backend til Phase 2 er deprecated; TS/Electron + React renderer er kilden fremadrettet.

## Environment Variables

```bash
# Cloud mode (recommended for multi-device)
SCA_USE_CLOUD=true
SCA_BACKEND_URL=https://sca-01-phase3-production.up.railway.app

# Local/remote Ollama (used only when SCA_USE_CLOUD=false)
OLLAMA_HOST=
OLLAMA_MODEL=qwen3

# Security / policy (defaults are conservative)
SCA_FULL_ACCESS=false
SCA_AUTO_APPROVE=false
SCA_SAFE_DIRS=.
SCA_LOG_DIR=./logs
```

For the full list (including WidgetDC variables), see `docs/ENVIRONMENT_VARIABLES.md`.

## Health Check

- Cloud backend: `GET https://sca-01-phase3-production.up.railway.app/health`
- Local sanity: `npm run lint` and `npm run test`

## Cloud Sync

The desktop app can sync to Railway cloud:

```typescript
import { cloudSync } from "./sync/cloudSync";

// Login
await cloudSync.login("email@example.com", "password");

// Sync all sessions
const result = await cloudSync.syncAll();
console.log(`Synced ${result.syncedSessions} sessions`);

// Sync to Notion
await cloudSync.syncToNotion(sessionId);
```

## Building Executable

```bash
# Build unpacked folder (recommended on Windows ARM64)
npm run build:ui:dir

# Full installer builds (may require 7zip tooling on Windows ARM64)
npm run build:ui

# Build for Windows
npx electron-builder --win

# Build portable .exe
npx electron-builder --win portable
```

## Security Notes

⚠️ **This agent has full system access when enabled!**

- Keep `SCA_ALLOW_*` flags disabled in production
- Use approval gates for all risky operations
- Review audit logs regularly
- Don't expose to untrusted networks

## License

Private - SCA-01 Project

# SCA-01 Phase 2 - Desktop Agent

🖥️ Full-featured desktop application with Electron, providing complete system access with approval gates.

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

- Node.js 18+
- Ollama running locally (for AI)
- Windows/macOS/Linux

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run Chat UI (recommended)
npm run dev:chat

# Run Configuration Cockpit
npm run dev:cockpit

# Run CLI
npm run dev -- doctor
```

## UI Applications

### Chat UI (`npm run dev:chat`)

Modern chat interface similar to ChatGPT/Gemini:
- Model selection dropdown
- Session management
- Settings panel (MCP, System Prompt)
- Ollama model download/delete

### Configuration Cockpit (`npm run dev:cockpit`)

Admin panel for managing:
- Allowed file paths
- Repository access
- Tool permissions
- API credentials
- MCP server configuration

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
│   ├── ui/
│   │   ├── chat.html           # Chat interface
│   │   ├── cockpit.html        # Config cockpit
│   │   ├── index.html          # Main UI
│   │   ├── mainChat.ts         # Chat Electron main
│   │   ├── mainCockpit.ts      # Cockpit Electron main
│   │   ├── preloadChat.ts      # Chat preload
│   │   └── preloadCockpit.ts   # Cockpit preload
│   └── cli.ts                  # CLI entry
├── docs/
│   └── CAPABILITY_MATRIX.md    # What agent can/cannot do
└── package.json
```

## Environment Variables

```bash
# Ollama configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen3

# Permissions (all default to false)
SCA_ALLOW_UNRESTRICTED_FILE=true
SCA_ALLOW_UNRESTRICTED_EXEC=true
SCA_ALLOW_NETWORK=true
SCA_ALLOW_CLIPBOARD=true
SCA_ALLOW_BROWSER=true

# Cloud sync
CLOUD_API_URL=https://sca-01-phase3-production.up.railway.app
```

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
# Build for current platform
npm run build
npx electron-builder

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

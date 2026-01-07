# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SCA-01 "The Finisher" is a local-first AI agent runtime that uses Ollama for LLM inference and MCP (Model Context Protocol) for tool execution. The project provides multiple deployment targets: CLI, Desktop (Electron), Web UI, Cloud API, and Mobile (Expo).

## Architecture

```
apps/
├── cli/          # Phase 1: CLI runtime with Ollama + MCP
├── desktop/      # Phase 2: Electron UI with full system access
└── web/          # Web UI (Open WebUI-style) for cloud sessions

services/
├── cloud/        # Phase 3: Fastify API on Railway + PostgreSQL
├── roma-bridge/  # Python: ROMA agent planning/acting bridge
└── search/       # Python: OpenSearch integration

shared/           # Shared TypeScript packages
├── config-utils/
├── fastify-middleware/
├── health/
└── hyperlog/     # JSONL structured logging

integrations/     # External system integrations
└── widgetdc/     # WidgetDC MCP bridge
```

### Core Agent Loop (READ → PLAN → ACT → TEST → REPORT)

The `DesktopAgent` (`apps/desktop/src/agent/DesktopAgent.ts`) orchestrates:
1. Connects to MCP tool servers (stdio or HTTP)
2. Sends messages to Ollama with tool definitions
3. Executes tool calls through the policy engine
4. Reports results to blackboard (`docs/HANDOVER_LOG.md`)

### MCP Tool Categories

Tools are defined in `apps/desktop/src/tools/`:
- **fileTools.ts**: read_file, write_file, list_directory, search_files
- **shellTools.ts**: run_shell, run_powershell
- **systemTools.ts**: system_info, list_processes, kill_process
- **clipboardTools.ts**: clipboard_read, clipboard_write
- **browserTools.ts**: open_url, http_request, screenshot
- **networkTools.ts**: check_port, check_connectivity

### Security Model

Policy engine (`apps/desktop/src/security/policy.ts`) evaluates risk:
- **Blocklist**: Always blocked paths/commands
- **Safe dirs**: Auto-allowed project directories
- **Full access flag**: Required for system-wide operations
- **Approval queue**: User confirmation for high-risk actions

## Build Commands

### Root Level (recommended)
```bash
npm install            # Install dependencies for all packages
npm run install:all    # Explicit install for all packages

# Desktop (Electron)
npm run desktop        # Start dev with hot reload
npm run desktop:build  # Production build
npm run desktop:test   # Run vitest tests

# Web UI
npm run web            # Start Vite dev server (port 5174)
npm run web:build      # Production build
npm run web:test       # Typecheck + lint
npm run web:smoke      # Playwright smoke tests

# Cloud API
npm run cloud          # Start Fastify dev server
npm run cloud:build    # TypeScript compile
npm run cloud:test     # Run vitest tests

# CLI
npm run cli            # Run CLI agent
npm run cli:doctor     # Health check for Ollama/dependencies
```

### Package-Level Commands

**Desktop** (`apps/desktop/`):
```bash
npm run dev:ui         # Full dev environment (renderer + main + electron)
npm run build:ui       # Electron-builder package
npm run build:ui:dir   # Build without installer (for testing)
npm run test:e2e       # Playwright E2E tests
npm run test:e2e:ui    # Playwright with UI
npm run typecheck      # TypeScript check only
npm run lint           # ESLint
```

**Cloud** (`services/cloud/`):
```bash
npm run dev:server     # Start with tsx watch
npm run db:migrate:dev # Run migrations (dev)
npm run db:migrate     # Run migrations (production)
npm start              # Production server
```

**Mobile** (`sca-01-mobile/`):
```bash
npm start              # Expo start
npm run android        # Android emulator
npm run ios            # iOS simulator
```

**MCP Backend** (`mcp-backend/`):
```bash
npm run dev            # tsx watch mode
npm run test           # vitest
npm run test:smoke     # Smoke tests only
```

### Makefile Targets
```bash
make lint              # ESLint all packages
make test              # Test all packages
make audit             # Security audit + license check
make release           # Full pipeline: lint + test + audit + build
make clean             # Remove build artifacts
```

## Testing

**Unit tests**: vitest (`apps/desktop/`, `services/cloud/`, `mcp-backend/`)
```bash
npm run test                    # Run all tests
npx vitest run src/path/file.test.ts  # Run single test file
npx vitest -t "test name"       # Run by test name pattern
```

**E2E tests**: Playwright (`apps/desktop/`, `apps/web/`)
```bash
npm run test:e2e               # Full E2E suite
npm run test:e2e:headed        # With browser visible
npm run test:smoke             # Quick smoke test only
npm run test:smoke:ci          # CI version (chromium only)
```

**CLI tests**: Node.js test runner (`apps/cli/`)
```bash
npm run test                   # tsx --test
npm run test:watch             # Watch mode
```

## Key Files

- **Agent entry**: `apps/desktop/src/agent/DesktopAgent.ts`
- **Electron main**: `apps/desktop/src/ui/main.ts`
- **MCP tool server**: `apps/desktop/src/mcp/toolServerFull.ts`
- **Policy engine**: `apps/desktop/src/security/policy.ts`
- **Cloud server**: `services/cloud/src/server/httpServer.ts`
- **System prompt**: `prompts/sca-01.system.md`
- **Blackboard state**: `docs/HANDOVER_LOG.md`

## Environment Variables

Copy `.env.example` to `.env`:
```bash
# Required for LLM
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen3

# Security flags
SCA_ALLOW_WRITE=false
SCA_ALLOW_EXEC=false
SCA_FULL_ACCESS=false
SCA_AUTO_APPROVE=false

# Cloud (services/cloud)
DATABASE_URL=postgresql://...
JWT_SECRET=...

# Optional integrations
ROMA_BRIDGE_URL=http://localhost:8808
WIDGETDC_URL=http://localhost:3001
NOTION_TOKEN=...
```

## Git Workflow

Branch naming: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`

```bash
git checkout -b feat/<name>
git commit -m "feat(scope): message"
gh pr create --fill
gh pr merge --merge --delete-branch
```

## TypeScript Conventions

- ESM modules (`"type": "module"`)
- Node 20+ required
- Zod for runtime validation
- Paths use Windows-style in this codebase (project runs on Windows)

## Important Patterns

**IPC Communication** (Desktop): Main ↔ Renderer via `ipcMain`/`ipcRenderer` with preload bridge

**Tool Registration** (MCP):
```typescript
server.tool("tool_name", "Description", { param: z.string() }, async ({ param }) => {
  return { content: [{ type: "text", text: result }] };
});
```

**Logging**: Use HyperLog for structured JSONL output to `logs/` directory

**Health Endpoints**: All services expose `/health` and `/ready` endpoints

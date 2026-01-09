# @dot

A completion engine that takes partial implementations and drives them to "Definition of Done" with security-by-design principles.

## Why the repo used to have “phase” folders

The project started as **implementation phases**, but those phases also became **separate deployable packages** (CLI, Desktop app, Cloud API). That naming was historically accurate but confusing, so the deployable packages now live under `apps/` and `services/`.

**Rule of thumb:** think in **products**, not phases:

- **Desktop Agent** (Electron UI): `apps/desktop/`
- **Cloud API** (Railway): `services/cloud/`
- **CLI runtime** (local dev / minimal): `apps/cli/`

To make this easier, you can now start the products from the repo root with simple commands (see below).

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          @dot ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │     CLI     │    │   Desktop   │    │    Cloud    │         │
│  │   (local)   │◄──►│  (Electron) │◄──►│  (Railway)  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│        │                  │                   ▲                 │
│        │                  │                   │                 │
│        ▼                  ▼                   │                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Ollama    │    │ Cloud Sync  │    │  PostgreSQL │         │
│  │  (Local AI) │    │   Service   │    │  + Notion   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                           │                   ▲                 │
│                           │                   │                 │
│                     ┌─────────────┐           │                 │
│                     │   Mobile    │───────────┘                 │
│                     │    (Expo)   │                             │
│                     └─────────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Components

| Component | Description | Status |
|-----------|-------------|--------|
| [apps/cli](./apps/cli/) | CLI MVP with MCP tools | ✅ Complete |
| [apps/desktop](./apps/desktop/) | Desktop app with full system access | ✅ Complete |
| [apps/web](./apps/web/) | Web UI (Open WebUI-style) for Cloud sessions | ✅ MVP |
| [services/cloud](./services/cloud/) | Cloud API on Railway | ✅ Deployed |
| [sca-01-mobile](./sca-01-mobile/) | Android/iOS app with Expo | ✅ Complete |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- [Ollama](https://ollama.ai) installed and running
- Git

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen3

# Optional - ROMA Agent Integration
ROMA_BRIDGE_URL=http://localhost:8808
ROMA_STRATEGY=react

# Optional - Search Service
SEARCH_BRIDGE_URL=http://localhost:8810
OPENSEARCH_URL=http://localhost:9200

# Optional - WidgetDC Integration
WIDGETDC_COCKPIT_URL=
WIDGETDC_WORKER_URL=
```

### Health Check

All services expose health endpoints:

- **Desktop**: `http://localhost:5173/health` (dev) or built app
- **Cloud API**: `https://your-railway-url/health`
- **ROMA Bridge**: `http://localhost:8808/health`
- **Search Service**: `http://localhost:8810/health`

### Start Desktop Agent (recommended)

```bash
npm install
npm run desktop
```

### Start Web UI (Open WebUI-style)

```bash
npm install
npm run web
```

### Start Cloud API locally

```bash
npm install
npm run cloud
```

## Workflow

We use a **branch → PR → merge** workflow. See `docs/WORKFLOW.md`.

## WidgeTDC integration (Enterprise)

See `docs/WIDGETTDC_AGENT_INTEGRATION_SPEC.md` for the **discovery-first** integration contract (HTTP + MCP + SSE/WS) used by external agents and contract-first frontends.

For a **copy/paste** Windows-friendly checklist, see `docs/WIDGETTDC_MCP_KODESTOMP_DK.md`.

### Start CLI runtime (minimal)

```bash
npm install
npm run cli:doctor
npm run cli
```

## Cloud (production)

See `services/cloud/README.md` for the current production URL and health check command.

### Mobile App

```bash
cd sca-01-mobile
npm install
npm start              # Start Expo
# Scan QR code with Expo Go app
```

## 🔐 Security Principles

- **Zero Trust** - Validate all inputs, least privilege
- **GDPR Ready** - Treat all data as sensitive
- **Audit Trail** - HyperLog JSONL for all operations
- **Approval Gates** - User confirmation for risky actions
- **No Secrets in Code** - Environment variables only

## 🛠️ MCP Tools

### Phase 1 (Safe)

- `read_handover_log` - Read blackboard
- `read_file` - Read files (with path restrictions)
- `write_file` - Write files (requires SCA_ALLOW_WRITE=true)
- `run_make_target` - Run make commands (requires SCA_ALLOW_EXEC=true)

### Phase 2 (Full Access)

- `shell_exec` - Execute any shell command
- `file_*` - Full filesystem access
- `system_*` - CPU, memory, processes
- `clipboard_*` - System clipboard
- `browser_*` - Puppeteer automation
- `http_request` - Network requests

## ☁️ Cloud Features

- **User Authentication** - Register, login, JWT tokens
- **Session Storage** - PostgreSQL persistence
- **Notion Sync** - Blackboard and session sync
- **Mobile Access** - Same API from any device

## 📱 Mobile App

Native Android/iOS app with:

- Secure login
- Session management
- Chat interface
- Cloud sync

## 🔧 Environment Variables

```bash
# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen3

# Phase 1 Permissions
SCA_ALLOW_WRITE=false
SCA_ALLOW_EXEC=false

# Phase 2 Permissions / runtime
SCA_FULL_ACCESS=false
SCA_AUTO_APPROVE=false
SCA_MAX_TURNS=20
SCA_SHELL_TIMEOUT=300000
SCA_MAX_FILE_SIZE=10000000
SCA_LOG_DIR=./logs
SCA_THEME=dark

# Phase 3 (Cloud)
DATABASE_URL=postgresql://...

# Notion Integration
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx
```

## 📋 Faseplan

- [x] **Phase 1:** CLI + Ollama + MCP Tool Server
- [x] **Phase 2:** Desktop UI + Approval Gates + Full System Access
- [x] **Phase 3:** Cloud Mode (Railway + PostgreSQL + Notion)
- [ ] **Phase 4:** Agent-Mesh (The Constellation of Dots) 🔄 *[In Progress]*

## 🔗 Links

- **GitHub:** `https://github.com/Clauskraft/LocalAgentWhybridSkills`

## 📄 License

Private - @dot Project

---

Built with ❤️ by CLAK

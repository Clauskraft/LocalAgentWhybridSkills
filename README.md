# SCA-01 "The Finisher"

A completion engine that takes partial implementations and drives them to "Definition of Done" with security-by-design principles.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SCA-01 ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Phase 1   │    │   Phase 2   │    │   Phase 3   │         │
│  │    CLI      │    │   Desktop   │    │    Cloud    │         │
│  │   (MVP)     │◄──►│  (Electron) │◄──►│  (Railway)  │         │
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
| [sca-01-phase1](./sca-01-phase1/) | CLI MVP with MCP tools | ✅ Complete |
| [sca-01-phase2](./sca-01-phase2/) | Desktop app with full system access | ✅ Complete |
| [sca-01-phase3](./sca-01-phase3/) | Cloud API on Railway | ✅ Deployed |
| [sca-01-mobile](./sca-01-mobile/) | Android/iOS app with Expo | ✅ Complete |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- [Ollama](https://ollama.ai) installed and running
- Git

### Phase 1: CLI (Simplest)

```bash
cd sca-01-phase1
npm install
npm run build
npm run sca -- doctor  # Check Ollama connection
npm run sca -- run     # Run agent
```

### Phase 2: Desktop App

```bash
cd sca-01-phase2
npm install
npm run build
npm run dev:chat       # Launch Chat UI
```

### Phase 3: Cloud Server

Already deployed at: `https://sca-01-phase3-production.up.railway.app`

```bash
# Test health
curl https://sca-01-phase3-production.up.railway.app/health
```

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

# Phase 2 Permissions
SCA_ALLOW_UNRESTRICTED_FILE=false
SCA_ALLOW_UNRESTRICTED_EXEC=false
SCA_ALLOW_NETWORK=false
SCA_ALLOW_CLIPBOARD=false
SCA_ALLOW_BROWSER=false

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
- [ ] **Phase 4:** Agent-Mesh (Multi-agent coordination)

## 🔗 Links

- **Cloud API:** `https://sca-01-phase3-production.up.railway.app`
- **GitHub:** `https://github.com/Clauskraft/LocalAgentWhybridSkills`

## 📄 License

Private - SCA-01 Project

---

Built with ❤️ by CLAK

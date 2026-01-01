# SCA-01 "The Finisher" - Local Agent Runtime

> **Suveræn, local-first AI agent med fuld PC-adgang og Zero Trust sikkerhed**

[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)]()
[![License](https://img.shields.io/badge/license-Private-red)]()

---

## 🎯 Hvad er SCA-01?

SCA-01 ("The Finisher") er en **completion engine** - en AI agent der tager ufærdige opgaver og kører dem til "Definition of Done".

**Nøgleegenskaber:**
- 🏠 **Local-first**: Kører på din PC med Ollama (ingen cloud dependency)
- 🔐 **Zero Trust**: Approval gates for farlige operationer
- 🛠️ **Fuld PC-adgang**: Filer, shell, processer, clipboard, browser
- 📋 **Blackboard Pattern**: State i Markdown (docs/HANDOVER_LOG.md)
- 🔌 **MCP Protocol**: Standardiseret tool/agent bus

---

## 📁 Struktur

```
Local_Agent/
├── sca-01-phase1/          # MVP: CLI + Ollama + begrænsede tools
│   ├── src/
│   │   ├── cli.ts
│   │   ├── agent/FinisherAgent.ts
│   │   ├── mcp/toolServer.ts
│   │   └── ...
│   └── docs/HANDOVER_LOG.md
│
├── sca-01-phase2/          # Desktop Agent: Fuld PC-adgang
│   ├── src/
│   │   ├── cli.ts
│   │   ├── agent/DesktopAgent.ts
│   │   ├── mcp/toolServerFull.ts   # 20+ tools
│   │   ├── ui/                      # Electron UI
│   │   ├── security/policy.ts       # Zero Trust
│   │   └── approval/                # Approval gates
│   └── docs/CAPABILITY_MATRIX.md
│
└── docs/
    └── ARCHITECTURE.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Ollama med en tool-calling model (qwen3, llama3.1, etc.)

### Phase 1 (Safe/Restricted)
```bash
cd sca-01-phase1
npm install
npm run dev -- doctor    # Check Ollama
npm run dev -- run       # Run agent (read-only)
```

### Phase 2 (Full PC Access)
```bash
cd sca-01-phase2
npm install
npm run dev -- doctor    # Check system

# Safe mode (read-only)
npm run dev -- run

# Full access med approval gates
$env:SCA_FULL_ACCESS="true"; npm run dev -- run

# Desktop UI
npm run dev:ui
```

---

## 🔐 Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    APPROVAL MATRIX                          │
├─────────────────────┬─────────────┬─────────────────────────┤
│ Operation           │ Risk Level  │ Approval Required       │
├─────────────────────┼─────────────┼─────────────────────────┤
│ Read file (safe)    │ 🟢 Low      │ Auto-approved           │
│ Read file (system)  │ 🟡 Medium   │ Logged                  │
│ Write file (repo)   │ 🟡 Medium   │ Flag-gated              │
│ Write file (system) │ 🔴 High     │ MANUAL APPROVAL         │
│ Shell (read-only)   │ 🟢 Low      │ Auto-approved           │
│ Shell (mutating)    │ 🔴 High     │ MANUAL APPROVAL         │
│ Process kill        │ 🔴 High     │ MANUAL APPROVAL         │
└─────────────────────┴─────────────┴─────────────────────────┘
```

### Blocked Paths (Always)
- `.git/`, `node_modules/`, `.env*`
- System directories, secrets, browser profiles

### Blocked Commands (Always)
- `rm -rf /`, `format c:`, fork bombs, etc.

---

## 📊 Phases

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ Complete | CLI + Ollama + begrænsede tools |
| **Phase 2** | ✅ Complete | Desktop Agent + Electron UI + Approval Gates |
| **Phase 3** | 🔜 Planned | Cloud Mode (MCP over HTTP, mTLS) |
| **Phase 4** | 🔜 Planned | Agent Mesh (multi-agent koordinering) |

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server |
| `OLLAMA_MODEL` | `qwen3` | Model name |
| `SCA_FULL_ACCESS` | `false` | Enable full system access |
| `SCA_AUTO_APPROVE` | `false` | Skip approval gates (DANGEROUS) |
| `SCA_SAFE_DIRS` | `.` | Safe directories |
| `SCA_LOG_DIR` | `./logs` | Log directory |

---

## 🛠️ Development

```bash
# Build Phase 1
cd sca-01-phase1 && npm run build

# Build Phase 2
cd sca-01-phase2 && npm run build

# Lint
npm run lint

# Test
npm run test

# Build Electron .exe
npm run build:ui
```

---

## 📋 The CLAK Codex

SCA-01 følger "The CLAK Codex" - strenge krav til:

- **Security by Design**: Zero Trust, least privilege, input validation
- **Compliance Ready**: GDPR/Schrems II posture, audit trails
- **ARM64 Native**: Snapdragon X Elite som target platform
- **Strict TypeScript**: No `any`, ES Modules only
- **Blackboard Protocol**: State i Markdown, ikke JSON

---

## 📄 License

Private / Internal use only.

---

*Built by CLAK - Head of Solutions*


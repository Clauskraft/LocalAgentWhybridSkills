# SCA-01 Phase 1 (MVP)

Local-first agent runtime for SCA-01 ("The Finisher"):

- Uses **Ollama** as the LLM provider via `/api/chat` with **tool calling**
- Uses **MCP (Model Context Protocol)** via `@modelcontextprotocol/sdk` to expose tools over stdio
- Stores operational state in **Markdown** (Blackboard), e.g. `docs/HANDOVER_LOG.md`

## Requirements

- Node.js 18+ (recommended 20+)
- Ollama installed and running locally (default: http://localhost:11434)
- A model that supports tool calling (e.g. `qwen3` per Ollama docs)

## Quick Start

```bash
cd sca-01-phase1
npm install

# Verify Ollama connectivity
npm run sca -- doctor

# Read-only run (safe default)
npm run sca -- run

# Allow writes + command execution (DANGEROUS - use only in controlled repo)
SCA_ALLOW_WRITE=true SCA_ALLOW_EXEC=true npm run sca -- run
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `qwen3` | Model with tool calling support |
| `SCA_REPO_ROOT` | Current working dir | Repository root path |
| `SCA_ALLOW_WRITE` | `false` | Enable file write operations |
| `SCA_ALLOW_EXEC` | `false` | Enable make target execution |
| `SCA_MAX_TURNS` | `8` | Max agent loop iterations |
| `SCA_LOG_DIR` | `./logs` | HyperLog output directory |

## Security Notes (Executive Grade defaults)

- Write/exec capabilities are **disabled by default**
- Path traversal is blocked; `.env*`, `.git/`, `node_modules/` are blocked
- Treat the repository as sensitive data (GDPR-by-default posture)

## Health Check

```bash
npm run sca -- doctor
```

Calls Ollama `GET /api/version` and prints version.

## How SCA-01 prompt is loaded

The agent tries these paths in order:

1. `.agent/sca-01_the finisher.txt`
2. `.agent/sca-01_the_finisher.txt`
3. `prompts/sca-01.system.md` (not included by default)
4. Built-in minimal fallback prompt

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     User Surfaces                            │
│  CLI (sca)  │  Desktop UI (Phase 2)  │  Cloud API (Phase 3)  │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                    SCA-01 Runtime                            │
│  FinisherAgent  │  Policy Engine  │  HyperLog (JSONL)        │
└─────────┬────────────────┬───────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────┐  ┌─────────────────────────────────────────┐
│     Ollama      │  │          MCP Tool/Agent Bus             │
│  POST /api/chat │  │  MCP Client → MCP Tool Server (stdio)   │
│  Tool calling   │  │             → Other agents (Phase 4)    │
└─────────────────┘  └─────────────────────────────────────────┘
                                      │
                                      ▼
                     ┌────────────────────────────────────────┐
                     │         Blackboard State               │
                     │       docs/HANDOVER_LOG.md             │
                     └────────────────────────────────────────┘
```

## License

Private / Internal use.


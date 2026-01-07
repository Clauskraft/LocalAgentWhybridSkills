# SCA-01 Documentation

This directory contains technical documentation for the SCA-01 "The Finisher" project.

## Core Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and component overview |
| [WORKFLOW.md](./WORKFLOW.md) | Development workflow and processes |
| [HANDOVER_LOG.md](./HANDOVER_LOG.md) | Agent session handover state (blackboard) |
| [FINAL_RELEASE.md](./FINAL_RELEASE.md) | Final release checklist and status |

## Integration Specs

| Document | Description |
|----------|-------------|
| [WIDGETTDC_AGENT_INTEGRATION_SPEC.md](./WIDGETTDC_AGENT_INTEGRATION_SPEC.md) | WidgetDC MCP integration specification |
| [WIDGETTDC_MCP_KODESTOMP_DK.md](./WIDGETTDC_MCP_KODESTOMP_DK.md) | WidgetDC MCP tool documentation |
| [REMOTE_CODE_EXECUTION_ARCHITECTURE.md](./REMOTE_CODE_EXECUTION_ARCHITECTURE.md) | RCE security architecture |

## Development Guides

| Document | Description |
|----------|-------------|
| [MULTI_DEVICE_DEVELOPMENT.md](./MULTI_DEVICE_DEVELOPMENT.md) | Multi-device development setup |
| [REST_BACKLOG_FINAL_RELEASE.md](./REST_BACKLOG_FINAL_RELEASE.md) | Release backlog and remaining items |
| [DOCS_IMPLEMENTATION_AUDIT.md](./DOCS_IMPLEMENTATION_AUDIT.md) | Documentation vs implementation audit |

## Quick Links

- **Main README**: [../README.md](../README.md)
- **Claude Instructions**: [../CLAUDE.md](../CLAUDE.md)
- **Desktop App**: [../apps/desktop/README.md](../apps/desktop/README.md)
- **Cloud API**: [../services/cloud/README.md](../services/cloud/README.md)

## Architecture Overview

```
SCA-01 "The Finisher"
├── CLI (Phase 1)      - Local agent with Ollama + MCP
├── Desktop (Phase 2)  - Electron UI with full system access
├── Cloud (Phase 3)    - Fastify API on Railway + PostgreSQL
├── Web UI             - React frontend for cloud sessions
├── Agent-Mesh (P4)    - Distributed agent communication
└── Mobile             - Expo React Native app
```

## Agent Loop

The core agent follows the READ → PLAN → ACT → TEST → REPORT pattern:

1. **READ**: Gather context from blackboard and environment
2. **PLAN**: Create execution plan using LLM
3. **ACT**: Execute tools via MCP protocol
4. **TEST**: Validate results and check for errors
5. **REPORT**: Update blackboard with outcomes

# 🤖 LocalAgentWhybridSkills - Agent Configuration

> **AI Agent Mode**: TOTAL AUTONOMY - Solve problems directly without asking questions.

## 🎯 Project Identity

**LocalAgentWhybridSkills** is the desktop agent companion to WidgeTDC, featuring the ROMA planning engine, MCP integrations, and autonomous orchestration capabilities.

### Tech Stack
- **Desktop**: Electron + TypeScript
- **CLI**: Node.js + TypeScript
- **Web**: Next.js + TypeScript
- **Backend**: Express (MCP Backend)
- **Planning**: ROMA Engine (ReAct/CoT)

## 📁 Project Structure

```
LocalAgentWhybridSkills/
├── apps/
│   ├── desktop/         # Electron desktop app
│   ├── cli/             # CLI tools
│   └── web/             # Next.js web UI
├── services/
│   └── cloud/           # Cloud API service
├── packages/
│   └── mcp-client/      # MCP client library
├── shared/
│   └── harvest-util/    # Shared harvest utilities
├── integrations/
│   └── widgetdc/        # WidgeTDC integration
├── mcp-backend/         # MCP server
└── sca-01-phase4/       # Phase 4 mesh modules
```

## 🔌 WidgeTDC Integration

This agent integrates with WidgeTDC for data harvesting:

| Feature | Local Agent | WidgeTDC |
|---------|-------------|----------|
| Planning | ROMA Engine | - |
| Orchestration | DesktopAgent | - |
| Harvesting | - | Harvest Adapters |
| MCP Tools | MCP Client | MCP Server |

## 🛠️ Quick Commands

```bash
# Development
npm run dev              # Start desktop app
npm run dev:cli          # Start CLI
npm run dev:web          # Start web UI

# Build
npm run build            # Build all
npm run build:desktop    # Desktop only

# Testing
npm run test             # Run tests
npm run test:smoke       # Smoke tests

# Linting
npm run lint             # ESLint
npm run lint:fix         # Auto-fix
npm run typecheck        # TypeScript check
```

## 🤖 Autonomous Agent Rules

1. **SOLVE DIRECTLY** - Don't ask questions, implement solutions
2. **ERROR HANDLING** - Every operation needs try-catch
3. **SELF-HEALING** - Auto-detect and fix issues
4. **LOGGING** - All actions logged

## 📊 ROMA Engine

The ROMA (Reasoning + Orchestration + Memory + Actions) engine provides:

- **ReAct Strategy**: Reasoning + Action planning
- **CoT Strategy**: Chain of Thought reasoning
- **Harvest Skills**: 12 registered harvest tools
- **Caching**: LRU cache for efficiency

## 🔐 Environment Variables

```env
# WidgeTDC Integration
WIDGETDC_URL=http://localhost:3001
WIDGETDC_API_KEY=<optional>

# ROMA
ROMA_DEFAULT_STRATEGY=react
ROMA_MAX_STEPS=20

# Development
NODE_ENV=development
DEBUG=roma:*
```

## 📝 Git Commit Convention

```
feat(scope): add new feature
fix(scope): bug fix
docs(scope): documentation update
refactor(scope): code refactoring
test(scope): add tests
chore(scope): maintenance
```

Scopes: `desktop`, `cli`, `web`, `roma`, `mcp`, `harvest`

---

**Last Updated**: 2026-01-10
**Agent Mode**: TOTAL AUTONOMY ENABLED

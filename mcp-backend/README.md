# mcp-backend

Fastify API that runs the Finisher agent with **real** MCP tools (no mocks).

## Quick Start

```bash
cd mcp-backend
npm install
npm run build
npm start
```

Health check:

```bash
curl http://127.0.0.1:8787/health
```

## Environment Variables

Copy `env.example` to your own env file and edit values:

```bash
cp env.example .env
```

Important variables:

- `PORT`, `HOST`: server bind settings
- `SCA_REPO_ROOT`: monorepo root (recommended when running from subdirs)
- `OLLAMA_HOST`, `OLLAMA_MODEL`: Ollama connection/model
- `SCA_TOOLSERVER_CMD`, `SCA_TOOLSERVER_ARGS`, `SCA_TOOLSERVER_PATH`: MCP tool server launch config
- `SCA_ALLOW_WRITE`, `SCA_ALLOW_EXEC`: permissions

## Health Check

- `GET /health`: always returns 200 when the process is running.



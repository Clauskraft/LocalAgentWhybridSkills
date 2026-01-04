# WidgetDC Integration (Desktop)

This document describes how the **SCA-01 desktop app** integrates with **WidgetDC** via MCP.

## Overview

The catalog entry **“WidgetDC Core”** runs:

- `build/mcp/widgetdc-server.js`

That entrypoint supports **two modes**, chosen at runtime:

- **Cyberstreams proxy mode (external MCP server)**: forwards MCP over stdio to a real WidgetDC MCP server you provide.
- **Native HTTP mode (no external MCP server)**: exposes minimal safe HTTP-backed tools when Cockpit and/or Worker URLs are configured.

## Configuration Sources (precedence)

1. **Environment variables** (highest precedence)
2. `config/integrations.json` (under `SCA_CONFIG_DIR`, default `./config`)

## Mode A: Cyberstreams proxy mode (recommended when you have a real MCP server)

### Required

- `WIDGETDC_CYBERSTREAMS_SERVER_PATH` (or `widgetdc.cyberstreams.serverPath` in `integrations.json`)

### Example `config/integrations.json`

```json
{
  "widgetdc": {
    "cyberstreams": { "enabled": true, "serverPath": "C:\\path\\to\\widgetdc-mcp-server.js" },
    "cockpit": { "enabled": false, "url": "http://localhost:3456" },
    "cloudflare": { "enabled": false, "workerUrl": "https://example.invalid" }
  }
}
```

### What happens

- The desktop app spawns `node <serverPath>` and **fully forwards stdio**, because MCP speaks over stdio.

## Mode B: Native HTTP mode (cockpit/worker tools)

Native mode activates when:

- `WIDGETDC_CYBERSTREAMS_SERVER_PATH` is **not** set, and
- `WIDGETDC_COCKPIT_URL` and/or `WIDGETDC_WORKER_URL` is set (via env or `integrations.json`)

### Tools exposed

- **`widgetdc.cockpit.request`**
- **`widgetdc.worker.request`**

### Input schema

- **`path`** (string, required): must start with `/`
- **`method`** (`"GET"|"POST"`, optional, default `"GET"`)
- **`query`** (record of strings, optional)
- **`body`** (any, optional; only used for `POST`)

### Safety constraints

- **No traversal**: `path` must not contain `..`
- **Same-origin enforced**: computed URL must stay on the configured base URL origin
- **Timeout**: requests abort after ~10 seconds

### Output format

Returns one text content block containing JSON with:

- `url`, `status`, `ok`, `contentType`, `body`

## How to verify (health check)

From `apps/desktop/`:

```bash
npm run test -c vitest.config.ts
```

The integration tests include:

- proxy mode (`widgetdc.ping` from a dummy MCP server)
- native mode (`widgetdc.cockpit.request` against a local HTTP server)



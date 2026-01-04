# Environment Variables (Desktop)

This repo uses **two different runtime contexts**:

- **Electron (desktop app)**: reads normal environment variables (no `VITE_` prefix required).
- **Vite/Browser dev mode** (`npm run dev:renderer`): only exposes variables prefixed with `VITE_` to the renderer bundle.

## Browser / Vite (Renderer) variables

- **`VITE_BACKEND_URL`**: Optional cloud backend base URL used when running the renderer in a normal browser (no Electron IPC).
  - **Notes**:
    - Do **not** put secrets in `VITE_` variables (they are bundled into the browser build).
    - If `useCloud` is enabled in Settings and `VITE_BACKEND_URL` is empty, chat will fail with a clear error.

## Electron (Main) variables

- **`SCA_USE_CLOUD`**: `true|false` to prefer backend for chat/tool execution.
- **`SCA_BACKEND_URL`**: Cloud backend base URL (Railway URL).
- **`OLLAMA_HOST`**: Ollama host URL (default `http://localhost:11434`).
- **`OLLAMA_MODEL`**: Default Ollama model name.

## Desktop security / policy variables (Electron + CLI)

These are read by the policy engine. Defaults are conservative.

- **`SCA_FULL_ACCESS`**: `true|false` to allow operations outside safe directories (still gated by approval for high-risk actions).
- **`SCA_AUTO_APPROVE`**: `true|false` to auto-approve high-risk actions (**dangerous**; do not use in production).
- **`SCA_SAFE_DIRS`**: Comma-separated list of safe directories (default `"."`).
- **`SCA_LOG_DIR`**: Directory for audit logs (default `./logs`).

## Desktop integrations (MCP servers)

The desktop app can launch additional MCP servers (stdio) from the UI catalog. Some of them are configured via `config/integrations.json` (copy from `config/integrations.example.json`).

- **`SCA_CONFIG_DIR`**: Directory containing `integrations.json` (default `./config`).

### WidgetDC / WidgetTDC

The **WidgetDC Core** catalog entry runs `build/mcp/widgetdc-server.js` and supports two modes:

1. **Cyberstreams proxy mode** (external MCP server): forwards stdio to your real WidgetDC MCP server
2. **Native HTTP mode** (no external MCP server): exposes minimal safe HTTP-backed tools when Cockpit/Worker URLs are configured

See `docs/WIDGETDC.md` for full details.

- **`WIDGETDC_CYBERSTREAMS_SERVER_PATH`**: Absolute path to the real WidgetDC MCP server entrypoint (overrides `integrations.json`).
- **`WIDGETDC_COCKPIT_URL`**: Optional URL for cockpit UI/API (populated from `integrations.json` when enabled).
- **`WIDGETDC_WORKER_URL`**: Optional Cloudflare Worker base URL (populated from `integrations.json` when enabled).

#### Native HTTP tools

When `WIDGETDC_COCKPIT_URL` and/or `WIDGETDC_WORKER_URL` is configured (and no `WIDGETDC_CYBERSTREAMS_SERVER_PATH` is set), the shim exposes:

- **`widgetdc.cockpit.request`**
- **`widgetdc.worker.request`**

Both tools only accept a relative `path` starting with `/` (no `..` traversal) and enforce same-origin with the configured base URL. Requests time out after ~10 seconds.



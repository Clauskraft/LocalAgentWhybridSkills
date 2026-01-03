# Environment Variables (Phase 2)

This repo uses **two different runtime contexts**:

- **Electron (desktop app)**: reads normal environment variables (no `VITE_` prefix required).
- **Vite/Browser dev mode** (`npm run dev:renderer`): only exposes variables prefixed with `VITE_` to the renderer bundle.

## Browser / Vite (Renderer) variables

- **`VITE_BACKEND_URL`**: Optional Phase 3 backend base URL used when running the renderer in a normal browser (no Electron IPC).
  - **Example**: `https://sca-01-phase3-production.up.railway.app`
  - **Notes**:
    - Do **not** put secrets in `VITE_` variables (they are bundled into the browser build).
    - If `useCloud` is enabled in Settings and `VITE_BACKEND_URL` is empty, chat will fail with a clear error.

## Electron (Main) variables

- **`SCA_USE_CLOUD`**: `true|false` to prefer backend for chat/tool execution.
- **`SCA_BACKEND_URL`**: Phase 3 backend base URL.
- **`OLLAMA_HOST`**: Ollama host URL (default `http://localhost:11434`).
- **`OLLAMA_MODEL`**: Default Ollama model name.

## Desktop integrations (MCP servers)

Phase 2 can launch additional MCP servers (stdio) from the UI catalog. Some of them are configured via `config/integrations.json` (copy from `config/integrations.example.json`).

- **`SCA_CONFIG_DIR`**: Directory containing `integrations.json` (default `./config`).

### WidgetDC / WidgetTDC

The **WidgetDC Core** catalog entry is a small shim (`build/mcp/widgetdc-server.js`) that forwards MCP over stdio to your real WidgetDC server.

- **`WIDGETDC_CYBERSTREAMS_SERVER_PATH`**: Absolute path to the real WidgetDC MCP server entrypoint (overrides `integrations.json`).
- **`WIDGETDC_COCKPIT_URL`**: Optional URL for cockpit UI/API (populated from `integrations.json` when enabled).
- **`WIDGETDC_WORKER_URL`**: Optional Cloudflare Worker base URL (populated from `integrations.json` when enabled).



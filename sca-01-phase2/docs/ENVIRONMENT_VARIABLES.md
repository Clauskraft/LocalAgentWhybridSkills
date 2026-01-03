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



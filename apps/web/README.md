# SCA-01 Web UI

Browser-based UI (Open WebUI-style) for the SCA-01 Cloud API.

## Quick start

```bash
cd apps/web
npm install
npm run dev
```

## Configuration

Copy `env.example` to `.env.local` and set:

- **`VITE_API_BASE_URL`**: your Cloud API base URL (Railway)

## Notes

- The Cloud API must allow your web origin via `CORS_ORIGINS` on the server.

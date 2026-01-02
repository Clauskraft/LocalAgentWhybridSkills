# @local-agent/health

Shared health check types and utilities for Local Agent services.

## Features

- Standardized health response format
- Readiness check support
- Health check aggregation
- Consistent status codes

## Usage

```typescript
import { createHealthResponse, createReadyResponse } from "@local-agent/health";

// Simple health check
app.get("/health", async () => {
  return createHealthResponse("my-service", { version: "1.0.0" });
});

// Health check with dependencies
app.get("/health", async () => {
  return createHealthResponse("my-service", {
    version: "1.0.0",
    checks: {
      database: { status: "ok" },
      cache: { status: "degraded", message: "Slow response" }
    }
  });
});

// Readiness check
app.get("/ready", async () => {
  return createReadyResponse("my-service", {
    database: { status: "ok" }
  });
});
```

## Response Format

### Health Response
```json
{
  "status": "ok" | "degraded" | "unhealthy",
  "timestamp": "2026-01-02T12:00:00.000Z",
  "service": "service-name",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": { "status": "ok" },
    "cache": { "status": "degraded", "message": "Slow response" }
  }
}
```

### Ready Response
```json
{
  "status": "ready" | "degraded",
  "timestamp": "2026-01-02T12:00:00.000Z",
  "service": "service-name",
  "checks": {
    "database": { "status": "ok" }
  }
}
```


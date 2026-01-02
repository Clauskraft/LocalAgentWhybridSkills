# @local-agent/fastify-middleware

Shared Fastify middleware plugin for Local Agent services.

## Features

- CORS configuration
- Rate limiting
- Consistent setup across services

## Usage

### As a function

```typescript
import { registerMiddleware } from "@local-agent/fastify-middleware";

await registerMiddleware(app, {
  cors: {
    enabled: true,
    origins: ["http://localhost:3000"],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  rateLimit: {
    enabled: true,
    max: 60,
    timeWindow: "1 minute",
  },
});
```

### As a plugin

```typescript
import middlewarePlugin from "@local-agent/fastify-middleware";

await app.register(middlewarePlugin, {
  cors: {
    enabled: true,
    origins: ["http://localhost:3000"],
  },
  rateLimit: {
    enabled: true,
    max: 60,
    timeWindow: "1 minute",
  },
});
```

### Advanced rate limiting

```typescript
await registerMiddleware(app, {
  rateLimit: {
    enabled: true,
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (req) => (req.headers["x-real-ip"] as string) || (req.ip ?? "unknown"),
    allowList: (req) => (req.headers["x-rate-limit-allow"] as string) === "true",
  },
});
```

## Configuration

### CORS Options

- `enabled`: Enable CORS (default: `false`)
- `origins`: Array of allowed origins (required if enabled)
- `methods`: Allowed HTTP methods (default: `["GET", "POST", "OPTIONS"]`)
- `allowedHeaders`: Allowed headers (default: `["Content-Type", "Authorization"]`)
- `credentials`: Allow credentials (default: `true`)

### Rate Limit Options

- `enabled`: Enable rate limiting (default: `false`)
- `max`: Maximum requests per time window (default: `60`)
- `timeWindow`: Time window string (default: `"1 minute"`)
- `keyGenerator`: Custom key generator function (optional)
- `allowList`: Custom allow list function (optional)


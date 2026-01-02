# @local-agent/config-utils

Shared configuration parsing utilities for Local Agent services.

## Features

- Safe integer parsing with fallback
- Boolean parsing with multiple format support
- Comma-separated list parsing
- Consistent behavior across all services

## Usage

```typescript
import { parseIntSafe, parseBool, parseList } from "@local-agent/config-utils";

const port = parseIntSafe(process.env.PORT, 3000);
const enabled = parseBool(process.env.ENABLED, false);
const origins = parseList(process.env.CORS_ORIGINS, []);
```

## API

### `parseIntSafe(value, fallback)`

Safely parse an integer from a string, returning a fallback if invalid.

### `parseBool(value, fallback)`

Parse a boolean from a string. Supports:
- Truthy: `"true"`, `"1"`, `"yes"`
- Falsy: `"false"`, `"0"`, `"no"`

### `parseList(value, fallback?)`

Parse a comma-separated list of strings. Returns an array of trimmed, non-empty strings.


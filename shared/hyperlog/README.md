# @local-agent/hyperlog

Shared logging library for Local Agent services.

## Features

- Structured JSON logging to files
- Security event separation (compliance)
- Request ID support
- Debug level logging
- Backward compatible API (supports both `code` and `event` parameter names)

## Usage

```typescript
import { HyperLog } from "@local-agent/hyperlog";

const log = new HyperLog("./logs", "app.jsonl");

// All methods accept (eventOrCode, message, context?)
log.info("api.request", "Processing request", { userId: "123" });
log.warn("api.timeout", "Request timed out");
log.error("api.error", "Failed to process", { error: err.message });
log.security("auth.failed", "Invalid login attempt", { ip: "1.2.3.4" });
log.debug("api.debug", "Debug information", { data: {...} });
```

## Backward Compatibility

The library accepts both `code` and `event` as the first parameter name for backward compatibility with existing codebases.


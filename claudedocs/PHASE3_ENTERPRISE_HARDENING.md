# Phase 3: Enterprise Hardening Plan

**Generated**: 2026-01-07
**Status**: Planning Complete - Ready for Implementation

---

## Executive Summary

Enterprise hardening focuses on:
1. **CI/CD Improvements** - Automated validation, docs sync, Dependabot management
2. **Security Hardening** - Signature verification, rate limiting, audit logging
3. **Monitoring & Observability** - Metrics, tracing, alerting

---

## 3A: CI/CD Improvements

### 3A.1: Documentation Validation

**Problem**: README scripts drift from actual package.json commands

**Solution**: Add CI step that validates documentation accuracy

```yaml
# .github/workflows/docs-validation.yml
name: Docs Validation

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate README scripts
        run: |
          # Extract scripts from package.json
          SCRIPTS=$(jq -r '.scripts | keys[]' apps/desktop/package.json)

          # Check README mentions correct scripts
          for script in dev:ui build test lint; do
            if ! grep -q "npm run $script" README.md; then
              echo "Warning: $script not documented in README"
            fi
          done

      - name: Check env var documentation
        run: |
          # Find all env var references in code
          ENV_VARS=$(grep -roh 'process.env.[A-Z_]*' apps/desktop/src/ | sort -u)

          # Verify they're documented
          for var in $ENV_VARS; do
            VAR_NAME=$(echo $var | sed 's/process.env.//')
            if ! grep -q "$VAR_NAME" apps/desktop/README.md; then
              echo "Warning: $VAR_NAME not documented"
            fi
          done
```

### 3A.2: Dependabot Automation

**Problem**: 27 Dependabot PRs accumulated without systematic testing

**Solution**: Auto-test and auto-merge non-breaking updates

```yaml
# .github/workflows/dependabot-auto.yml
name: Dependabot Auto-merge

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  pull-requests: write
  contents: write

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install and test
        run: |
          npm ci
          npm run build
          npm test

      - name: Auto-merge patch/minor updates
        if: success()
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Only auto-merge patch and minor updates
          PR_TITLE="${{ github.event.pull_request.title }}"
          if [[ "$PR_TITLE" =~ "bump.*from [0-9]+\.[0-9]+\.[0-9]+ to [0-9]+\.[0-9]+\." ]]; then
            gh pr merge ${{ github.event.pull_request.number }} --merge
          fi
```

### 3A.3: E2E Tests in Release Pipeline

**Current**: Manual testing before release
**Target**: Automated E2E in release workflow

```yaml
# .github/workflows/release.yml additions
jobs:
  e2e:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    steps:
      - uses: actions/checkout@v4

      - name: Build desktop app
        run: |
          cd apps/desktop
          npm ci
          npm run build:ui
          npm run build:electron

      - name: Run E2E tests
        run: |
          cd apps/desktop
          npm run test:e2e

      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-screenshots-${{ matrix.os }}
          path: apps/desktop/test-results/
```

---

## 3B: Security Hardening

### 3B.1: Message Signature Verification (Agent-Mesh)

**Purpose**: Verify agent messages are from trusted sources

```typescript
// sca-01-phase4/src/security/messageSignature.ts

import { createSign, createVerify, generateKeyPairSync } from 'crypto';

export interface SignedMessage {
  payload: unknown;
  signature: string;
  publicKey: string;
  timestamp: number;
}

export class MessageSigner {
  private privateKey: string;
  public publicKey: string;

  constructor() {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    this.privateKey = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    this.publicKey = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  }

  sign(payload: unknown): SignedMessage {
    const data = JSON.stringify(payload);
    const sign = createSign('ed25519');
    sign.update(data);

    return {
      payload,
      signature: sign.sign(this.privateKey, 'base64'),
      publicKey: this.publicKey,
      timestamp: Date.now()
    };
  }
}

export function verifyMessage(message: SignedMessage, trustedKeys: string[]): boolean {
  if (!trustedKeys.includes(message.publicKey)) {
    return false; // Unknown key
  }

  // Check timestamp (5 minute window)
  if (Math.abs(Date.now() - message.timestamp) > 5 * 60 * 1000) {
    return false; // Replay attack
  }

  const verify = createVerify('ed25519');
  verify.update(JSON.stringify(message.payload));
  return verify.verify(message.publicKey, message.signature, 'base64');
}
```

### 3B.2: Rate Limiting Per Agent

**Purpose**: Prevent any single agent from overwhelming the mesh

```typescript
// sca-01-phase4/src/security/rateLimiter.ts

interface RateLimitConfig {
  windowMs: number;      // Time window in ms
  maxRequests: number;   // Max requests per window
}

export class AgentRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }) {
    this.config = config;
  }

  isAllowed(agentId: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(agentId) ?? [];

    // Remove old timestamps
    const recent = timestamps.filter(t => now - t < this.config.windowMs);

    if (recent.length >= this.config.maxRequests) {
      return false;
    }

    recent.push(now);
    this.requests.set(agentId, recent);
    return true;
  }

  getRemaining(agentId: string): number {
    const timestamps = this.requests.get(agentId) ?? [];
    const now = Date.now();
    const recent = timestamps.filter(t => now - t < this.config.windowMs);
    return Math.max(0, this.config.maxRequests - recent.length);
  }
}
```

### 3B.3: Audit Log Aggregation

**Purpose**: Central logging of all security-relevant events

```typescript
// sca-01-phase4/src/security/auditLog.ts

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface AuditEvent {
  timestamp: string;
  eventType: 'auth' | 'tool_call' | 'config_change' | 'error' | 'rate_limit';
  agentId: string;
  action: string;
  details: Record<string, unknown>;
  success: boolean;
  ipAddress?: string;
}

export class AuditLogger {
  private logDir: string;

  constructor(logDir: string = './logs/audit') {
    this.logDir = logDir;
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  }

  log(event: Omit<AuditEvent, 'timestamp'>): void {
    const entry: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    const filename = `audit-${new Date().toISOString().split('T')[0]}.jsonl`;
    const filepath = join(this.logDir, filename);

    appendFileSync(filepath, JSON.stringify(entry) + '\n');

    // Also emit for real-time monitoring
    if (!event.success || event.eventType === 'rate_limit') {
      console.warn('[AUDIT]', JSON.stringify(entry));
    }
  }
}

// Integration with MeshOrchestrator
// orchestrator.on('toolCall', (req, res) => {
//   auditLogger.log({
//     eventType: 'tool_call',
//     agentId: req.sourceAgentId,
//     action: `${req.targetAgentId}:${req.toolName}`,
//     details: { requestId: req.requestId, duration: res.durationMs },
//     success: res.success
//   });
// });
```

---

## 3C: Monitoring & Observability

### Metrics Collection

```typescript
// sca-01-phase4/src/monitoring/metrics.ts

interface Metrics {
  // Agent metrics
  agentsOnline: number;
  agentsTotal: number;
  connectionErrors: number;

  // Request metrics
  requestsTotal: number;
  requestsSuccess: number;
  requestsFailed: number;
  avgLatencyMs: number;
  p99LatencyMs: number;

  // System metrics
  memoryUsageMb: number;
  cpuPercent: number;
}

export class MetricsCollector {
  private latencies: number[] = [];
  private counters = {
    requestsTotal: 0,
    requestsSuccess: 0,
    requestsFailed: 0,
    connectionErrors: 0
  };

  recordRequest(success: boolean, latencyMs: number): void {
    this.counters.requestsTotal++;
    if (success) {
      this.counters.requestsSuccess++;
    } else {
      this.counters.requestsFailed++;
    }

    this.latencies.push(latencyMs);
    if (this.latencies.length > 1000) {
      this.latencies.shift();
    }
  }

  getMetrics(orchestrator: MeshOrchestrator): Metrics {
    const status = orchestrator.getStatus();
    const sorted = [...this.latencies].sort((a, b) => a - b);

    return {
      agentsOnline: status.online,
      agentsTotal: status.total,
      connectionErrors: this.counters.connectionErrors,
      requestsTotal: this.counters.requestsTotal,
      requestsSuccess: this.counters.requestsSuccess,
      requestsFailed: this.counters.requestsFailed,
      avgLatencyMs: sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
      p99LatencyMs: sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : 0,
      memoryUsageMb: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuPercent: 0 // Would need os-level integration
    };
  }
}
```

### Health Endpoint Enhancement

```typescript
// Add to meshOrchestrator.ts

async getHealthReport(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
  metrics: Metrics;
}> {
  const metrics = this.metricsCollector.getMetrics(this);

  const checks = {
    agentsConnected: metrics.agentsOnline > 0,
    errorRateLow: metrics.requestsFailed / Math.max(1, metrics.requestsTotal) < 0.05,
    latencyAcceptable: metrics.p99LatencyMs < 5000,
    memoryOk: metrics.memoryUsageMb < 512
  };

  const failedChecks = Object.values(checks).filter(v => !v).length;
  const status = failedChecks === 0 ? 'healthy' : failedChecks < 2 ? 'degraded' : 'unhealthy';

  return { status, checks, metrics };
}
```

---

## Implementation Checklist

### CI/CD (3A)
- [ ] 3A.1: Add docs validation workflow
- [ ] 3A.2: Configure Dependabot auto-merge
- [ ] 3A.3: Add E2E tests to release pipeline

### Security (3B)
- [ ] 3B.1: Implement message signature verification
- [ ] 3B.2: Add rate limiting per agent
- [ ] 3B.3: Create audit log aggregation

### Monitoring (3C)
- [ ] Metrics collection infrastructure
- [ ] Enhanced health endpoints
- [ ] Alerting integration (optional)

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `.github/workflows/docs-validation.yml` | Create | Validate docs accuracy |
| `.github/workflows/dependabot-auto.yml` | Create | Auto-merge safe updates |
| `.github/workflows/release.yml` | Modify | Add E2E testing |
| `sca-01-phase4/src/security/messageSignature.ts` | Create | Sign/verify messages |
| `sca-01-phase4/src/security/rateLimiter.ts` | Create | Per-agent rate limits |
| `sca-01-phase4/src/security/auditLog.ts` | Create | Centralized audit logging |
| `sca-01-phase4/src/monitoring/metrics.ts` | Create | Metrics collection |

---

## Estimated Effort

| Area | Task | Effort |
|------|------|--------|
| CI/CD | Docs validation | 2 hours |
| CI/CD | Dependabot auto | 2 hours |
| CI/CD | E2E in release | 4 hours |
| Security | Message signing | 4 hours |
| Security | Rate limiting | 2 hours |
| Security | Audit logging | 3 hours |
| Monitoring | Metrics | 3 hours |
| **Total** | | **~20 hours** |

---

## Priority Matrix

| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| Dependabot auto-merge | High | Low | P1 |
| Rate limiting | High | Low | P1 |
| Audit logging | High | Medium | P1 |
| Docs validation | Medium | Low | P2 |
| Message signing | Medium | Medium | P2 |
| E2E in release | Medium | Medium | P2 |
| Metrics | Low | Medium | P3 |

# SCA-01 Implementation Workflow

**Generated**: 2026-01-07
**Source**: Gap Analysis Report
**Strategy**: Systematic with parallel opportunities

---

## 📊 Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SCA-01 IMPLEMENTATION ROADMAP                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 0: Housekeeping (1-2 days)                                           │
│  ├── PR Triage & Dependency Updates                                         │
│  ├── Branch Cleanup (develop sync/delete)                                   │
│  └── Documentation Sync                                                     │
│       ↓                                                                     │
│  PHASE 1: Core Services (1 week) ←─── Can run in PARALLEL                   │
│  ├── [A] ROMA Integration                                                   │
│  ├── [B] Search Service                                                     │
│  └── [C] Desktop Polish                                                     │
│       ↓                                                                     │
│  PHASE 2: Agent-Mesh (2-3 weeks)                                            │
│  ├── WebSocket Transport                                                    │
│  ├── Agent-to-Agent Communication                                           │
│  └── Discovery Service                                                      │
│       ↓                                                                     │
│  PHASE 3: Enterprise Hardening (Ongoing)                                    │
│  ├── CI/CD Improvements                                                     │
│  ├── Security Audit                                                         │
│  └── Documentation Automation                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Housekeeping

**Duration**: 1-2 days
**Priority**: P1
**Dependencies**: None
**Parallel**: Yes (all tasks independent)

### 0.1 PR Triage & Merge

| Task | PRs | Risk | Action |
|------|-----|------|--------|
| CI Actions | #1-4 | Low | Merge all |
| Anthropic SDK | #31 | Low | Merge (review changelog) |
| Desktop deps | #32, #33 | Low | Merge |
| Zod v4 | #22, #27, #34 | Medium | Test first, then merge |

```bash
# Suggested order:
gh pr merge 1 2 3 4 --merge      # CI Actions
gh pr merge 31 32 33 --merge     # Desktop safe deps
# Then test:
npm run build && npm test
gh pr merge 22 27 34 --merge     # Zod v4 (breaking)
```

### 0.2 Branch Cleanup

```bash
# Option A: Sync develop
git checkout develop
git merge main
git push origin develop

# Option B: Delete stale branch
git branch -d develop
git push origin --delete develop
```

### 0.3 Documentation Sync

| File | Issue | Fix |
|------|-------|-----|
| `README.md` | Wrong scripts | Update to `dev:ui`, `npm start` |
| `apps/desktop/README.md` | Missing env vars | Add `SCA_ALLOW_*` vars |
| `docs/ARCHITECTURE.md` | Port mismatch | Note default 8787, Railway 3000 |

---

## Phase 1: Core Services

**Duration**: 1 week
**Priority**: P1
**Dependencies**: Phase 0
**Parallel**: Yes (1A, 1B, 1C can run simultaneously)

### 1A: ROMA Integration

**Files**: `services/roma-bridge/`
**Status**: ✅ Tool loading implemented (ad2ea77)
**Remaining**:

```
┌─────────────────────────────────────────┐
│ 1A.1 Install roma_dspy dependency       │ → Blocked by private repo access
├─────────────────────────────────────────┤
│ 1A.2 Configure DSPy LM connection       │ → Requires ROMA_MODEL env
├─────────────────────────────────────────┤
│ 1A.3 Test plan/act endpoints            │ → After 1A.1 + 1A.2
├─────────────────────────────────────────┤
│ 1A.4 Connect Desktop UI to live backend │ → After 1A.3
└─────────────────────────────────────────┘
```

**Environment Setup**:
```bash
# .env for ROMA
ROMA_MODEL=openrouter/anthropic/claude-3.5-sonnet
ROMA_TEMPERATURE=0.1
ROMA_MAX_TOKENS=600
ROMA_TOOLS_CONFIG=/path/to/tools.json  # Optional
```

**Verification**:
```bash
curl http://localhost:8000/health
# Expected: {"roma_available": true, "tools_count": 4}

curl -X POST http://localhost:8000/plan \
  -H "Content-Type: application/json" \
  -d '{"goal": "Test planning", "strategy": "react"}'
```

---

### 1B: Search Service

**Files**: `services/search/`
**Status**: ✅ Multi-backend implemented (ad2ea77)
**Remaining**:

```
┌─────────────────────────────────────────┐
│ 1B.1 Deploy SQLite backend for dev      │ ✅ Done (default fallback)
├─────────────────────────────────────────┤
│ 1B.2 Stand up OpenSearch cluster        │ → Infrastructure task
├─────────────────────────────────────────┤
│ 1B.3 Implement OpenSearch wrapper       │ → After 1B.2
├─────────────────────────────────────────┤
│ 1B.4 Add semantic embeddings            │ → Optional, enhances search
└─────────────────────────────────────────┘
```

**Environment Options**:
```bash
# Development (in-memory)
SEARCH_BACKEND=memory

# Local persistence (SQLite FTS5)
SEARCH_BACKEND=sqlite
SQLITE_DB_PATH=./search_index.db

# Production (OpenSearch)
SEARCH_BACKEND=opensearch
OPENSEARCH_URL=https://your-opensearch-cluster:9200
```

**Verification**:
```bash
# Test upsert
curl -X POST http://localhost:8000/upsert \
  -H "Content-Type: application/json" \
  -d '{"documents": [{"content": "Test document about AI agents"}]}'

# Test query
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "AI agents", "limit": 5}'

# Check stats
curl http://localhost:8000/stats
```

---

### 1C: Desktop Polish

**Files**: `apps/desktop/`
**Status**: ✅ Lint fixed (ad2ea77)
**Remaining**:

```
┌─────────────────────────────────────────┐
│ 1C.1 Fix autoUpdater ESM/CJS issue      │ → Medium effort
├─────────────────────────────────────────┤
│ 1C.2 Add search status indicator        │ → Show backend mode in UI
├─────────────────────────────────────────┤
│ 1C.3 Connect ROMA planner to live API   │ → After 1A complete
└─────────────────────────────────────────┘
```

**autoUpdater Fix Strategy**:
```typescript
// Option A: Dynamic import
const initUpdater = async () => {
  const { autoUpdater } = await import('electron-updater');
  // Configure...
};

// Option B: Conditional require in CJS context
if (typeof require !== 'undefined') {
  const { autoUpdater } = require('electron-updater');
}
```

---

## Phase 2: Agent-Mesh

**Duration**: 2-3 weeks
**Priority**: P2
**Dependencies**: Phase 1
**Parallel**: Partial (2A → 2B, 2C can parallel with 2B)

### 2A: WebSocket Transport

**Files**: `sca-01-phase4/`
**Effort**: 1 week

```
┌─────────────────────────────────────────┐
│ 2A.1 Define WS protocol spec            │
├─────────────────────────────────────────┤
│ 2A.2 Implement WS server in mesh        │
├─────────────────────────────────────────┤
│ 2A.3 Implement WS client adapter        │
├─────────────────────────────────────────┤
│ 2A.4 Add reconnection & heartbeat       │
├─────────────────────────────────────────┤
│ 2A.5 Integration tests                  │
└─────────────────────────────────────────┘
```

### 2B: Agent-to-Agent Communication

**Files**: `sca-01-phase4/`
**Effort**: 1 week
**Dependencies**: 2A

```
┌─────────────────────────────────────────┐
│ 2B.1 Define agent addressing scheme     │
├─────────────────────────────────────────┤
│ 2B.2 Implement message routing          │
├─────────────────────────────────────────┤
│ 2B.3 Add request/response correlation   │
├─────────────────────────────────────────┤
│ 2B.4 Implement broadcast/multicast      │
└─────────────────────────────────────────┘
```

### 2C: Discovery Service

**Files**: `sca-01-phase4/`
**Effort**: 1 week
**Parallel with**: 2B

```
┌─────────────────────────────────────────┐
│ 2C.1 Define agent registry schema       │
├─────────────────────────────────────────┤
│ 2C.2 Implement registration endpoints   │
├─────────────────────────────────────────┤
│ 2C.3 Add health checking/TTL            │
├─────────────────────────────────────────┤
│ 2C.4 Implement capability advertising   │
└─────────────────────────────────────────┘
```

---

## Phase 3: Enterprise Hardening

**Duration**: Ongoing
**Priority**: P3
**Dependencies**: Phases 1-2

### 3A: CI/CD Improvements

```
┌─────────────────────────────────────────┐
│ 3A.1 Add docs validation to CI          │ → Catch script drift
├─────────────────────────────────────────┤
│ 3A.2 Automate Dependabot PR testing     │ → Auto-merge if green
├─────────────────────────────────────────┤
│ 3A.3 Add E2E tests to release pipeline  │
└─────────────────────────────────────────┘
```

### 3B: Security Hardening

```
┌─────────────────────────────────────────┐
│ 3B.1 Signature verification (mesh)      │
├─────────────────────────────────────────┤
│ 3B.2 Rate limiting per agent            │
├─────────────────────────────────────────┤
│ 3B.3 Audit log aggregation              │
└─────────────────────────────────────────┘
```

---

## 📋 Quick Reference: Commands

### Development
```bash
# Start all services locally
npm run dev:ui                    # Desktop
cd services/roma-bridge && uvicorn bridge_api:app --reload
cd services/search && uvicorn search_api:app --reload

# Run tests
npm run test                      # All packages
npm --prefix apps/desktop test    # Desktop only
```

### Validation
```bash
# Lint check
npm --prefix apps/desktop run lint

# Build check
npm --prefix apps/desktop run build

# E2E tests
npm --prefix apps/desktop run test:e2e
```

### Deployment
```bash
# Desktop packaging
npm --prefix apps/desktop run build:ui
npm --prefix apps/desktop run build:electron

# Railway deployment
railway up                        # services/cloud
```

---

## 📅 Timeline Summary

| Phase | Duration | Start | Parallel |
|-------|----------|-------|----------|
| Phase 0 | 1-2 days | Now | ✅ All tasks |
| Phase 1 | 1 week | After P0 | ✅ 1A, 1B, 1C |
| Phase 2 | 2-3 weeks | After P1 | Partial |
| Phase 3 | Ongoing | After P2 | ✅ All tasks |

**Total to Feature Complete**: ~4-5 weeks
**Minimum Viable (P0+P1)**: ~1.5 weeks

---

## ✅ Completion Checklist

### Phase 0 ✅ COMPLETE (2026-01-07)
- [x] Merge CI Actions PRs (#1-4)
- [x] Merge safe dependency PRs (#31, #26, #25, #23, #10, #39)
- [x] Merge Zod v4 PRs (#22 CLI, #27 Cloud)
- [x] Delete develop branch (was 92 commits behind)
- [x] Close legacy sca-01-phase* PRs (12 closed)
- [ ] Update documentation (deferred - minor)

### Phase 1 ✅ IMPLEMENTATION COMPLETE
- [x] ROMA: Tool loading implemented (3 config options)
- [x] ROMA: /tools endpoint added
- [ ] ROMA: Install roma_dspy (blocked - private repo)
- [x] Search: Multi-backend implemented (OpenSearch/SQLite/Memory)
- [x] Search: /stats endpoint added
- [x] Desktop: autoUpdater validated (working correctly)
- [x] Desktop: Lint warnings reduced (14 → 4)
- [ ] Desktop: Connect ROMA planner (blocked by roma_dspy)

### Phase 2 📋 DESIGN COMPLETE
- [x] WebSocket protocol spec designed
- [x] Client/Server architecture documented
- [x] Reconnection/heartbeat design complete
- [ ] Implementation (see PHASE2_WEBSOCKET_DESIGN.md)

### Phase 3 📋 PLAN COMPLETE
- [x] CI docs validation plan
- [x] Dependabot automation plan
- [x] Security hardening plan (signatures, rate limiting, audit)
- [ ] Implementation (see PHASE3_ENTERPRISE_HARDENING.md)

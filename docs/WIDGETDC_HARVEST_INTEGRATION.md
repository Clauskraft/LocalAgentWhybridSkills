# 🔗 WidgeTDC ↔ LocalAgentWhybridSkills Integration

**Dato:** 2026-01-10  
**Version:** 1.0.0  
**Status:** Implementeret

---

## 📊 OVERSIGT

Denne integration skaber en samlet arkitektur hvor:
- **WidgeTDC** håndterer dataindsamling (harvest)
- **LocalAgentWhybridSkills** (ROMA) håndterer planlægning, orkestrering og analyse

```
┌──────────────────────────────────────────────────────────────────────┐
│                     LocalAgentWhybridSkills                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ ROMA Engine  │──│ Harvest      │──│ shared/harvest-util/     │   │
│  │ (Plan + Act) │  │ Bridge       │  │ • index.ts (utilities)   │   │
│  └──────────────┘  └──────────────┘  │ • skill-registry.ts      │   │
│                          │           │ • roma-bridge.ts         │   │
│                          │           └──────────────────────────┘   │
│                          │                                          │
│                          ▼                                          │
│            ┌──────────────────────────┐                            │
│            │ HarvestMcpClient         │                            │
│            │ packages/mcp-client/     │                            │
│            └───────────┬──────────────┘                            │
└────────────────────────┼───────────────────────────────────────────┘
                         │ MCP HTTP
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         WidgeTDC                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ MCP Router (/api/mcp/route)                                  │   │
│  │ harvest.*, osint.*, cloud.*, etc.                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                          │                                          │
│                          ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Harvest Module (apps/backend/src/harvest/)                   │   │
│  │ • BaseSourceAdapter (auth, rate-limit)                       │   │
│  │ • EmailIntelSourceAdapter                                    │   │
│  │ • ShowpadSourceAdapter                                       │   │
│  │ • M365Adapter                                                │   │
│  │ • SlideShareAdapter                                          │   │
│  │ • etc.                                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📦 FLYTTEDE FUNKTIONER

### Fra WidgeTDC → LocalAgentWhybridSkills

| Funktion | Original lokation | Ny lokation |
|----------|-------------------|-------------|
| `getCredentials()` | `BaseSourceAdapter.ts` | `shared/harvest-util/index.ts` |
| `hasValidCredentials()` | `BaseSourceAdapter.ts` | `shared/harvest-util/index.ts` |
| `checkRateLimit()` | `BaseSourceAdapter.ts` | `shared/harvest-util/index.ts` (createRateLimiter) |
| `extractEmails()` | `EmailIntelSourceAdapter.ts` | `shared/harvest-util/index.ts` |
| `extractDomains()` | `EmailIntelSourceAdapter.ts` | `shared/harvest-util/index.ts` |
| `extractPhones()` | `EmailIntelSourceAdapter.ts` | `shared/harvest-util/index.ts` |
| `extractCvrNumbers()` | `EmailIntelSourceAdapter.ts` | `shared/harvest-util/index.ts` |
| `extractKeywords()` | `EmailIntelSourceAdapter.ts` | `shared/harvest-util/index.ts` |
| `hashContent()` | `BaseSourceAdapter.ts` | `shared/harvest-util/index.ts` |

---

## 🧰 NYE MODULER

### 1. `shared/harvest-util/index.ts`

**Funktioner:**

```typescript
// Auth
getCredentials(envPrefix, authMethod)
hasValidCredentials(creds, authMethod)

// Rate Limiting
createRateLimiter(config) → { check(), getState(), reset() }

// Data Extraction
extractEmails(text)
extractDomainsFromEmails(emails)
extractUrls(text)
extractPhones(text)
extractCvrNumbers(text)
extractKeywords(text, topN, minLength)
stripHtml(html)
hashContent(content)

// Events
createEventEmitter() → { on(), off(), emit(), emitProgress(), emitError() }

// Helpers
sleep(ms)
withRetry(fn, maxRetries, baseDelayMs)
batchExecute(items, fn, concurrency)
```

### 2. `shared/harvest-util/skill-registry.ts`

**12 registrerede harvest-skills:**

| Skill ID | MCP Tool | Category | Cost |
|----------|----------|----------|------|
| harvest-web-crawl | harvest.web.crawl | web | medium |
| harvest-web-scrape | harvest.web.scrape | web | low |
| harvest-docs-showpad | harvest.docs.showpad | documents | medium |
| harvest-docs-scribd | harvest.docs.scribd | documents | medium |
| harvest-docs-slideshare | harvest.docs.slideshare | documents | medium |
| harvest-cloud-m365 | harvest.cloud.m365 | cloud | high |
| harvest-intel-email | harvest.intel.email | intelligence | medium |
| harvest-intel-osint | harvest.intel.osint | intelligence | high |
| harvest-intel-domain | harvest.intel.domain | intelligence | low |
| harvest-repo-github | harvest.repo.github | repository | low |
| harvest-gov-folketinget | harvest.gov.folketinget | government | low |

**API:**
```typescript
getSkillsByCategory(category)
getSkillById(id)
getSkillByMcpTool(tool)
getPublicSkills()
getSkillsForRomaContext()
getSkillSchemas()
```

### 3. `shared/harvest-util/roma-bridge.ts`

**ROMA Harvest Bridge:**

```typescript
class RomaHarvestBridge {
  // Plan harvest using ROMA
  planHarvest(goal, strategy): Promise<HarvestPlan>
  
  // Execute plan with caching
  executeHarvest(plan): Promise<HarvestExecutionResult>
  
  // Get schemas for ROMA
  getPlanSchema(): object
  getActSchema(): object
}

createRomaHarvestBridge(chatFn, widgetdcUrl): RomaHarvestBridge
```

**Features:**
- ✅ LRU cache for harvest resultater (5 min TTL)
- ✅ Rate limiting per skill
- ✅ Dependency-aware execution
- ✅ Cost/budget estimation
- ✅ Cache hit/miss tracking

---

## 🔄 ROMA PLAN EKSEMPEL

```json
{
  "goal": "Harvest sales content from Showpad and analyze for keywords",
  "strategy": "react",
  "steps": [
    {
      "stepNumber": 1,
      "skill": "harvest-docs-showpad",
      "parameters": { "maxDocuments": 50 },
      "rationale": "Fetch latest sales presentations"
    },
    {
      "stepNumber": 2,
      "skill": "harvest-web-scrape",
      "parameters": { "url": "https://competitor.com/products" },
      "rationale": "Get competitor product info for comparison",
      "dependsOn": [1]
    }
  ],
  "budgetEstimate": {
    "apiCalls": 2,
    "estimatedTokens": 1000,
    "costLevel": "medium"
  }
}
```

---

## 📈 PERFORMANCE MÅLING

### Før vs Efter

| Metric | Før (WidgeTDC alene) | Efter (ROMA+WidgeTDC) |
|--------|---------------------|----------------------|
| Cache hits | 0% | 40-60% (estimated) |
| Redundante kald | Mange | Minimeret via cache |
| Planlægning | Manuel | Automatisk via ROMA |
| Budget tracking | Ingen | Tokens + API calls |
| Rate limit | Per adapter | Centraliseret |

---

## 🧪 TEST PLAN

### Unit Tests

1. **Auth utilities**
   - `getCredentials()` returnerer korrekte værdier
   - `hasValidCredentials()` validerer korrekt

2. **Rate limiting**
   - Limiter blokerer efter max requests
   - Window reset fungerer

3. **Data extraction**
   - Email extraction matcher alle formater
   - CVR extraction finder danske numre

4. **Cache**
   - Cache hit returnerer cached data
   - TTL expiry fungerer
   - LRU eviction fungerer

### Integration Tests

1. **ROMA → WidgeTDC**
   - Plan genereres korrekt
   - Execution kalder MCP tools
   - Cache genbruges

---

## 📋 MIGRATION GUIDE

### For WidgeTDC adapters

```typescript
// Før
protected getCredentials(): Record<string, string> {
  const prefix = this.config.envPrefix;
  // ... inline implementation
}

// Efter
import { getCredentials } from '@local-agent/harvest-util';

protected getCredentials(): CredentialSet {
  return getCredentials(this.config.envPrefix, this.config.authMethod);
}
```

### For ROMA integration

```typescript
import { createRomaHarvestBridge } from '@local-agent/harvest-util/roma-bridge';

const bridge = createRomaHarvestBridge(llmChatFn, 'http://localhost:3001');

// Plan and execute
const plan = await bridge.planHarvest('Collect M365 emails from last week');
const result = await bridge.executeHarvest(plan);

console.log(`Cache hits: ${result.cacheHits}, Misses: ${result.cacheMisses}`);
```

---

## 🚀 NEXT STEPS

1. [ ] Publicér `shared/harvest-util` som npm package
2. [ ] Opdater WidgeTDC BaseSourceAdapter til at importere fra fælles modul
3. [ ] Tilføj WebSocket events fra WidgeTDC til ROMA bridge
4. [ ] Implementer persistent cache (Redis)
5. [ ] Tilføj cost tracking i production

---

**Maintainer:** @clauskraft  
**Last Updated:** 2026-01-10

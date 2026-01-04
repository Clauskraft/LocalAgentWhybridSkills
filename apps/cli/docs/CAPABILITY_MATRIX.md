# SCA-01 Phase 1 MVP - Capability Matrix

> **Formål:** Overblik over hvad SCA-01 Phase 1 kan og ikke kan ift. den fulde agentinstruks (SCA-01 V2.0 Executive Edition).

---

## ✅ HVAD SCA-01 PHASE 1 KAN

| Kategori | Capability | Status | Noter |
|----------|------------|--------|-------|
| **Interface** | CLI (`sca doctor/run/chat`) | ✅ Implementeret | Kommandolinje-baseret |
| **LLM** | Ollama lokal (`/api/chat`) | ✅ Implementeret | Tool calling support |
| **LLM** | Think mode (reasoning) | ✅ Implementeret | `think: true` parameter |
| **Tool Bus** | MCP SDK (stdio transport) | ✅ Implementeret | Lokal tool server |
| **Læsning** | `read_file`, `read_handover_log` | ✅ Implementeret | UTF-8, max 1MB |
| **Skrivning** | `write_file`, `append_file` | ✅ Implementeret | Bag env-flag (default off) |
| **Exec** | `run_make_target` | ✅ Implementeret | Allowlist: mvp/test/audit/release |
| **Blackboard** | Markdown state (`docs/HANDOVER_LOG.md`) | ✅ Implementeret | Ingen JSON inboxes |
| **Observability** | HyperLog (JSONL) | ✅ Implementeret | stderr + fil-append |
| **Security** | Path traversal block | ✅ Implementeret | Blokerer `../` |
| **Security** | Sensitive path block | ✅ Implementeret | `.git/`, `node_modules/`, `.env*` |
| **Security** | Write/exec disabled by default | ✅ Implementeret | Zero Trust default |
| **Security** | Max file size limit | ✅ Implementeret | 1MB grænse |
| **CI/CD** | GitHub Actions workflow | ✅ Implementeret | build/lint/test/audit |
| **TypeScript** | Strict mode | ✅ Implementeret | `noImplicitAny`, etc. |
| **Config** | Environment variables | ✅ Implementeret | 7 konfigurerbare værdier |
| **Prompt** | Custom system prompt loading | ✅ Implementeret | `.agent/` mappe support |

---

## ❌ HVAD SCA-01 PHASE 1 IKKE KAN

### 🔴 Kritisk (Krævet i instruksen men mangler)

| Kategori | Krav fra instruks | Status | Planlagt fase |
|----------|-------------------|--------|---------------|
| **UI** | Desktop UI med approval gates | ❌ Mangler | Phase 2 |
| **UI** | "Plan preview" før skrivning/exec | ❌ Mangler | Phase 2 |
| **UI** | Visuel blackboard-visning | ❌ Mangler | Phase 2 |
| **Self-Healing** | SelfHealingAdapter integration | ❌ Mangler | Phase 2 |
| **Visualization** | Mind maps, flowdiagrammer | ❌ Mangler | Phase 2+ |
| **Visualization** | Mermaid/PlantUML rendering | ❌ Mangler | Phase 2+ |
| **Database** | Neo4j AuraDB/Docker integration | ❌ Mangler | Separat service |
| **Database** | PostgreSQL integration | ❌ Mangler | Separat service |
| **Compliance** | Automatisk DPIA/TIA artefakter | ❌ Mangler | Phase 3 |
| **Compliance** | Schrems II posture checks | ❌ Mangler | Phase 3 |
| **Compliance** | Data klassificering (offentlig→følsom) | ❌ Mangler | Phase 3 |
| **Security** | mTLS/JWT service auth | ❌ Mangler | Phase 3 |
| **Security** | Secret rotation/KMS | ❌ Mangler | Phase 3 |
| **Security** | SBOM/supply chain signering | ❌ Mangler | Phase 3 |
| **Observability** | SIEM integration | ❌ Mangler | Phase 3 |
| **Observability** | Immutable audit logs | ❌ Mangler | Phase 3 |
| **Observability** | Metrics/tracing (OpenTelemetry) | ❌ Mangler | Phase 2+ |
| **Multi-Agent** | Agent mesh/koordinering | ❌ Mangler | Phase 4 |
| **Multi-Agent** | Agent registry (`docs/AGENTS.md`) | ❌ Mangler | Phase 4 |
| **Cloud** | MCP over Streamable HTTP | ❌ Mangler | Phase 3 |
| **Cloud** | Ollama cloud endpoint | ❌ Mangler | Phase 3 |
| **ARM64** | Automatisk ARM64 image verification | ❌ Mangler | Backlog |

### 🟡 Delvist implementeret

| Kategori | Krav fra instruks | Status | Noter |
|----------|-------------------|--------|-------|
| **Testing** | Smoke/integration tests | 🟡 Delvist | Kan køre `make test`, men ingen coverage-check |
| **Documentation** | README med Quick Start | 🟡 Delvist | Basis README, ikke alle sektioner |
| **Security** | Threat notes i output | 🟡 Delvist | Log-baseret, ikke struktureret |
| **Notion** | Blackboard sync | 🟡 Markdown only | Notion API ikke integreret |
| **Rollback** | Recovery/rollback-plan | 🟡 Delvist | Kan læse git, ikke automatisk rollback |

---

## 📊 Gap-analyse vs. CLAK Codex

### A. INFRASTRUCTURE & HARDWARE

| Krav | Phase 1 Status | Gap |
|------|----------------|-----|
| ARM64 native | ✅ Node.js kører native | Ingen automatisk image-check |
| Stack: Node/React/Neo4j/PostgreSQL | ⚠️ Kun Node.js CLI | Database-integration mangler |
| "The Blackboard" protocol | ✅ Markdown state | Notion-sync mangler |

### B. SECURITY & COMPLIANCE (TDC Standard)

| Krav | Phase 1 Status | Gap |
|------|----------------|-----|
| GDPR & Schrems II | ⚠️ Defaults er sikre | Ingen automatiske checks/artefakter |
| "Chromebook Test" | ❌ Ikke automatiseret | Kræver manuel review |
| Zero Trust inputs | ✅ Path validation | Ingen input sanitization på tool args |
| Secrets i .env only | ✅ Blokerer .env* adgang | Ingen secret rotation |

### C. DEVELOPMENT STANDARDS

| Krav | Phase 1 Status | Gap |
|------|----------------|-----|
| Strict TypeScript | ✅ Fuld strict mode | |
| ES Modules | ✅ `"type": "module"` | |
| `make` targets | ✅ mvp/test/audit/release | |
| SelfHealingAdapter | ❌ Ikke integreret | Kræver Phase 2 |
| Every feature tested | ⚠️ Basis tests | Ingen coverage enforcement |

---

## 🗺️ Roadmap til fuld instruks-compliance

```
Phase 1 (NUVÆRENDE)
├── CLI interface ✅
├── Ollama tool calling ✅
├── MCP stdio transport ✅
├── HyperLog observability ✅
└── Zero Trust defaults ✅

Phase 2 (Desktop Agent)
├── Desktop UI med approval gates
├── Plan preview før write/exec
├── SelfHealingAdapter integration
├── Visualiseringer (Mermaid)
└── Policy-as-code udvidelse

Phase 3 (Cloud Mode)
├── MCP over Streamable HTTP
├── mTLS + JWT auth
├── Secret management (KMS)
├── Immutable logs + SIEM
├── DPIA/TIA artefakt-generator
└── Ollama cloud support

Phase 4 (Agent Mesh)
├── Agent registry (docs/AGENTS.md)
├── Multi-agent koordinering
├── Discovery + capability negotiation
└── Parallel tool calling
```

---

## 🔒 Restrisiko (Phase 1)

| Risiko | Sandsynlighed | Konsekvens | Mitigation |
|--------|---------------|------------|------------|
| LLM hallucination skriver farlig kode | Mellem | Høj | SCA_ALLOW_WRITE=false default |
| Path traversal bypass via symlinks | Lav | Høj | TODO: Symlink-check |
| Ollama unavailable | Lav | Mellem | `sca doctor` health check |
| Ingen approval gate på exec | Høj | Høj | SCA_ALLOW_EXEC=false default |
| Logs ikke immutable | Mellem | Mellem | Phase 3: append-only + signering |

---

## 📋 Konklusion

**SCA-01 Phase 1 MVP dækker:**
- ~40% af den fulde instruks (grundlæggende agent loop)
- Core funktionalitet: LLM + tools + state + observability
- Zero Trust defaults matcher "Executive Grade" princippet

**Mangler for fuld compliance:**
- Desktop UI med approval gates (Phase 2)
- Compliance artefakter (DPIA/TIA) (Phase 3)
- Multi-agent koordinering (Phase 4)
- Visualiseringer og mind maps (Phase 2+)

**Anbefaling:**
Phase 1 er klar til **kontrolleret test** i read-only mode. Produktionsbrug med skrivning kræver Phase 2 approval gates.

---

*Dokumentet er genereret som del af SCA-01 Phase 1 MVP scaffolding.*


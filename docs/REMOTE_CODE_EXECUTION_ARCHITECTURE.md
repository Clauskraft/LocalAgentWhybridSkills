# Remote Code Execution Architecture

> **Mål:** Enable SCA-01 agenten til at bygge og køre kode fra enhver klient (mobil, desktop, integration) med fuld projektledelse og administration.

---

## Executive Summary

Dette dokument beskriver 3 arkitekturer for remote code execution, der alle:
- Bruger standard funktionalitet og open source
- Kan administreres af SCA-01 agenten
- Fungerer fra mobil, desktop, og API integrationer
- Understøtter projektledelse (tasks, logs, artefakter)

---

## Arkitektur Oversigt

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SCA-01 ECOSYSTEM                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐           │
│    │  Mobile  │   │ Desktop  │   │   CLI    │   │   API    │           │
│    │  (Expo)  │   │(Electron)│   │(Phase 1) │   │Integration│          │
│    └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘           │
│         │              │              │              │                  │
│         └──────────────┼──────────────┼──────────────┘                  │
│                        │              │                                 │
│                        ▼              ▼                                 │
│              ┌─────────────────────────────────┐                        │
│              │      SCA-01 Cloud API           │                        │
│              │   (Railway - Phase 3)           │                        │
│              └─────────────┬───────────────────┘                        │
│                            │                                            │
│         ┌──────────────────┼──────────────────┐                         │
│         │                  │                  │                         │
│         ▼                  ▼                  ▼                         │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                   │
│  │  METODE 1   │   │  METODE 2   │   │  METODE 3   │                   │
│  │   GitHub    │   │   Piston    │   │  Deno/Edge  │                   │
│  │  Actions    │   │    API      │   │  Functions  │                   │
│  └─────────────┘   └─────────────┘   └─────────────┘                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## METODE 1: GitHub Actions Pipeline

### Beskrivelse

Bruger GitHub Actions som execution engine. Agenten opretter workflows dynamisk og trigger dem via GitHub API. Perfekt til komplekse builds, tests, og deployments.

### Arkitektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GITHUB ACTIONS PIPELINE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐          │
│  │    Klient    │      │  SCA-01 API  │      │   GitHub     │          │
│  │ (Mobil/Web)  │      │  (Railway)   │      │   Actions    │          │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘          │
│         │                     │                     │                   │
│         │  1. Request build   │                     │                   │
│         │────────────────────>│                     │                   │
│         │                     │                     │                   │
│         │                     │  2. Create/Update   │                   │
│         │                     │     workflow file   │                   │
│         │                     │────────────────────>│                   │
│         │                     │                     │                   │
│         │                     │  3. Trigger via     │                   │
│         │                     │  workflow_dispatch  │                   │
│         │                     │────────────────────>│                   │
│         │                     │                     │                   │
│         │                     │                     │ 4. Run workflow   │
│         │                     │                     │    (build/test)   │
│         │                     │                     │                   │
│         │                     │  5. Webhook/Poll    │                   │
│         │                     │<────────────────────│                   │
│         │                     │                     │                   │
│         │  6. Status + Logs   │                     │                   │
│         │<────────────────────│                     │                   │
│         │                     │                     │                   │
│         │  7. Download        │                     │                   │
│         │     artifacts       │  8. Fetch artifacts │                   │
│         │────────────────────>│────────────────────>│                   │
│         │                     │                     │                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// GitHub Actions Executor Service
interface BuildRequest {
  projectId: string;
  repository: string;  // "owner/repo"
  branch: string;
  buildCommand: string;
  testCommand?: string;
  artifacts: string[]; // paths to collect
}

interface BuildResult {
  runId: number;
  status: "queued" | "in_progress" | "completed" | "failed";
  conclusion?: "success" | "failure" | "cancelled";
  logs: string;
  artifacts: ArtifactInfo[];
  duration: number;
}

class GitHubActionsExecutor {
  private octokit: Octokit;
  
  async triggerBuild(request: BuildRequest): Promise<number> {
    // 1. Create dynamic workflow file
    const workflow = this.generateWorkflow(request);
    
    // 2. Push workflow to repo
    await this.octokit.repos.createOrUpdateFileContents({
      owner: request.repository.split("/")[0],
      repo: request.repository.split("/")[1],
      path: ".github/workflows/sca-01-build.yml",
      message: "SCA-01: Update build workflow",
      content: Buffer.from(workflow).toString("base64"),
    });
    
    // 3. Trigger workflow_dispatch
    await this.octokit.actions.createWorkflowDispatch({
      owner: request.repository.split("/")[0],
      repo: request.repository.split("/")[1],
      workflow_id: "sca-01-build.yml",
      ref: request.branch,
      inputs: {
        build_command: request.buildCommand,
        project_id: request.projectId,
      },
    });
    
    // 4. Get run ID from latest run
    return this.getLatestRunId(request.repository);
  }
  
  async getStatus(repository: string, runId: number): Promise<BuildResult> {
    const run = await this.octokit.actions.getWorkflowRun({
      owner: repository.split("/")[0],
      repo: repository.split("/")[1],
      run_id: runId,
    });
    
    return {
      runId,
      status: run.data.status,
      conclusion: run.data.conclusion,
      logs: await this.fetchLogs(repository, runId),
      artifacts: await this.listArtifacts(repository, runId),
      duration: Date.now() - new Date(run.data.created_at).getTime(),
    };
  }
  
  private generateWorkflow(request: BuildRequest): string {
    return `
name: SCA-01 Build
on:
  workflow_dispatch:
    inputs:
      build_command:
        required: true
      project_id:
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: \${{ github.event.inputs.build_command }}
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: |
            ${request.artifacts.join("\n            ")}
      
      - name: Notify SCA-01
        if: always()
        run: |
          curl -X POST "$SCA01_WEBHOOK_URL" \\
            -H "Content-Type: application/json" \\
            -d '{"runId": "\${{ github.run_id }}", "status": "\${{ job.status }}"}'
    `;
  }
}
```

### Fordele

| Fordel | Beskrivelse |
|--------|-------------|
| ✅ **Gratis** | 2000 min/måned gratis for public repos |
| ✅ **Skalérbar** | GitHub håndterer skalering |
| ✅ **Sikker** | Secrets, environments, protected branches |
| ✅ **Komplet CI/CD** | Tests, deploys, matrix builds |
| ✅ **Artifact storage** | Automatisk gem af build outputs |
| ✅ **Logs** | Fuld build log tilgængelig |

### Ulemper

| Ulempe | Beskrivelse |
|--------|-------------|
| ⚠️ **Latency** | Kan tage 10-60s at starte runner |
| ⚠️ **GitHub dependency** | Kræver GitHub repo |
| ⚠️ **Rate limits** | API rate limits på trigger |

### Agent Administration

```typescript
// SCA-01 kan administrere projekter via:
interface ProjectManagement {
  // Opret projekt
  createProject(name: string, template: string): Promise<Project>;
  
  // Queue build
  queueBuild(projectId: string, options: BuildOptions): Promise<BuildId>;
  
  // Monitor builds
  listBuilds(projectId: string): Promise<Build[]>;
  getBuildStatus(buildId: string): Promise<BuildStatus>;
  getBuildLogs(buildId: string): Promise<string>;
  
  // Artifacts
  downloadArtifact(buildId: string, name: string): Promise<Buffer>;
  
  // History
  getBuildHistory(projectId: string): Promise<BuildHistory>;
}
```

---

## METODE 2: Piston Code Execution API

### Beskrivelse

Self-hosted eller cloud-hosted sandboxed code execution. Piston er open-source og understøtter 60+ sprog. Perfekt til hurtig kode-kørsel uden fuld CI/CD pipeline.

### Arkitektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PISTON EXECUTION FLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐          │
│  │    Klient    │      │  SCA-01 API  │      │   Piston     │          │
│  │ (Mobil/Web)  │      │  (Railway)   │      │   Engine     │          │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘          │
│         │                     │                     │                   │
│         │  1. Submit code     │                     │                   │
│         │────────────────────>│                     │                   │
│         │                     │                     │                   │
│         │                     │  2. POST /execute   │                   │
│         │                     │────────────────────>│                   │
│         │                     │                     │                   │
│         │                     │                     │ 3. Sandbox exec   │
│         │                     │                     │    (isolated)     │
│         │                     │                     │                   │
│         │                     │  4. stdout/stderr   │                   │
│         │                     │<────────────────────│                   │
│         │                     │                     │                   │
│         │  5. Result + output │                     │                   │
│         │<────────────────────│                     │                   │
│         │                     │                     │                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          PISTON SANDBOX                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                         Container                                │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│   │  │   CPU    │  │  Memory  │  │   Disk   │  │ Network  │        │   │
│   │  │  Limit   │  │  Limit   │  │  Limit   │  │  None    │        │   │
│   │  │  (1 CPU) │  │ (512MB)  │  │  (1GB)   │  │ (Blocked)│        │   │
│   │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│   │                                                                  │   │
│   │  ┌─────────────────────────────────────────────────────────┐    │   │
│   │  │              User Code Execution                         │    │   │
│   │  │  - Timeout: 10 seconds (configurable)                   │    │   │
│   │  │  - No filesystem persistence                            │    │   │
│   │  │  - No network access                                    │    │   │
│   │  │  - Isolated from host                                   │    │   │
│   │  └─────────────────────────────────────────────────────────┘    │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// Piston Execution Service
const PISTON_URL = process.env.PISTON_URL || "https://emkc.org/api/v2/piston";

interface ExecuteRequest {
  language: string;       // "typescript", "python", "go", etc.
  version: string;        // "5.0.3", "3.12", etc.
  files: Array<{
    name: string;
    content: string;
  }>;
  stdin?: string;
  args?: string[];
  compileTimeout?: number;
  runTimeout?: number;
  compileMemoryLimit?: number;
  runMemoryLimit?: number;
}

interface ExecuteResult {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
  };
}

class PistonExecutor {
  async listRuntimes(): Promise<Array<{ language: string; version: string }>> {
    const res = await fetch(`${PISTON_URL}/runtimes`);
    return res.json();
  }
  
  async execute(request: ExecuteRequest): Promise<ExecuteResult> {
    const res = await fetch(`${PISTON_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    
    if (!res.ok) {
      throw new Error(`Execution failed: ${res.status}`);
    }
    
    return res.json();
  }
  
  // Convenience methods
  async runTypeScript(code: string): Promise<ExecuteResult> {
    return this.execute({
      language: "typescript",
      version: "5.0.3",
      files: [{ name: "main.ts", content: code }],
    });
  }
  
  async runPython(code: string): Promise<ExecuteResult> {
    return this.execute({
      language: "python",
      version: "3.12.0",
      files: [{ name: "main.py", content: code }],
    });
  }
  
  async runWithTests(
    code: string, 
    tests: string, 
    language: string
  ): Promise<{ passed: boolean; output: string }> {
    // Combine code and tests
    const combined = language === "python"
      ? `${code}\n\n# Tests\n${tests}`
      : `${code}\n\n// Tests\n${tests}`;
    
    const result = await this.execute({
      language,
      version: "*", // Latest
      files: [{ name: "main", content: combined }],
    });
    
    return {
      passed: result.run.code === 0,
      output: result.run.output,
    };
  }
}
```

### Self-Hosted Setup (Railway)

```yaml
# docker-compose.yml for Piston on Railway
version: '3.8'
services:
  piston:
    image: ghcr.io/engineer-man/piston
    restart: always
    ports:
      - "2000:2000"
    privileged: true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - PISTON_OUTPUT_MAX_SIZE=65536
      - PISTON_RUN_TIMEOUT=10000
      - PISTON_COMPILE_TIMEOUT=30000
```

### Understøttede Sprog

| Sprog | Version | Use Case |
|-------|---------|----------|
| TypeScript | 5.x | SCA-01 primært |
| JavaScript | Node 20 | Scripts |
| Python | 3.12 | AI/ML, scripts |
| Go | 1.21 | Microservices |
| Rust | 1.75 | Performance |
| Bash | 5.2 | Shell scripts |
| SQL | SQLite | Queries |
| + 50 flere | - | - |

### Fordele

| Fordel | Beskrivelse |
|--------|-------------|
| ✅ **Hurtig** | <100ms execution for simple code |
| ✅ **Sikker** | Fuldt sandboxed, ingen netværk |
| ✅ **Mange sprog** | 60+ sprog out-of-the-box |
| ✅ **Self-hosted** | Kan køre på egen infra |
| ✅ **Gratis API** | emkc.org har gratis endpoint |

### Ulemper

| Ulempe | Beskrivelse |
|--------|-------------|
| ⚠️ **Ingen persistence** | Filer forsvinder efter kørsel |
| ⚠️ **Ingen netværk** | Kan ikke lave HTTP calls |
| ⚠️ **Simple use cases** | Ikke til komplekse builds |

---

## METODE 3: Edge Functions (Deno Deploy / Cloudflare Workers)

### Beskrivelse

Serverless edge functions der kører kode globalt med minimal latency. Perfekt til API endpoints, transformations, og lettere compute tasks.

### Arkitektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       EDGE FUNCTION EXECUTION                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Global Edge Network                          │   │
│  │                                                                   │   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │   │   EU    │  │   US    │  │  Asia   │  │   AU    │            │   │
│  │   │  Edge   │  │  Edge   │  │  Edge   │  │  Edge   │            │   │
│  │   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │   │
│  │        │            │            │            │                  │   │
│  │        └────────────┼────────────┼────────────┘                  │   │
│  │                     │            │                               │   │
│  │                     ▼            ▼                               │   │
│  │              ┌─────────────────────────┐                         │   │
│  │              │   SCA-01 Function Code  │                         │   │
│  │              │   (Deployed globally)   │                         │   │
│  │              └─────────────────────────┘                         │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐          │
│  │    Mobile    │      │   Desktop    │      │    API       │          │
│  │   Request    │      │   Request    │      │  Integration │          │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘          │
│         │                     │                     │                   │
│         │                     │                     │                   │
│         └─────────────────────┼─────────────────────┘                   │
│                               │                                         │
│                               ▼                                         │
│                    ┌─────────────────────┐                              │
│                    │  Nearest Edge Node  │                              │
│                    │   (<50ms latency)   │                              │
│                    └─────────────────────┘                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Deno Deploy Implementation

```typescript
// deno-functions/src/executor.ts
// Deploy to: https://dash.deno.com

import { serve } from "https://deno.land/std/http/server.ts";

interface FunctionRequest {
  functionId: string;
  code: string;
  input: unknown;
  timeout?: number;
}

interface FunctionResult {
  functionId: string;
  output: unknown;
  logs: string[];
  executionTime: number;
  error?: string;
}

// Function registry (stored in Deno KV)
const kv = await Deno.openKv();

// Deploy a new function
async function deployFunction(
  functionId: string, 
  code: string, 
  metadata: Record<string, unknown>
): Promise<void> {
  await kv.set(["functions", functionId], {
    code,
    metadata,
    createdAt: new Date().toISOString(),
    version: 1,
  });
}

// Execute a function
async function executeFunction(request: FunctionRequest): Promise<FunctionResult> {
  const start = performance.now();
  const logs: string[] = [];
  
  try {
    // Get function from KV
    const stored = await kv.get(["functions", request.functionId]);
    const code = stored.value?.code || request.code;
    
    // Create isolated execution context
    const customConsole = {
      log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
      error: (...args: unknown[]) => logs.push(`[ERROR] ${args.map(String).join(" ")}`),
    };
    
    // Execute with AsyncFunction
    const fn = new Function(
      "console", "input", "fetch", "Deno",
      `return (async () => { ${code} })()`
    );
    
    const output = await Promise.race([
      fn(customConsole, request.input, fetch, Deno),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), request.timeout || 10000)
      ),
    ]);
    
    return {
      functionId: request.functionId,
      output,
      logs,
      executionTime: performance.now() - start,
    };
  } catch (e) {
    return {
      functionId: request.functionId,
      output: null,
      logs,
      executionTime: performance.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// HTTP Handler
serve(async (req: Request) => {
  const url = new URL(req.url);
  
  if (url.pathname === "/deploy" && req.method === "POST") {
    const { functionId, code, metadata } = await req.json();
    await deployFunction(functionId, code, metadata);
    return new Response(JSON.stringify({ success: true, functionId }));
  }
  
  if (url.pathname === "/execute" && req.method === "POST") {
    const request = await req.json() as FunctionRequest;
    const result = await executeFunction(request);
    return new Response(JSON.stringify(result));
  }
  
  if (url.pathname === "/functions" && req.method === "GET") {
    const functions: string[] = [];
    for await (const entry of kv.list({ prefix: ["functions"] })) {
      functions.push(entry.key[1] as string);
    }
    return new Response(JSON.stringify({ functions }));
  }
  
  return new Response("SCA-01 Edge Functions", { status: 200 });
});
```

### Cloudflare Workers Alternative

```typescript
// cloudflare-worker/src/index.ts

export interface Env {
  FUNCTIONS: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname.startsWith("/execute/")) {
      const functionId = url.pathname.split("/")[2];
      const fn = await env.FUNCTIONS.get(functionId);
      
      if (!fn) {
        return new Response("Function not found", { status: 404 });
      }
      
      const input = await request.json();
      
      // Execute using eval (in Workers sandbox)
      try {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const executor = new AsyncFunction("input", fn);
        const result = await executor(input);
        
        return new Response(JSON.stringify({ result }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ 
          error: e instanceof Error ? e.message : "Execution failed" 
        }), { status: 500 });
      }
    }
    
    return new Response("SCA-01 Cloudflare Functions");
  },
};
```

### Fordele

| Fordel | Beskrivelse |
|--------|-------------|
| ✅ **Ultra-lav latency** | <50ms globalt |
| ✅ **Auto-skalering** | Håndterer millions af requests |
| ✅ **Netværk** | Kan lave HTTP calls |
| ✅ **Persistence** | KV storage for data |
| ✅ **Gratis tier** | 100k requests/dag gratis |

### Ulemper

| Ulempe | Beskrivelse |
|--------|-------------|
| ⚠️ **Begrænset runtime** | Max 50ms CPU (Cloudflare), 50ms (Deno) |
| ⚠️ **Kun JS/TS** | Ingen andre sprog |
| ⚠️ **Ingen filesystem** | Kun KV storage |

---

## Sammenligning

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FEATURE COMPARISON                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Feature              │ GitHub Actions │ Piston API │ Edge Functions  │
│  ─────────────────────┼───────────────┼────────────┼─────────────────│
│  Latency              │ 10-60s        │ <100ms     │ <50ms           │
│  Languages            │ Any           │ 60+        │ JS/TS only      │
│  Network Access       │ ✅ Full       │ ❌ None    │ ✅ Full         │
│  Filesystem           │ ✅ Full       │ ❌ Temp    │ ❌ KV only      │
│  Max Execution Time   │ 6 hours       │ 60s        │ 30s             │
│  Complexity           │ High          │ Low        │ Medium          │
│  Cost                 │ Free tier     │ Free/Self  │ Free tier       │
│  Best For             │ Full CI/CD    │ Quick eval │ API endpoints   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Anbefaling: Hybrid Arkitektur

### Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SCA-01 HYBRID EXECUTION ENGINE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                      Execution Router                              │ │
│  │                                                                    │ │
│  │   Request ─────> Analyze ─────> Route to best executor            │ │
│  │                    │                     │                         │ │
│  │                    ▼                     ▼                         │ │
│  │   ┌────────────────────────────────────────────────────────────┐  │ │
│  │   │                    Routing Logic                            │  │ │
│  │   │                                                             │  │ │
│  │   │  IF quick eval (< 10s, no deps) ──────> Piston API         │  │ │
│  │   │  IF API endpoint/transform ───────────> Edge Functions      │  │ │
│  │   │  IF full build (deps, tests, artifacts) > GitHub Actions   │  │ │
│  │   │                                                             │  │ │
│  │   └────────────────────────────────────────────────────────────┘  │ │
│  │                                                                    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                   │
│  │   Piston    │   │    Edge     │   │   GitHub    │                   │
│  │             │   │  Functions  │   │   Actions   │                   │
│  │  Quick eval │   │   API/Web   │   │  Full build │                   │
│  │  60+ langs  │   │  Low latency│   │  CI/CD      │                   │
│  └─────────────┘   └─────────────┘   └─────────────┘                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// Unified Execution Engine
interface ExecutionRequest {
  type: "eval" | "function" | "build";
  language: string;
  code: string;
  dependencies?: string[];
  tests?: string;
  artifacts?: string[];
  timeout?: number;
}

class UnifiedExecutor {
  private piston: PistonExecutor;
  private edge: EdgeFunctionExecutor;
  private github: GitHubActionsExecutor;
  
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const executor = this.selectExecutor(request);
    
    switch (executor) {
      case "piston":
        return this.piston.execute(request);
      case "edge":
        return this.edge.execute(request);
      case "github":
        return this.github.execute(request);
    }
  }
  
  private selectExecutor(request: ExecutionRequest): "piston" | "edge" | "github" {
    // Quick code evaluation
    if (request.type === "eval" && !request.dependencies?.length) {
      return "piston";
    }
    
    // API endpoints or transformations (JS/TS only)
    if (request.type === "function" && ["javascript", "typescript"].includes(request.language)) {
      return "edge";
    }
    
    // Full builds with dependencies, tests, artifacts
    return "github";
  }
}
```

---

## Agent Projektledelse

Alle 3 metoder understøtter fuld projektledelse via SCA-01:

```typescript
interface AgentProject {
  id: string;
  name: string;
  repository?: string;
  functions: EdgeFunction[];
  builds: Build[];
  executions: Execution[];
}

interface AgentProjectManager {
  // Projekt CRUD
  createProject(name: string): Promise<Project>;
  listProjects(): Promise<Project[]>;
  deleteProject(id: string): Promise<void>;
  
  // Kode execution
  executeCode(projectId: string, code: string, options: ExecOptions): Promise<Result>;
  
  // Builds
  triggerBuild(projectId: string, options: BuildOptions): Promise<BuildId>;
  getBuildStatus(buildId: string): Promise<BuildStatus>;
  downloadArtifacts(buildId: string): Promise<Artifact[]>;
  
  // Edge functions
  deployFunction(projectId: string, code: string): Promise<FunctionUrl>;
  invokeFunction(url: string, input: unknown): Promise<unknown>;
  
  // Historie og logs
  getExecutionHistory(projectId: string): Promise<Execution[]>;
  getLogs(executionId: string): Promise<string>;
  
  // Metrics
  getMetrics(projectId: string): Promise<Metrics>;
}
```

---

## Konklusion

| Metode | Best For | Latency | Kompleksitet |
|--------|----------|---------|--------------|
| **GitHub Actions** | Fuld CI/CD, builds, tests | 10-60s | Høj |
| **Piston API** | Quick code eval, 60+ sprog | <100ms | Lav |
| **Edge Functions** | API endpoints, JS/TS | <50ms | Medium |

**Anbefaling:** Implementer alle 3 med en smart router der vælger den optimale executor baseret på use case. Dette giver:
- ⚡ Hurtig feedback for simple evals
- 🌍 Global low-latency for API funktioner
- 🔧 Fuld CI/CD kapabilitet for komplekse builds


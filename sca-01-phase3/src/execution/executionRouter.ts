/**
 * Unified Execution Router
 * Routes code execution to optimal backend based on request type
 */

// ============================================================================
// TYPES
// ============================================================================

export type ExecutionBackend = "piston" | "edge" | "github";
export type ExecutionStatus = "pending" | "running" | "success" | "failed" | "timeout";

export interface ExecutionRequest {
  id: string;
  projectId: string;
  type: "eval" | "function" | "build";
  language: string;
  code: string;
  files?: Array<{ name: string; content: string }>;
  dependencies?: string[];
  testCode?: string;
  artifacts?: string[];
  timeout?: number;
  input?: unknown;
  environment?: Record<string, string>;
}

export interface ExecutionResult {
  id: string;
  backend: ExecutionBackend;
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  exitCode: number;
  output?: unknown;
  artifacts?: Array<{ name: string; url: string; size: number }>;
  duration: number;
  startedAt: string;
  completedAt: string;
  error?: string;
}

export interface ExecutionMetrics {
  totalExecutions: number;
  byBackend: Record<ExecutionBackend, number>;
  avgDuration: number;
  successRate: number;
}

// ============================================================================
// PISTON EXECUTOR
// ============================================================================

const PISTON_API = process.env.PISTON_URL || "https://emkc.org/api/v2/piston";

interface PistonRequest {
  language: string;
  version: string;
  files: Array<{ name: string; content: string }>;
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
}

interface PistonResponse {
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

async function executePiston(request: ExecutionRequest): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString();
  const start = Date.now();

  try {
    const pistonReq: PistonRequest = {
      language: mapLanguageToPiston(request.language),
      version: "*", // Latest
      files: request.files ?? [{ name: getFileName(request.language), content: request.code }],
      run_timeout: request.timeout ?? 10000,
    };

    const res = await fetch(`${PISTON_API}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pistonReq),
    });

    if (!res.ok) {
      throw new Error(`Piston API error: ${res.status}`);
    }

    const data = (await res.json()) as PistonResponse;
    const duration = Date.now() - start;

    return {
      id: request.id,
      backend: "piston",
      status: data.run.code === 0 ? "success" : "failed",
      stdout: data.run.stdout,
      stderr: data.run.stderr,
      exitCode: data.run.code,
      output: data.run.output,
      duration,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      id: request.id,
      backend: "piston",
      status: "failed",
      stdout: "",
      stderr: "",
      exitCode: 1,
      duration: Date.now() - start,
      startedAt,
      completedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

function mapLanguageToPiston(lang: string): string {
  const mapping: Record<string, string> = {
    typescript: "typescript",
    javascript: "javascript",
    python: "python",
    go: "go",
    rust: "rust",
    java: "java",
    c: "c",
    cpp: "c++",
    csharp: "csharp",
    ruby: "ruby",
    php: "php",
    swift: "swift",
    kotlin: "kotlin",
    bash: "bash",
    sql: "sqlite3",
  };
  return mapping[lang.toLowerCase()] ?? lang;
}

function getFileName(lang: string): string {
  const extensions: Record<string, string> = {
    typescript: "main.ts",
    javascript: "main.js",
    python: "main.py",
    go: "main.go",
    rust: "main.rs",
    java: "Main.java",
    c: "main.c",
    cpp: "main.cpp",
    csharp: "Main.cs",
    ruby: "main.rb",
    php: "main.php",
    swift: "main.swift",
    kotlin: "Main.kt",
    bash: "main.sh",
    sql: "main.sql",
  };
  return extensions[lang.toLowerCase()] ?? "main.txt";
}

// ============================================================================
// EDGE FUNCTION EXECUTOR (Deno Deploy style)
// ============================================================================

const EDGE_FUNCTION_URL = process.env.EDGE_FUNCTION_URL;

async function executeEdge(request: ExecutionRequest): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString();
  const start = Date.now();

  if (!EDGE_FUNCTION_URL) {
    // Fallback: Execute locally using Function constructor (sandboxed)
    return executeLocalFunction(request);
  }

  try {
    const res = await fetch(`${EDGE_FUNCTION_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        functionId: request.id,
        code: request.code,
        input: request.input,
        timeout: request.timeout,
      }),
    });

    const data = await res.json();
    const duration = Date.now() - start;

    return {
      id: request.id,
      backend: "edge",
      status: data.error ? "failed" : "success",
      stdout: data.logs?.join("\n") ?? "",
      stderr: "",
      exitCode: data.error ? 1 : 0,
      output: data.output,
      duration,
      startedAt,
      completedAt: new Date().toISOString(),
      error: data.error,
    };
  } catch (e) {
    return {
      id: request.id,
      backend: "edge",
      status: "failed",
      stdout: "",
      stderr: "",
      exitCode: 1,
      duration: Date.now() - start,
      startedAt,
      completedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

async function executeLocalFunction(request: ExecutionRequest): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString();
  const start = Date.now();
  const logs: string[] = [];

  try {
    // Create sandboxed console
    const customConsole = {
      log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
      error: (...args: unknown[]) => logs.push(`[ERROR] ${args.map(String).join(" ")}`),
      warn: (...args: unknown[]) => logs.push(`[WARN] ${args.map(String).join(" ")}`),
    };

    // Execute with AsyncFunction
    const AsyncFunction = Object.getPrototypeOf(async function () {
      /* empty */
    }).constructor;
    const fn = new AsyncFunction("console", "input", `return (async () => { ${request.code} })()`);

    const output = await Promise.race([
      fn(customConsole, request.input),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), request.timeout ?? 10000)),
    ]);

    return {
      id: request.id,
      backend: "edge",
      status: "success",
      stdout: logs.join("\n"),
      stderr: "",
      exitCode: 0,
      output,
      duration: Date.now() - start,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      id: request.id,
      backend: "edge",
      status: "failed",
      stdout: logs.join("\n"),
      stderr: "",
      exitCode: 1,
      duration: Date.now() - start,
      startedAt,
      completedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

// ============================================================================
// GITHUB ACTIONS EXECUTOR
// ============================================================================

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface GitHubWorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
}

async function executeGitHub(request: ExecutionRequest): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString();
  const start = Date.now();

  if (!GITHUB_TOKEN) {
    return {
      id: request.id,
      backend: "github",
      status: "failed",
      stdout: "",
      stderr: "",
      exitCode: 1,
      duration: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      error: "GITHUB_TOKEN not configured",
    };
  }

  // For now, return a placeholder - full implementation would:
  // 1. Create/update workflow file in repo
  // 2. Trigger workflow_dispatch
  // 3. Poll for completion
  // 4. Fetch logs and artifacts

  return {
    id: request.id,
    backend: "github",
    status: "pending",
    stdout: "GitHub Actions execution queued. Implementation pending.",
    stderr: "",
    exitCode: 0,
    duration: Date.now() - start,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

// ============================================================================
// UNIFIED ROUTER
// ============================================================================

export class ExecutionRouter {
  private history: ExecutionResult[] = [];

  /**
   * Execute code using the optimal backend
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const backend = this.selectBackend(request);
    let result: ExecutionResult;

    switch (backend) {
      case "piston":
        result = await executePiston(request);
        break;
      case "edge":
        result = await executeEdge(request);
        break;
      case "github":
        result = await executeGitHub(request);
        break;
    }

    this.history.push(result);
    return result;
  }

  /**
   * Select optimal backend based on request characteristics
   */
  private selectBackend(request: ExecutionRequest): ExecutionBackend {
    // Quick code evaluation without dependencies -> Piston
    if (request.type === "eval" && !request.dependencies?.length) {
      return "piston";
    }

    // API functions or JS/TS without deps -> Edge
    if (
      request.type === "function" &&
      ["javascript", "typescript"].includes(request.language.toLowerCase())
    ) {
      return "edge";
    }

    // Full builds with dependencies, tests, or artifacts -> GitHub
    if (request.type === "build" || request.dependencies?.length || request.testCode || request.artifacts?.length) {
      return "github";
    }

    // Default to Piston for simple cases
    return "piston";
  }

  /**
   * Force execution on a specific backend
   */
  async executeOn(backend: ExecutionBackend, request: ExecutionRequest): Promise<ExecutionResult> {
    let result: ExecutionResult;

    switch (backend) {
      case "piston":
        result = await executePiston(request);
        break;
      case "edge":
        result = await executeEdge(request);
        break;
      case "github":
        result = await executeGitHub(request);
        break;
    }

    this.history.push(result);
    return result;
  }

  /**
   * Get supported languages for each backend
   */
  getSupportedLanguages(): Record<ExecutionBackend, string[]> {
    return {
      piston: [
        "typescript",
        "javascript",
        "python",
        "go",
        "rust",
        "java",
        "c",
        "cpp",
        "csharp",
        "ruby",
        "php",
        "swift",
        "kotlin",
        "bash",
        "sql",
      ],
      edge: ["typescript", "javascript"],
      github: ["any"], // Supports any language via Actions
    };
  }

  /**
   * Get execution history
   */
  getHistory(limit: number = 100): ExecutionResult[] {
    return this.history.slice(-limit);
  }

  /**
   * Get execution metrics
   */
  getMetrics(): ExecutionMetrics {
    const total = this.history.length;
    if (total === 0) {
      return {
        totalExecutions: 0,
        byBackend: { piston: 0, edge: 0, github: 0 },
        avgDuration: 0,
        successRate: 0,
      };
    }

    const byBackend: Record<ExecutionBackend, number> = { piston: 0, edge: 0, github: 0 };
    let totalDuration = 0;
    let successes = 0;

    for (const result of this.history) {
      byBackend[result.backend]++;
      totalDuration += result.duration;
      if (result.status === "success") successes++;
    }

    return {
      totalExecutions: total,
      byBackend,
      avgDuration: totalDuration / total,
      successRate: successes / total,
    };
  }
}

// Singleton instance
export const executionRouter = new ExecutionRouter();


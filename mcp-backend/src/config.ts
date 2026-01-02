import path from "node:path";

export interface McpBackendConfig {
  host: string;
  port: number;
  corsOrigins: string[];
  rateLimitMax: number;
  rateLimitWindow: string;

  // Finisher runtime
  repoRoot: string;
  logDir: string;
  ollamaHost: string;
  ollamaModel: string;
  maxTurns: number;

  // Tool server (stdio MCP)
  toolServerCommand: string;
  toolServerArgs: string[];
  allowWrite: boolean;
  allowExec: boolean;
}

function parseIntSafe(v: string | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseBool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  const s = v.trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return fallback;
}

function parseList(v: string | undefined): string[] {
  if (!v) return [];
  return v.split(",").map((x) => x.trim()).filter(Boolean);
}

export function loadConfig(): McpBackendConfig {
  const repoRoot = path.resolve(process.env["SCA_REPO_ROOT"] ?? process.cwd());

  const port = parseIntSafe(process.env["PORT"] ?? process.env["SCA_PORT"], 8787);
  const host = process.env["HOST"] ?? process.env["SCA_HOST"] ?? "0.0.0.0";

  const corsOrigins = parseList(process.env["CORS_ORIGINS"]);
  const rateLimitMax = parseIntSafe(process.env["RATE_LIMIT_MAX"], 60);
  const rateLimitWindow = process.env["RATE_LIMIT_WINDOW"] ?? "1 minute";

  const logDir = process.env["SCA_LOG_DIR"] ?? "./logs";
  const ollamaHost = process.env["OLLAMA_HOST"] ?? "http://localhost:11434";
  const ollamaModel = process.env["OLLAMA_MODEL"] ?? "qwen3";
  const maxTurns = parseIntSafe(process.env["SCA_MAX_TURNS"], 16);

  // Default tool server: reuse Local_Agent sca-01-phase1 tool server (TS in dev)
  const toolServerPath =
    process.env["SCA_TOOLSERVER_PATH"] ??
    path.resolve(repoRoot, "sca-01-phase1", "src", "mcp", "toolServer.ts");

  const toolServerCommand = process.env["SCA_TOOLSERVER_CMD"] ?? "npx";
  const toolServerArgs =
    process.env["SCA_TOOLSERVER_ARGS"]?.trim()
      ? (process.env["SCA_TOOLSERVER_ARGS"] ?? "").trim().split(" ").filter(Boolean)
      : ["tsx", toolServerPath];

  const allowWrite = parseBool(process.env["SCA_ALLOW_WRITE"], false);
  const allowExec = parseBool(process.env["SCA_ALLOW_EXEC"], false);

  return {
    host,
    port,
    corsOrigins,
    rateLimitMax,
    rateLimitWindow,
    repoRoot,
    logDir,
    ollamaHost,
    ollamaModel,
    maxTurns,
    toolServerCommand,
    toolServerArgs,
    allowWrite,
    allowExec,
  };
}



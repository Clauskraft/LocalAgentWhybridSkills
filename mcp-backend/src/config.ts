import path from "node:path";
import fs from "node:fs";
import { parseIntSafe, parseBool, parseList } from "@local-agent/config-utils";

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


export function loadConfig(): McpBackendConfig {
  const repoRoot = detectRepoRoot();

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

function detectRepoRoot(): string {
  const fromEnv = process.env["SCA_REPO_ROOT"];
  if (fromEnv && fromEnv.trim().length > 0) return path.resolve(fromEnv);

  // Heuristic for monorepo: prefer the nearest directory that contains sca-01-phase1 + mcp-backend.
  const cwd = process.cwd();
  const candidates = [cwd, path.resolve(cwd, ".."), path.resolve(cwd, "../..")];
  for (const c of candidates) {
    const hasPhase1 = fs.existsSync(path.join(c, "sca-01-phase1"));
    const hasMcpBackend = fs.existsSync(path.join(c, "mcp-backend"));
    if (hasPhase1 && hasMcpBackend) return c;
  }

  return cwd;
}



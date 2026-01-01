import path from "node:path";

export interface AppConfig {
  ollamaHost: string;
  ollamaModel: string;
  repoRoot: string;
  allowWrite: boolean;
  allowExec: boolean;
  maxTurns: number;
  logDir: string;
}

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const v = value.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return defaultValue;
}

function parseIntSafe(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : defaultValue;
}

export function loadConfig(): AppConfig {
  const cwd = process.cwd();
  const repoRootEnv = process.env["SCA_REPO_ROOT"];
  const repoRoot = path.resolve(repoRootEnv ?? cwd);

  return {
    ollamaHost: process.env["OLLAMA_HOST"] ?? "http://localhost:11434",
    ollamaModel: process.env["OLLAMA_MODEL"] ?? "qwen3",
    repoRoot,
    allowWrite: parseBool(process.env["SCA_ALLOW_WRITE"], false),
    allowExec: parseBool(process.env["SCA_ALLOW_EXEC"], false),
    maxTurns: parseIntSafe(process.env["SCA_MAX_TURNS"], 8),
    logDir: process.env["SCA_LOG_DIR"] ?? "./logs"
  };
}


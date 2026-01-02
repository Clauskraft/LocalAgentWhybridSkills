import path from "node:path";
import { parseIntSafe, parseBool } from "@local-agent/config-utils";

export interface AppConfig {
  ollamaHost: string;
  ollamaModel: string;
  repoRoot: string;
  allowWrite: boolean;
  allowExec: boolean;
  maxTurns: number;
  logDir: string;
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


import path from "node:path";
import os from "node:os";
import { parseBool, parseIntSafe, parseStringList } from "./configUtils.js";

export interface Phase2Config {
  // LLM
  ollamaHost: string;
  ollamaModel: string;

  // UI / Cloud preference
  theme?: string;
  backendUrl?: string;
  useCloud?: boolean;

  // Paths
  repoRoot: string;
  logDir: string;
  safeDirs: string[];

  // Permissions
  fullAccess: boolean;
  autoApprove: boolean;
  allowWrite: boolean;
  allowExec: boolean;

  // Limits
  maxTurns: number;
  shellTimeout: number;
  maxFileSize: number;
}


export function loadConfig(): Phase2Config {
  const cwd = process.cwd();
  const repoRootEnv = process.env["SCA_REPO_ROOT"];
  const repoRoot = path.resolve(repoRootEnv ?? cwd);

  const safeDirsRaw = parseStringList(process.env["SCA_SAFE_DIRS"], [repoRoot]);
  const safeDirs = safeDirsRaw.map((d) => path.resolve(d));

  const useCloud = parseBool(process.env["SCA_USE_CLOUD"], false);
  const ollamaHost = process.env["OLLAMA_HOST"] ?? (useCloud ? "" : "http://localhost:11434");

  return {
    // LLM
    ollamaHost,
    ollamaModel: process.env["OLLAMA_MODEL"] ?? "qwen3",

    // UI / Cloud preference
    theme: process.env["SCA_THEME"] ?? "dark",
    backendUrl: process.env["SCA_BACKEND_URL"] ?? "",
    useCloud,

    // Paths
    repoRoot,
    logDir: process.env["SCA_LOG_DIR"] ?? "./logs",
    safeDirs,

    // Permissions
    fullAccess: parseBool(process.env["SCA_FULL_ACCESS"], false),
    autoApprove: parseBool(process.env["SCA_AUTO_APPROVE"], false),
    allowWrite: parseBool(process.env["SCA_ALLOW_WRITE"], false),
    allowExec: parseBool(process.env["SCA_ALLOW_EXEC"], false),

    // Limits
    maxTurns: parseIntSafe(process.env["SCA_MAX_TURNS"], 16),
    shellTimeout: parseIntSafe(process.env["SCA_SHELL_TIMEOUT"], 300_000), // 5 min
    maxFileSize: parseIntSafe(process.env["SCA_MAX_FILE_SIZE"], 10_000_000) // 10MB
  };
}

export function getSystemPaths(): { home: string; temp: string; platform: string } {
  return {
    home: os.homedir(),
    temp: os.tmpdir(),
    platform: os.platform()
  };
}


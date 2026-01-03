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

  // Debug log to verify environment is loaded
  console.log("[loadConfig] OLLAMA_HOST:", process.env["OLLAMA_HOST"], "→", ollamaHost);
  console.log("[loadConfig] OLLAMA_MODEL:", process.env["OLLAMA_MODEL"]);

  return {
    // LLM - Production defaults for desktop agent
    ollamaHost,
    ollamaModel: process.env["OLLAMA_MODEL"] ?? "qwen3:8b",

    // UI / Cloud preference - Dark theme as default
    theme: process.env["SCA_THEME"] ?? "dark",
    backendUrl: process.env["SCA_BACKEND_URL"] ?? "",
    useCloud,

    // Paths
    repoRoot,
    logDir: process.env["SCA_LOG_DIR"] ?? "./logs",
    safeDirs,

    // Permissions - Safe defaults for desktop usage
    fullAccess: parseBool(process.env["SCA_FULL_ACCESS"], false),
    autoApprove: parseBool(process.env["SCA_AUTO_APPROVE"], false),
    allowWrite: parseBool(process.env["SCA_ALLOW_WRITE"], true),
    allowExec: parseBool(process.env["SCA_ALLOW_EXEC"], true),

    // Limits - Production-optimized values
    maxTurns: parseIntSafe(process.env["SCA_MAX_TURNS"], 20),
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


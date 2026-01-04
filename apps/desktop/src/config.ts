import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { parseBool, parseIntSafe, parseStringList } from "./configUtils.js";
import { ZUnifiedConfig } from "./config/unifiedSchema.js";

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

  // Optional: unified config file path (written by Electron main into userData)
  const unifiedPathRaw = (process.env["SCA_UNIFIED_CONFIG_PATH"] ?? "").trim();
  const unifiedPath = unifiedPathRaw ? path.resolve(unifiedPathRaw) : "";

  // Base config from unified file (if available), otherwise from env defaults
  let base: Partial<Phase2Config> = {};
  if (unifiedPath) {
    try {
      if (fs.existsSync(unifiedPath)) {
        const raw = fs.readFileSync(unifiedPath, "utf8");
        const parsedJson = JSON.parse(raw) as unknown;
        const parsed = ZUnifiedConfig.safeParse(parsedJson);
        if (parsed.success) {
          const u = parsed.data;
          base = {
            ollamaHost: u.ollamaHost,
            ollamaModel: u.ollamaModel,
            theme: u.theme,
            backendUrl: u.backendUrl,
            useCloud: u.useCloud,
            repoRoot: u.repoRoot,
            logDir: u.logDir,
            safeDirs: u.safeDirs,
            fullAccess: u.fullAccess,
            autoApprove: u.autoApprove,
            allowWrite: u.allowWrite,
            allowExec: u.allowExec,
            maxTurns: u.maxTurns,
            shellTimeout: u.shellTimeout,
            maxFileSize: u.maxFileSize,
          };
        }
      }
    } catch {
      // best-effort; fall back to env below
    }
  }

  const useCloud = parseBool(process.env["SCA_USE_CLOUD"], base.useCloud ?? false);
  const ollamaHost = process.env["OLLAMA_HOST"] ?? base.ollamaHost ?? (useCloud ? "" : "http://localhost:11434");
  const safeDirsRaw = parseStringList(process.env["SCA_SAFE_DIRS"], base.safeDirs ?? [repoRoot]);
  const safeDirs = safeDirsRaw.map((d) => path.resolve(d));

  return {
    // LLM
    ollamaHost,
    ollamaModel: process.env["OLLAMA_MODEL"] ?? base.ollamaModel ?? "qwen3:8b",

    // UI / Cloud preference
    theme: process.env["SCA_THEME"] ?? base.theme ?? "dark",
    backendUrl: process.env["SCA_BACKEND_URL"] ?? base.backendUrl ?? "",
    useCloud,

    // Paths
    repoRoot: path.resolve(base.repoRoot ?? repoRoot),
    logDir: process.env["SCA_LOG_DIR"] ?? base.logDir ?? "./logs",
    safeDirs,

    // Permissions
    fullAccess: parseBool(process.env["SCA_FULL_ACCESS"], base.fullAccess ?? false),
    autoApprove: parseBool(process.env["SCA_AUTO_APPROVE"], base.autoApprove ?? false),
    allowWrite: parseBool(process.env["SCA_ALLOW_WRITE"], base.allowWrite ?? true),
    allowExec: parseBool(process.env["SCA_ALLOW_EXEC"], base.allowExec ?? true),

    // Limits
    maxTurns: parseIntSafe(process.env["SCA_MAX_TURNS"], base.maxTurns ?? 20),
    shellTimeout: parseIntSafe(process.env["SCA_SHELL_TIMEOUT"], base.shellTimeout ?? 300_000), // 5 min
    maxFileSize: parseIntSafe(process.env["SCA_MAX_FILE_SIZE"], base.maxFileSize ?? 10_000_000), // 10MB
  };
}

export function getSystemPaths(): { home: string; temp: string; platform: string } {
  return {
    home: os.homedir(),
    temp: os.tmpdir(),
    platform: os.platform()
  };
}


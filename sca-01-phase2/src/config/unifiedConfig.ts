import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

import { DEFAULT_ENV } from "../defaultConfig.js";
import { loadConfig, type Phase2Config } from "../config.js";
import { ConfigStore } from "./configStore.js";
import {
  CURRENT_CONFIG_VERSION,
  ZUnifiedConfig,
  ZUnifiedSecrets,
  nowIso,
  type UnifiedConfig,
  type UnifiedSecrets,
} from "./unifiedSchema.js";

export type CryptoProvider = {
  isAvailable(): boolean;
  encryptString(plain: string): string; // returns base64
  decryptString(b64: string): string;
};

export type UnifiedConfigPaths = {
  configPath: string;
  secretsPath: string;
  legacySettingsPath?: string; // old settings.json
  legacyConfigDir?: string; // old ./config (ConfigStore)
};

function fileExistsSync(p: string): boolean {
  try {
    return fsSync.existsSync(p);
  } catch {
    return false;
  }
}

async function readJsonFile<T>(p: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(p, { encoding: "utf8" });
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJsonAtomic(p: string, data: unknown): Promise<void> {
  const dir = path.dirname(p);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${p}.tmp-${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), { encoding: "utf8" });
  await fs.rename(tmp, p);
}

export function getDefaultUnifiedConfig(): UnifiedConfig {
  const base = loadConfig(); // env-based defaults (already production oriented)
  const now = nowIso();

  // Map DEFAULT_ENV strings to proper runtime defaults where helpful
  const maxTurnsDefault = Number.parseInt(DEFAULT_ENV.SCA_MAX_TURNS, 10);
  const shellTimeoutDefault = Number.parseInt(DEFAULT_ENV.SCA_SHELL_TIMEOUT, 10);
  const maxFileSizeDefault = Number.parseInt(DEFAULT_ENV.SCA_MAX_FILE_SIZE, 10);

  return {
    version: CURRENT_CONFIG_VERSION,
    ollamaHost: base.ollamaHost,
    ollamaModel: base.ollamaModel,
    useCloud: base.useCloud ?? false,
    backendUrl: base.backendUrl ?? "",
    theme: base.theme ?? "dark",
    repoRoot: base.repoRoot,
    logDir: base.logDir,
    safeDirs: base.safeDirs,
    fullAccess: base.fullAccess,
    autoApprove: base.autoApprove,
    allowWrite: base.allowWrite,
    allowExec: base.allowExec,
    maxTurns: Number.isFinite(base.maxTurns) ? base.maxTurns : (Number.isFinite(maxTurnsDefault) ? maxTurnsDefault : 20),
    shellTimeout: Number.isFinite(base.shellTimeout) ? base.shellTimeout : (Number.isFinite(shellTimeoutDefault) ? shellTimeoutDefault : 300_000),
    maxFileSize: Number.isFinite(base.maxFileSize) ? base.maxFileSize : (Number.isFinite(maxFileSizeDefault) ? maxFileSizeDefault : 10_000_000),

    // ConfigStore-style defaults
    pathRules: [],
    blockedPaths: [
      "C:\\Windows\\System32\\config",
      "C:\\Windows\\System32\\drivers",
      "/etc/shadow",
      "/etc/sudoers",
      ".ssh/id_rsa",
      ".ssh/id_ed25519",
      ".gnupg",
      ".aws/credentials",
    ],
    repos: [],
    toolCredentials: [],
    services: [
      { id: "ollama-local", name: "Ollama Local", type: "ollama", endpoint: "http://localhost:11434", enabled: true, createdAt: now },
    ],

    createdAt: now,
    lastModified: now,
  };
}

export function getDefaultUnifiedSecrets(): UnifiedSecrets {
  return { repoAccessTokensEncrypted: {}, toolCredentialsEncrypted: {}, serviceCredentialsEncrypted: {}, lastModified: nowIso() };
}

function normalizeLegacyModel(model: unknown): string | undefined {
  if (typeof model !== "string") return undefined;
  const m = model.trim();
  if (!m) return undefined;
  // Older UI used "qwen3" without size. Prefer existing DEFAULT_ENV if present.
  if (m === "qwen3") return DEFAULT_ENV.OLLAMA_MODEL || "qwen3:8b";
  return m;
}

async function migrateFromLegacySettings(paths: UnifiedConfigPaths): Promise<{
  configPatch: Partial<UnifiedConfig>;
  secretsPatch: Partial<UnifiedSecrets>;
}> {
  const configPatch: Partial<UnifiedConfig> = {};
  const secretsPatch: Partial<UnifiedSecrets> = {};

  if (!paths.legacySettingsPath) return { configPatch, secretsPatch };
  const raw = await readJsonFile<Record<string, unknown>>(paths.legacySettingsPath);
  if (!raw) return { configPatch, secretsPatch };

  if (typeof raw.ollamaHost === "string") configPatch.ollamaHost = raw.ollamaHost;
  if (typeof raw.ollamaModel === "string") configPatch.ollamaModel = normalizeLegacyModel(raw.ollamaModel) ?? raw.ollamaModel;
  if (typeof raw.maxTurns === "number" && Number.isFinite(raw.maxTurns)) configPatch.maxTurns = raw.maxTurns;
  if (typeof raw.fullAccess === "boolean") configPatch.fullAccess = raw.fullAccess;
  if (typeof raw.autoApprove === "boolean") configPatch.autoApprove = raw.autoApprove;
  if (typeof raw.backendUrl === "string") configPatch.backendUrl = raw.backendUrl;
  if (typeof raw.useCloud === "boolean") configPatch.useCloud = raw.useCloud;
  if (typeof raw.theme === "string") configPatch.theme = raw.theme;
  if (Array.isArray(raw.safeDirs) && raw.safeDirs.every((x) => typeof x === "string")) {
    configPatch.safeDirs = raw.safeDirs.map((x) => x.trim()).filter(Boolean);
  }

  // This is already safeStorage-encrypted base64 from earlier Phase2 implementation.
  if (typeof raw.cloudRefreshTokenEncrypted === "string" && raw.cloudRefreshTokenEncrypted.trim()) {
    secretsPatch.cloudRefreshTokenEncrypted = raw.cloudRefreshTokenEncrypted.trim();
  }

  return { configPatch, secretsPatch };
}

async function migrateFromLegacyConfigStore(paths: UnifiedConfigPaths, crypto: CryptoProvider | null): Promise<{
  configPatch: Partial<UnifiedConfig>;
  secretsPatch: Partial<UnifiedSecrets>;
}> {
  const configPatch: Partial<UnifiedConfig> = {};
  const secretsPatch: Partial<UnifiedSecrets> = {};

  if (!paths.legacyConfigDir) return { configPatch, secretsPatch };
  const legacyDir = paths.legacyConfigDir;
  const configFile = path.join(legacyDir, "agent-config.json");
  if (!fileExistsSync(configFile)) return { configPatch, secretsPatch };

  try {
    const store = new ConfigStore(legacyDir);
    const full = store.getFullConfig();

    // Map settings
    configPatch.ollamaHost = full.settings.ollamaHost;
    configPatch.ollamaModel = normalizeLegacyModel(full.settings.ollamaModel) ?? full.settings.ollamaModel;
    configPatch.maxTurns = full.settings.maxTurns;
    configPatch.shellTimeout = full.settings.shellTimeout;
    configPatch.maxFileSize = full.settings.maxFileSize;
    configPatch.fullAccess = full.settings.fullAccess;
    configPatch.autoApprove = full.settings.autoApprove;

    // Paths & rules
    configPatch.pathRules = full.pathRules;
    configPatch.blockedPaths = full.blockedPaths;
    configPatch.safeDirs = full.safePaths;

    // Non-secret parts
    configPatch.repos = full.repos;
    configPatch.toolCredentials = full.toolCredentials;
    configPatch.services = full.services;

    // Secrets: repo tokens + tool creds + service creds
    // Repo tokens are encrypted with legacy file key; decrypt and re-encrypt with safeStorage if available.
    if (crypto?.isAvailable()) {
      const repoTokens: Record<string, string> = {};
      for (const r of full.repos) {
        const token = store.getRepoToken(r.id);
        if (token) repoTokens[r.id] = crypto.encryptString(token);
      }
      secretsPatch.repoAccessTokensEncrypted = repoTokens;

      const toolCreds: Record<string, Record<string, string>> = {};
      for (const c of full.toolCredentials) {
        const dec = store.getDecryptedCredential(c.id);
        if (!dec) continue;
        toolCreds[c.id] = Object.fromEntries(Object.entries(dec).map(([k, v]) => [k, crypto.encryptString(v)]));
      }
      secretsPatch.toolCredentialsEncrypted = toolCreds;

      // ConfigStore service credentials aren’t exposed with a decrypt helper; if needed we can extend later.
      secretsPatch.serviceCredentialsEncrypted = {};
    }
  } catch {
    // best-effort
  }

  return { configPatch, secretsPatch };
}

function mergeConfig(base: UnifiedConfig, patch: Partial<UnifiedConfig>): UnifiedConfig {
  const next: UnifiedConfig = { ...base, ...patch };
  // merge arrays explicitly when patch provides them
  if (patch.safeDirs) next.safeDirs = patch.safeDirs;
  if (patch.blockedPaths) next.blockedPaths = patch.blockedPaths;
  if (patch.pathRules) next.pathRules = patch.pathRules;
  if (patch.repos) next.repos = patch.repos;
  if (patch.toolCredentials) next.toolCredentials = patch.toolCredentials;
  if (patch.services) next.services = patch.services;
  next.lastModified = nowIso();
  return next;
}

function mergeSecrets(base: UnifiedSecrets, patch: Partial<UnifiedSecrets>): UnifiedSecrets {
  const next: UnifiedSecrets = {
    ...base,
    ...patch,
    repoAccessTokensEncrypted: { ...(base.repoAccessTokensEncrypted ?? {}), ...(patch.repoAccessTokensEncrypted ?? {}) },
    toolCredentialsEncrypted: { ...(base.toolCredentialsEncrypted ?? {}), ...(patch.toolCredentialsEncrypted ?? {}) },
    serviceCredentialsEncrypted: { ...(base.serviceCredentialsEncrypted ?? {}), ...(patch.serviceCredentialsEncrypted ?? {}) },
    lastModified: nowIso(),
  };
  return next;
}

export async function loadUnifiedConfig(
  paths: UnifiedConfigPaths,
  crypto: CryptoProvider | null
): Promise<{ config: UnifiedConfig; secrets: UnifiedSecrets; didMigrate: boolean }> {
  const defaultCfg = getDefaultUnifiedConfig();
  const defaultSecrets = getDefaultUnifiedSecrets();

  const diskCfgRaw = await readJsonFile<unknown>(paths.configPath);
  const diskSecretsRaw = await readJsonFile<unknown>(paths.secretsPath);

  let cfg: UnifiedConfig | null = null;
  let secrets: UnifiedSecrets | null = null;

  if (diskCfgRaw) {
    const parsed = ZUnifiedConfig.safeParse(diskCfgRaw);
    if (parsed.success) cfg = parsed.data;
  }
  if (diskSecretsRaw) {
    const parsed = ZUnifiedSecrets.safeParse(diskSecretsRaw);
    if (parsed.success) secrets = parsed.data;
  }

  let didMigrate = false;
  const baseCfg = cfg ?? defaultCfg;
  const baseSecrets = secrets ?? defaultSecrets;

  // Migrate legacy sources into unified config if unified file was missing or incomplete.
  if (!cfg || !secrets) {
    const legacySettings = await migrateFromLegacySettings(paths);
    const legacyStore = await migrateFromLegacyConfigStore(paths, crypto);

    cfg = mergeConfig(baseCfg, { ...legacyStore.configPatch, ...legacySettings.configPatch });
    secrets = mergeSecrets(baseSecrets, { ...legacyStore.secretsPatch, ...legacySettings.secretsPatch });
    didMigrate = true;
  }

  // Validate final config; if invalid, reset to defaults (but keep secrets best-effort)
  const finalCfgParsed = ZUnifiedConfig.safeParse(cfg);
  if (!finalCfgParsed.success) {
    cfg = getDefaultUnifiedConfig();
    didMigrate = true;
  } else {
    cfg = finalCfgParsed.data;
  }

  const finalSecretsParsed = ZUnifiedSecrets.safeParse(secrets);
  secrets = finalSecretsParsed.success ? finalSecretsParsed.data : getDefaultUnifiedSecrets();

  // Ensure persisted shape always exists
  if (didMigrate || !diskCfgRaw) {
    await writeJsonAtomic(paths.configPath, cfg);
  }
  if (didMigrate || !diskSecretsRaw) {
    await writeJsonAtomic(paths.secretsPath, secrets);
  }

  return { config: cfg, secrets, didMigrate };
}

export async function saveUnifiedConfig(paths: UnifiedConfigPaths, config: UnifiedConfig): Promise<void> {
  const parsed = ZUnifiedConfig.parse({ ...config, version: CURRENT_CONFIG_VERSION });
  await writeJsonAtomic(paths.configPath, { ...parsed, lastModified: nowIso() });
}

export async function saveUnifiedSecrets(paths: UnifiedConfigPaths, secrets: UnifiedSecrets): Promise<void> {
  const parsed = ZUnifiedSecrets.parse(secrets);
  await writeJsonAtomic(paths.secretsPath, { ...parsed, lastModified: nowIso() });
}

export function toPhase2RuntimeConfig(cfg: UnifiedConfig): Phase2Config {
  return {
    ollamaHost: cfg.ollamaHost,
    ollamaModel: cfg.ollamaModel,
    theme: cfg.theme,
    backendUrl: cfg.backendUrl,
    useCloud: cfg.useCloud,
    repoRoot: cfg.repoRoot,
    logDir: cfg.logDir,
    safeDirs: cfg.safeDirs,
    fullAccess: cfg.fullAccess,
    autoApprove: cfg.autoApprove,
    allowWrite: cfg.allowWrite,
    allowExec: cfg.allowExec,
    maxTurns: cfg.maxTurns,
    shellTimeout: cfg.shellTimeout,
    maxFileSize: cfg.maxFileSize,
  };
}



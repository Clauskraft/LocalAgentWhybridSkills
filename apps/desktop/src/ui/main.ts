/// <reference types="node" />
type ElectronModule = typeof import("electron");
type BrowserWindowInstance = InstanceType<ElectronModule["BrowserWindow"]>;

let app: ElectronModule["app"];
let BrowserWindow: ElectronModule["BrowserWindow"];
let ipcMain: ElectronModule["ipcMain"];
let dialog: ElectronModule["dialog"];
let Notification: ElectronModule["Notification"];
let safeStorage: ElectronModule["safeStorage"];

import path from "path";
import { fileURLToPath } from "url";
import { monitorEventLoopDelay } from "perf_hooks";
import { globalApprovalQueue } from "../approval/approvalQueue.js";
import type { Phase2Config } from "../config.js";
import { DesktopAgent } from "../agent/DesktopAgent.js";
import { HyperLog } from "../logging/hyperlog.js";
import { DEFAULT_ENV } from "../defaultConfig.js";
import { isOllamaInstalled, startOllama } from "../startup/bootstrap.js";
import {
  loadUnifiedConfig,
  saveUnifiedConfig,
  saveUnifiedSecrets,
  toPhase2RuntimeConfig,
  type CryptoProvider,
  type UnifiedConfigPaths,
} from "../config/unifiedConfig.js";
import type { UnifiedConfig, UnifiedSecrets } from "../config/unifiedSchema.js";
import { getConfigStore } from "../config/configStore.js";
import { MCP_SERVER_CATALOG, getPopularServers, getServerById } from "../mcp/serverCatalog.js";
// import { initUpdater } from "../updater/autoUpdater.js"; // TODO: Fix ESM/CJS loading issue
import { registerPulseIpcHandlers } from "../pulse/ipc.js";

import type { ApprovalRequest } from "../approval/approvalQueue.js";

let shell: ElectronModule["shell"];

const DEFAULT_RAILWAY_BACKEND = "https://sca-01-phase3-production.up.railway.app";
const DEFAULT_ROMA_BRIDGE_URL = "http://127.0.0.1:8808";
const DEFAULT_WIDGETDC_BASE_URL = "http://127.0.0.1:3001";

// ES Module __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load default environment configuration IMMEDIATELY
console.log("🔧 Loading default production configuration...");
Object.entries(DEFAULT_ENV).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});
console.log("✅ Configuration loaded:");
console.log("  - Model:", process.env.OLLAMA_MODEL);
console.log("  - Write:", process.env.SCA_ALLOW_WRITE);
console.log("  - Exec:", process.env.SCA_ALLOW_EXEC);
console.log("  - Turns:", process.env.SCA_MAX_TURNS);

let mainWindow: BrowserWindowInstance | null = null;
let agent: DesktopAgent | null = null;
let log: HyperLog | null = null;
let runtimeCfg: Phase2Config;

let unifiedCfg: UnifiedConfig | null = null;
let unifiedSecrets: UnifiedSecrets | null = null;
let unifiedPaths: UnifiedConfigPaths | null = null;
let cryptoProvider: CryptoProvider | null = null;

let cloudAccessToken: string | null = null;
let cloudRefreshTokenEncrypted: string | null = null;

// MCP config (used by Settings -> MCP)
let mcpConfigStore: ReturnType<typeof getConfigStore> | null = null;

type PerfSample = {
  ts: number;
  rssMB: number;
  heapUsedMB: number;
  heapTotalMB: number;
  extMB: number;
  cpuUserMs: number;
  cpuSystemMs: number;
  eventLoopLagP50Ms: number | null;
  eventLoopLagP95Ms: number | null;
  eventLoopLagP99Ms: number | null;
};

const PERF_BUFFER_MAX = 600; // ~10 min @ 1s
const perfSamples: PerfSample[] = [];
let perfTimer: NodeJS.Timeout | null = null;
let lastCpuUsage: NodeJS.CpuUsage | null = null;
const elDelay = monitorEventLoopDelay({ resolution: 20 });

function mb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

function pushPerfSample(sample: PerfSample): void {
  perfSamples.push(sample);
  if (perfSamples.length > PERF_BUFFER_MAX) {
    perfSamples.splice(0, perfSamples.length - PERF_BUFFER_MAX);
  }
}

function startPerfSampler(intervalMs = 1000): void {
  if (perfTimer) return;
  try {
    elDelay.enable();
  } catch {
    // ignore
  }
  lastCpuUsage = process.cpuUsage();

  perfTimer = setInterval(() => {
    const now = Date.now();
    const mem = process.memoryUsage();
    const curCpu = process.cpuUsage();

    const prevCpu = lastCpuUsage ?? curCpu;
    const cpuDelta = {
      user: curCpu.user - prevCpu.user,
      system: curCpu.system - prevCpu.system,
    };
    lastCpuUsage = curCpu;

    const p50 = Number(elDelay.percentile(50)) / 1e6;
    const p95 = Number(elDelay.percentile(95)) / 1e6;
    const p99 = Number(elDelay.percentile(99)) / 1e6;
    elDelay.reset();

    const sample: PerfSample = {
      ts: now,
      rssMB: mb(mem.rss),
      heapUsedMB: mb(mem.heapUsed),
      heapTotalMB: mb(mem.heapTotal),
      extMB: mb(mem.external),
      cpuUserMs: Math.round(cpuDelta.user / 1000),
      cpuSystemMs: Math.round(cpuDelta.system / 1000),
      eventLoopLagP50Ms: Number.isFinite(p50) ? Math.round(p50 * 10) / 10 : null,
      eventLoopLagP95Ms: Number.isFinite(p95) ? Math.round(p95 * 10) / 10 : null,
      eventLoopLagP99Ms: Number.isFinite(p99) ? Math.round(p99 * 10) / 10 : null,
    };

    pushPerfSample(sample);
    log?.info("perf.sample", "perf.sample", sample);
  }, intervalMs);

  perfTimer.unref?.();
}

function getPerfStats(): { latest: PerfSample | null; samples: PerfSample[] } {
  const latest = perfSamples.length ? (perfSamples[perfSamples.length - 1] ?? null) : null;
  return { latest, samples: [...perfSamples] };
}

type CloudTokenPair = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
};

function getBackendBaseUrl(): string {
  if (!runtimeCfg) throw new Error("Config not initialized");
  const raw = (runtimeCfg.backendUrl ?? "").trim();
  if (!raw) throw new Error("Cloud backendUrl is not configured");
  return raw.replace(/\/+$/, "");
}

function getRomaBaseUrl(): string {
  // Prefer explicit env var; fall back to runtime config if present; then local docker-compose default.
  const env = (process.env.ROMA_BRIDGE_URL ?? "").trim();
  if (env) return env.replace(/\/+$/, "");
  const cfgVal = (runtimeCfg as unknown as { romaBridgeUrl?: string })?.romaBridgeUrl ?? "";
  const raw = String(cfgVal ?? "").trim();
  if (raw) return raw.replace(/\/+$/, "");
  return DEFAULT_ROMA_BRIDGE_URL;
}

async function romaRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const base = getRomaBaseUrl();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const txt = await res.text().catch(() => "");
  let json: any = null;
  if (txt) {
    try {
      json = JSON.parse(txt);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    const msg = (json && typeof json === "object" ? (json as any).detail ?? (json as any).error : null) ?? txt ?? res.statusText;
    throw new Error(`ROMA ${method} ${path} failed: ${res.status} ${String(msg)}`);
  }
  return json as T;
}

function encryptForStorage(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS encryption is not available (safeStorage)");
  }
  return safeStorage.encryptString(value).toString("base64");
}

function decryptFromStorage(valueB64: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS encryption is not available (safeStorage)");
  }
  const buf = Buffer.from(valueB64, "base64");
  return safeStorage.decryptString(buf);
}

function createCryptoProvider(): CryptoProvider {
  return {
    isAvailable: () => safeStorage.isEncryptionAvailable(),
    encryptString: (plain: string) => {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error("OS encryption is not available (safeStorage)");
      }
      return safeStorage.encryptString(plain).toString("base64");
    },
    decryptString: (b64: string) => {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error("OS encryption is not available (safeStorage)");
      }
      const buf = Buffer.from(b64, "base64");
      return safeStorage.decryptString(buf);
    },
  };
}

async function persistUnifiedToDisk(): Promise<void> {
  if (!unifiedPaths || !unifiedCfg || !unifiedSecrets) return;
  await saveUnifiedConfig(unifiedPaths, unifiedCfg);
  await saveUnifiedSecrets(unifiedPaths, unifiedSecrets);
}

function parseOllamaHost(hostUrl: string | undefined | null): { host: string; port: number; baseUrl: string } {
  const fallback = { host: "localhost", port: 11434, baseUrl: "http://localhost:11434" };
  const raw = (hostUrl ?? "").trim();
  if (!raw) return fallback;
  try {
    const u = new URL(raw);
    const host = u.hostname || "localhost";
    const port = u.port ? Number(u.port) : 11434;
    const baseUrl = `${u.protocol}//${host}:${port}`;
    return { host, port, baseUrl };
  } catch {
    return fallback;
  }
}

async function ping(url: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureDefaultsPersisted(): Promise<void> {
  // Unified config load always persists a full default shape if missing.
  // This remains as a no-op wrapper for backward compatibility.
  await persistUnifiedToDisk();
}

async function ensureConnectivityOnStartup(): Promise<void> {
  if (!runtimeCfg) return;

  const cloudBackend = (runtimeCfg.backendUrl ?? "").trim() || DEFAULT_RAILWAY_BACKEND;
  const cloudOk = await ping(`${cloudBackend.replace(/\/+$/, "")}/health`, 2500);

  // If user wants cloud, we do NOT auto-switch to local Ollama.
  // Cloud mode is the intended default for production.
  if (runtimeCfg.useCloud) {
    // Ensure backendUrl is set to a usable default
    if ((runtimeCfg.backendUrl ?? "").trim() !== cloudBackend) {
      runtimeCfg = { ...runtimeCfg, backendUrl: cloudBackend };
      if (unifiedCfg) {
        unifiedCfg = { ...unifiedCfg, backendUrl: cloudBackend };
        await persistUnifiedToDisk();
      }
    }

    // If cloud is reachable, we're done. If not reachable, keep cloud and let UI show Offline.
    if (cloudOk) return;
    log?.warn("startup.cloud.unreachable", "Cloud backend not reachable; staying in cloud mode", { cloudBackend });
    return;
  }

  const { host, port, baseUrl } = parseOllamaHost(runtimeCfg.ollamaHost);
  const localOk = await ping(`${baseUrl}/api/version`, 2500);
  if (localOk) {
    if (runtimeCfg.useCloud) {
      runtimeCfg = { ...runtimeCfg, useCloud: false };
        if (unifiedCfg) {
          unifiedCfg = { ...unifiedCfg, useCloud: false };
          await persistUnifiedToDisk();
        }
    }
    return;
  }

  // Try to start Ollama if it's installed.
  try {
    const installed = await isOllamaInstalled();
    if (installed) {
      const started = await startOllama({
        host,
        port,
        model: runtimeCfg.ollamaModel,
        autoStart: true,
        startTimeout: 15000,
      });
      if (started) {
        const okAfter = await ping(`${baseUrl}/api/version`, 2500);
        if (okAfter) {
          runtimeCfg = { ...runtimeCfg, useCloud: false };
          if (unifiedCfg) {
            unifiedCfg = { ...unifiedCfg, useCloud: false };
            await persistUnifiedToDisk();
          }
          return;
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log?.warn("startup.ollama.autostart_failed", msg);
  }

  // Fallback to cloud if local isn't reachable.
  runtimeCfg = {
    ...runtimeCfg,
    useCloud: true,
    backendUrl: cloudBackend,
  };
  if (unifiedCfg) {
    unifiedCfg = { ...unifiedCfg, useCloud: true, backendUrl: cloudBackend };
    await persistUnifiedToDisk();
  }
}

async function cloudLogin(email: string, password: string): Promise<void> {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Cloud login failed: ${res.status} ${res.statusText} ${txt}`);
  }
  const data = (await res.json()) as Partial<CloudTokenPair>;
  if (typeof data.access_token !== "string" || typeof data.refresh_token !== "string") {
    throw new Error("Cloud login did not return a token pair");
  }
  cloudAccessToken = data.access_token;
  cloudRefreshTokenEncrypted = encryptForStorage(data.refresh_token);
  if (unifiedSecrets) {
    unifiedSecrets = { ...unifiedSecrets, cloudRefreshTokenEncrypted: cloudRefreshTokenEncrypted ?? undefined };
  }
  await persistUnifiedToDisk();
}

async function cloudRefresh(): Promise<void> {
  if (!cloudRefreshTokenEncrypted) throw new Error("No refresh token stored");
  const base = getBackendBaseUrl();
  const refreshToken = decryptFromStorage(cloudRefreshTokenEncrypted);
  const res = await fetch(`${base}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Cloud refresh failed: ${res.status} ${res.statusText} ${txt}`);
  }
  const data = (await res.json()) as Partial<CloudTokenPair>;
  if (typeof data.access_token !== "string" || typeof data.refresh_token !== "string") {
    throw new Error("Cloud refresh did not return a token pair");
  }
  cloudAccessToken = data.access_token;
  cloudRefreshTokenEncrypted = encryptForStorage(data.refresh_token);
  if (unifiedSecrets) {
    unifiedSecrets = { ...unifiedSecrets, cloudRefreshTokenEncrypted: cloudRefreshTokenEncrypted ?? undefined };
  }
  await persistUnifiedToDisk();
}

async function cloudRequest<T>(method: string, pathSuffix: string, body?: unknown): Promise<T> {
  const base = getBackendBaseUrl();
  if (!cloudAccessToken) {
    await cloudRefresh();
  }

  const doReq = async (): Promise<Response> => {
    return fetch(`${base}${pathSuffix}`, {
      method,
      headers: {
        Authorization: `Bearer ${cloudAccessToken ?? ""}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let res = await doReq();
  if (res.status === 401) {
    await cloudRefresh();
    res = await doReq();
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Cloud request failed: ${method} ${pathSuffix} -> ${res.status} ${res.statusText} ${txt}`);
  }
  return (await res.json()) as T;
}

type CloudRepo = {
  id: string;
  name: string;
  localPath: string | null;
  remoteUrl: string | null;
  defaultBranch: string | null;
  policy: Record<string, unknown>;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

async function cloudListRepos(includeArchived = false): Promise<CloudRepo[]> {
  const q = includeArchived ? "?archived=true" : "";
  const res = await cloudRequest<{ repos: CloudRepo[] }>("GET", `/api/repos${q}`);
  return Array.isArray(res.repos) ? res.repos : [];
}

async function cloudCreateRepo(input: {
  name: string;
  localPath?: string | null;
  remoteUrl?: string | null;
  defaultBranch?: string | null;
  policy?: Record<string, unknown>;
}): Promise<CloudRepo> {
  const res = await cloudRequest<{ repo: CloudRepo }>("POST", "/api/repos", input);
  return res.repo;
}

async function cloudArchiveRepo(id: string): Promise<boolean> {
  const res = await cloudRequest<{ success: boolean }>("DELETE", `/api/repos/${encodeURIComponent(id)}`);
  return !!res.success;
}

function resolveRendererEntry(): { type: "url" | "file"; value: string } {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    return { type: "url", value: devUrl };
  }
  return {
    type: "file",
    // Vite build outputs to build/ui (see vite.config.ts)
    value: path.join(__dirname, "index.html")
  };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "SCA-01 The Finisher - Desktop Agent",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs")
    },
    backgroundColor: "#1a1a2e"
  });

  const renderer = resolveRendererEntry();
  if (renderer.type === "url") {
    mainWindow.loadURL(renderer.value).catch((err: unknown) => {
      console.error("Failed to load renderer dev server:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      dialog.showErrorBox("Renderer load error", `Dev server failed: ${msg}`);
    });
  } else {
    mainWindow.loadFile(renderer.value).catch((err: unknown) => {
      console.error("Failed to load renderer file:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      dialog.showErrorBox("Renderer load error", `File load failed: ${msg}`);
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function chatSendMessage(payload: {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  host?: string;
  backendUrl?: string;
  useCloud?: boolean;
}) {
  const modelRaw = String(payload.model ?? "").trim();

  // Prefer cloud backend if configured
  const backend = payload.backendUrl?.trim();
  if (payload.useCloud) {
    if (!backend) {
      throw new Error("Cloud mode kræver backendUrl (SCA_BACKEND_URL). Ingen localhost fallback er tilladt.");
    }
    // In cloud mode, allow "server default model" by omitting `model`.
    // This avoids hard failures when a client-picked model isn't installed upstream.
    const body: any = {
      messages: payload.messages,
      stream: false,
      ...(modelRaw ? { model: modelRaw } : {}),
    };
    const res = await fetch(`${backend.replace(/\/+$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Cloud chat failed: ${res.status} ${res.statusText} ${txt}`);
    }
    const data = await res.json();
    return {
      content: data?.message?.content ?? data?.content ?? "",
      toolCalls: data?.message?.tool_calls,
    };
  }

  // Fallback to local Ollama
  const host = (payload.host ?? runtimeCfg.ollamaHost).replace(/\/+$/, "");
  const model = modelRaw || runtimeCfg.ollamaModel;
  const body = {
    model,
    messages: payload.messages,
    stream: false
  };
  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Ollama chat failed: ${res.status} ${res.statusText} ${txt}`);
  }
  const data = await res.json();
  const content = data?.message?.content ?? "";
  const toolCalls = data?.message?.tool_calls;
  return { content, toolCalls };
}

async function chatGetModels() {
  if (runtimeCfg.useCloud) {
    const backend = (runtimeCfg.backendUrl ?? "").trim();
    if (!backend) return [];
    const res = await fetch(`${backend.replace(/\/+$/, "")}/api/models`);
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: Array<{ name: string; size?: string }> };
    return data.models ?? [];
  }

  const host = runtimeCfg.ollamaHost.replace(/\/+$/, "");
  const res = await fetch(`${host}/api/tags`);
  if (!res.ok) return [];
  const data = (await res.json()) as { models?: Array<{ name: string; size?: number | string }> };
  return (data.models ?? []).map((m) => ({ name: m.name, size: String(m.size ?? "") }));
}

// ========== ROMA IPC ==========
type RomaHealth = { status: string; version: string; roma_version?: string | null; roma_available?: boolean };

async function romaHealth(): Promise<RomaHealth> {
  return romaRequest<RomaHealth>("GET", "/health");
}

async function romaPlan(payload: { goal: string; context?: Record<string, unknown>; strategy?: string }): Promise<unknown> {
  return romaRequest("POST", "/plan", payload);
}

async function romaAct(payload: { task: string; context?: Record<string, unknown>; tools?: unknown[] }): Promise<unknown> {
  return romaRequest("POST", "/act", payload);
}

async function romaSchema(which: "plan" | "act"): Promise<unknown> {
  return romaRequest("GET", which === "plan" ? "/schema/plan" : "/schema/act");
}

// ========== WidgetDC HTTP MCP (route/tools) ==========
type WidgetDcToolList = { tools?: unknown[]; count?: number; definitions?: unknown[] };

function getWidgetDcBaseUrl(): string {
  const env = (process.env.WIDGETDC_MCP_BASE_URL ?? process.env.WIDGETDC_BASE_URL ?? "").trim();
  if (env) return env.replace(/\/+$/, "");
  return DEFAULT_WIDGETDC_BASE_URL;
}

function getWidgetDcAuthHeader(): string | null {
  const raw = (process.env.WIDGETDC_MCP_TOKEN ?? process.env.WIDGETDC_JWT_TOKEN ?? "").trim();
  if (!raw) return null;
  if (raw.toLowerCase().startsWith("bearer ")) return raw;
  return `Bearer ${raw}`;
}

async function widgetdcRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const base = getWidgetDcBaseUrl();
  const url = `${base}${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = getWidgetDcAuthHeader();
  if (auth) headers["Authorization"] = auth;

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const txt = await res.text().catch(() => "");
  let json: any = null;
  if (txt) {
    try {
      json = JSON.parse(txt);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    const msg = (json && typeof json === "object" ? (json as any).detail ?? (json as any).error : null) ?? txt ?? res.statusText;
    throw new Error(`WidgetDC ${method} ${path} failed: ${res.status} ${String(msg)}`);
  }
  return json as T;
}

async function widgetdcListTools(): Promise<WidgetDcToolList> {
  return widgetdcRequest<WidgetDcToolList>("GET", "/api/mcp/tools");
}

async function widgetdcCallTool(payload: { id?: string; tool: string; payload?: Record<string, unknown> }): Promise<unknown> {
  const id = payload.id ?? crypto.randomUUID();
  return widgetdcRequest("POST", "/api/mcp/route", { id, tool: payload.tool, payload: payload.payload ?? {} });
}

function setupChatIpc(): void {
  ipcMain.handle("chat-send-message", (_event: unknown, payload: Parameters<typeof chatSendMessage>[0]) => chatSendMessage(payload));
  ipcMain.handle("chat-get-models", () => chatGetModels());
  ipcMain.handle("chat-check-connectivity", async () => {
    const backend = (runtimeCfg.backendUrl ?? "").trim() || DEFAULT_RAILWAY_BACKEND;
    if (runtimeCfg.useCloud) {
      const ok = await ping(`${backend.replace(/\/+$/, "")}/health`, 2500);
      return { ok, mode: "cloud", url: `${backend.replace(/\/+$/, "")}/health` };
    }
    const host = runtimeCfg.ollamaHost.trim().replace(/\/+$/, "");
    if (!host) return { ok: false, mode: "ollama", url: "" };
    const ok = await ping(`${host}/api/version`, 2500);
    return { ok, mode: "ollama", url: `${host}/api/version` };
  });
  ipcMain.handle("chat-update-settings", async (_event: unknown, partial: Record<string, unknown>) => {
    const next = { ...runtimeCfg };

    if (typeof partial.ollamaHost === "string") next.ollamaHost = partial.ollamaHost;
    if (typeof partial.model === "string") next.ollamaModel = partial.model;
    if (typeof partial.ollamaModel === "string") next.ollamaModel = partial.ollamaModel;
    if (typeof partial.maxTurns === "number" && Number.isFinite(partial.maxTurns)) next.maxTurns = partial.maxTurns;
    if (typeof partial.fullAccess === "boolean") next.fullAccess = partial.fullAccess;
    if (typeof partial.autoApprove === "boolean") next.autoApprove = partial.autoApprove;
    if (typeof partial.backendUrl === "string") next.backendUrl = partial.backendUrl;
    if (typeof partial.useCloud === "boolean") next.useCloud = partial.useCloud;
    if (typeof partial.theme === "string") next.theme = partial.theme;
    if (Array.isArray(partial.safeDirs) && partial.safeDirs.every((p) => typeof p === "string")) {
      next.safeDirs = partial.safeDirs.map((p) => p.trim()).filter(Boolean);
    }

    runtimeCfg = next;

    if (unifiedCfg) {
      unifiedCfg = {
        ...unifiedCfg,
        ollamaHost: runtimeCfg.ollamaHost,
        ollamaModel: runtimeCfg.ollamaModel,
        maxTurns: runtimeCfg.maxTurns,
        fullAccess: runtimeCfg.fullAccess,
        autoApprove: runtimeCfg.autoApprove,
        backendUrl: runtimeCfg.backendUrl ?? "",
        useCloud: !!runtimeCfg.useCloud,
        theme: runtimeCfg.theme ?? "dark",
        safeDirs: runtimeCfg.safeDirs,
      };
      await persistUnifiedToDisk();
    }

    return true;
  });
  ipcMain.handle("chat-set-theme", (_event: unknown, theme: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("chat-theme", theme);
    }
  });
}

function setupCloudIpc(): void {
  ipcMain.handle("cloud-status", async () => {
    // Retry logic with exponential backoff
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const backendUrl = (runtimeCfg.backendUrl ?? "").trim();
        return {
          backendUrl,
          encryptionAvailable: safeStorage.isEncryptionAvailable(),
          loggedIn: typeof cloudRefreshTokenEncrypted === "string" && cloudRefreshTokenEncrypted.length > 0,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        log?.warn("ipc.cloud-status.retry", `Cloud status check failed (attempt ${attempt}/${maxRetries})`, {
          error: lastError.message,
          attempt,
          maxRetries
        });

        if (attempt < maxRetries) {
          // Exponential backoff: 100ms, 200ms, 400ms
          const delay = 100 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    log?.error("ipc.cloud-status.failed", "Cloud status check failed after all retries", {
      error: lastError?.message,
      maxRetries
    });
    throw lastError || new Error("Cloud status check failed");
  });

  ipcMain.handle("cloud-login", async (_event: unknown, payload: { email: string; password: string }) => {
    await cloudLogin(payload.email, payload.password);
    return { success: true };
  });

  ipcMain.handle("cloud-logout", async () => {
    cloudAccessToken = null;
    cloudRefreshTokenEncrypted = null;
    if (unifiedSecrets) {
      unifiedSecrets = { ...unifiedSecrets, cloudRefreshTokenEncrypted: undefined };
    }
    await persistUnifiedToDisk();
    return { success: true };
  });

  ipcMain.handle("cloud-list-repos", async (_event: unknown, payload?: { includeArchived?: boolean }) => {
    const repos = await cloudListRepos(!!payload?.includeArchived);
    return { repos };
  });

  ipcMain.handle("cloud-create-repo", async (_event: unknown, payload: Parameters<typeof cloudCreateRepo>[0]) => {
    const repo = await cloudCreateRepo(payload);
    return { repo };
  });

  ipcMain.handle("cloud-archive-repo", async (_event: unknown, payload: { id: string }) => {
    const success = await cloudArchiveRepo(payload.id);
    return { success };
  });
}

async function setupIpc(): Promise<void> {
  cryptoProvider = createCryptoProvider();
  const userDataDir = app.getPath("userData");
  // Keep MCP config alongside other userData-backed config
  mcpConfigStore = getConfigStore(path.join(userDataDir, "config"));
  unifiedPaths = {
    configPath: path.join(userDataDir, "sca01-config.json"),
    secretsPath: path.join(userDataDir, "sca01-secrets.json"),
    legacySettingsPath: path.join(userDataDir, "settings.json"),
    legacyConfigDir: path.resolve(process.cwd(), "config"),
  };

  const loaded = await loadUnifiedConfig(unifiedPaths, cryptoProvider);
  unifiedCfg = loaded.config;
  unifiedSecrets = loaded.secrets;

  // Ensure all child processes (MCP toolserver, etc.) read the same canonical config.
  process.env["SCA_UNIFIED_CONFIG_PATH"] = unifiedPaths.configPath;

  runtimeCfg = toPhase2RuntimeConfig(unifiedCfg);
  cloudRefreshTokenEncrypted = unifiedSecrets.cloudRefreshTokenEncrypted ?? null;

  log = new HyperLog(runtimeCfg.logDir, "ui.hyperlog.jsonl");
  agent = new DesktopAgent(runtimeCfg);

  // Best-effort: refresh cloud token on startup if configured
  if ((runtimeCfg.backendUrl ?? "").trim() && cloudRefreshTokenEncrypted) {
    try {
      await cloudRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      log?.warn("cloud.refresh.startup_failed", msg);
      cloudAccessToken = null;
    }
  }

  // Get configuration
  ipcMain.handle("get-config", () => {
    return runtimeCfg;
  });

  // MCP (for SettingsModal MCP tab)
  ipcMain.handle("mcp-get-servers", () => {
    return mcpConfigStore?.getServices() ?? [];
  });

  ipcMain.handle("mcp-get-catalog", () => {
    return MCP_SERVER_CATALOG;
  });

  ipcMain.handle("mcp-remove-server", (_event: unknown, name: string) => {
    if (!mcpConfigStore) return false;
    const services = mcpConfigStore.getServices();
    const svc = services.find((s) => s.name === name);
    if (!svc) return false;
    return mcpConfigStore.removeService(svc.id);
  });

  ipcMain.handle("mcp-install-from-catalog", (_event: unknown, serverId: string) => {
    if (!mcpConfigStore) return { success: false, error: "Config store not initialized" };

    const server = getServerById(serverId);
    if (!server) return { success: false, error: "Server not found in catalog" };

    const existing = mcpConfigStore.getServices();
    if (existing.some((s) => s.name === server.name)) {
      return { success: true, server, alreadyInstalled: true, requiresAuth: server.requiresAuth, authEnvVar: server.authEnvVar };
    }

    let command = server.command ?? "";
    if (server.args) command += " " + server.args.join(" ");

    mcpConfigStore.addService({
      name: server.name,
      type: "custom",
      endpoint: server.url ?? command,
      enabled: true
    });

    log?.info("mcp.install", `Installed MCP server: ${server.name}`, { serverId });

    return { success: true, server, requiresAuth: server.requiresAuth, authEnvVar: server.authEnvVar };
  });

  function doMcpAutoSetup(includeAuth: boolean) {
    if (!mcpConfigStore) return { success: false, installed: [], skipped: [], requiresAuth: [] };

    const existing = mcpConfigStore.getServices();
    const existingNames = new Set(existing.map((s) => s.name));

    // Always include WidgetDC Core + SCA-01 Tools in default setup (critical for this repo).
    const widgetdcCore = getServerById("widgetdc-core");
    const targets = [getServerById("sca-01-tools"), widgetdcCore, ...getPopularServers()].filter(Boolean);

    const installed: string[] = [];
    const skipped: Array<{ id: string; name: string; reason: string; authEnvVar?: string }> = [];
    const requiresAuth: Array<{ id: string; name: string; authEnvVar?: string }> = [];

    for (const server of targets) {
      if (!server) continue;

      if (server.requiresAuth) {
        requiresAuth.push({ id: server.id, name: server.name, authEnvVar: server.authEnvVar });
      }

      if (server.requiresAuth && !includeAuth) {
        skipped.push({ id: server.id, name: server.name, reason: "requires_auth", authEnvVar: server.authEnvVar });
        continue;
      }

      if (existingNames.has(server.name)) {
        skipped.push({ id: server.id, name: server.name, reason: "already_installed", authEnvVar: server.authEnvVar });
        continue;
      }

      let command = server.command ?? "";
      if (server.args) command += " " + server.args.join(" ");

      mcpConfigStore.addService({
        name: server.name,
        type: "custom",
        endpoint: server.url ?? command,
        enabled: true
      });
      existingNames.add(server.name);
      installed.push(server.name);
    }

    log?.info("mcp.autosetup", "Auto-setup completed", { installedCount: installed.length, skippedCount: skipped.length });

    return { success: true, installed, skipped, requiresAuth };
  }

  ipcMain.handle("mcp-auto-setup", (_event: unknown, opts?: { includeAuth?: boolean }) => {
    return doMcpAutoSetup(opts?.includeAuth === true);
  });

  // Default baseline: Cloud mode + MCP auto-setup (includes WidgetDC Core).
  // Idempotent: only runs if no custom MCP services exist yet.
  try {
    const services = mcpConfigStore?.getServices() ?? [];
    const hasCustom = services.some((s) => s.type === "custom");
    if (!hasCustom) {
      doMcpAutoSetup(false);
    }
  } catch {
    // ignore default setup failures; user can retry from Settings -> MCP
  }

  ipcMain.handle("perf-get-stats", () => {
    return getPerfStats();
  });

  // Run agent with goal
  ipcMain.handle("run-agent", async (_event: unknown, goal: string) => {
    if (!agent) return { error: "Agent not initialized" };

    try {
      log?.info("ui.agent.start", "Starting agent from UI", { goal });
      const result = await agent.run(goal);
      log?.info("ui.agent.complete", "Agent completed", { resultLength: result.length });
      return { result };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      log?.error("ui.agent.error", msg);
      return { error: msg };
    }
  });

  // Get pending approvals
  ipcMain.handle("get-pending-approvals", () => {
    return globalApprovalQueue.getPending();
  });

  // Get approval history
  ipcMain.handle("get-approval-history", (_event: unknown, limit: number) => {
    return globalApprovalQueue.getHistory(limit);
  });

  // Approve request
  ipcMain.handle("approve-request", (_event: unknown, requestId: string) => {
    const success = globalApprovalQueue.approve(requestId, "ui-user");
    if (success) {
      log?.security("ui.approval.approve", "Request approved via UI", { requestId });
    }
    return success;
  });

  // Reject request
  ipcMain.handle("reject-request", (_event: unknown, requestId: string) => {
    const success = globalApprovalQueue.reject(requestId, "ui-user");
    if (success) {
      log?.security("ui.approval.reject", "Request rejected via UI", { requestId });
    }
    return success;
  });

  // Approve all
  ipcMain.handle("approve-all", () => {
    const count = globalApprovalQueue.approveAll("ui-user");
    log?.security("ui.approval.approve_all", "All requests approved", { count });
    return count;
  });

  // Reject all
  ipcMain.handle("reject-all", () => {
    const count = globalApprovalQueue.rejectAll("ui-user");
    log?.security("ui.approval.reject_all", "All requests rejected", { count });
    return count;
  });

  // Listen for new approval requests
  globalApprovalQueue.on("request", (request: ApprovalRequest) => {
    if (mainWindow) {
      mainWindow.webContents.send("approval-request", request);

      // Show system notification
      if (Notification.isSupported()) {
        new Notification({
          title: "SCA-01: Approval Required",
          body: `${request.operation}: ${request.description}`,
          urgency: request.riskLevel === "high" ? "critical" : "normal"
        }).show();
      }
    }
  });

  // Listen for resolved approvals
  globalApprovalQueue.on("resolved", (request: ApprovalRequest) => {
    if (mainWindow) {
      mainWindow.webContents.send("approval-resolved", request);
    }
  });

  setupChatIpc();
  setupCloudIpc();

  // Shell API for opening external links
  ipcMain.handle("shell-open-external", async (_event: unknown, url: string) => {
    if (typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))) {
      await shell.openExternal(url);
    }
  });

  // ROMA bridge (local service via docker-compose)
  ipcMain.handle("roma-health", () => romaHealth());
  ipcMain.handle("roma-plan", (_event: unknown, payload: Parameters<typeof romaPlan>[0]) => romaPlan(payload));
  ipcMain.handle("roma-act", (_event: unknown, payload: Parameters<typeof romaAct>[0]) => romaAct(payload));
  ipcMain.handle("roma-schema", (_event: unknown, which: "plan" | "act") => romaSchema(which));

  // WidgetDC (HTTP MCP endpoints)
  ipcMain.handle("widgetdc-tools", () => widgetdcListTools());
  ipcMain.handle("widgetdc-call", (_event: unknown, payload: Parameters<typeof widgetdcCallTool>[0]) => widgetdcCallTool(payload));

  // Register Pulse+ IPC handlers
  registerPulseIpcHandlers();
}

export async function startMain(electron: ElectronModule): Promise<void> {
  // Bind electron runtime APIs (keeps this module ESM-safe without importing 'electron')
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  ipcMain = electron.ipcMain;
  dialog = electron.dialog;
  Notification = electron.Notification;
  safeStorage = electron.safeStorage;
  shell = electron.shell;

  await app.whenReady();

  // Setup online/offline event listeners for HyperLog sync
  const log = new HyperLog("./logs", "desktop-main.jsonl");

  // Setup online/offline status tracking for HyperLog
  const updateOnlineStatus = async (online: boolean) => {
    log.setOnlineStatus(online);

    // Set up cloud flush callback when online
    if (online && runtimeCfg?.backendUrl) {
      log.setFlushCallback(async (events) => {
        try {
          const response = await fetch(`${runtimeCfg.backendUrl}/api/logs/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': cloudAccessToken ? `Bearer ${cloudAccessToken}` : '',
            },
            body: JSON.stringify({ events }),
          });

          if (!response.ok) {
            throw new Error(`Failed to sync logs: ${response.status}`);
          }

          log.info("log.sync.success", "Logs synced to cloud", { count: events.length });
        } catch (error) {
          log.warn("log.sync.failed", "Failed to sync logs to cloud", { error: String(error) });
          throw error; // Re-throw to keep buffer
        }
      });
    }
  };

  // Initial online status check using Node.js connectivity
  const initialOnline = await ping('https://www.google.com', 1000).catch(() => false);
  await updateOnlineStatus(initialOnline);

  // Periodic connectivity check (since Electron doesn't have online/offline events in main process)
  let lastOnlineStatus = initialOnline;
  setInterval(async () => {
    const online = await ping('https://www.google.com', 1000).catch(() => false);
    if (online !== lastOnlineStatus) {
      lastOnlineStatus = online;
      await updateOnlineStatus(online);
    }
  }, 30000); // Check every 30 seconds

  await setupIpc();

  // Start perf sampler early so we can catch leaks during app lifecycle.
  startPerfSampler(1000);

  // Ensure settings.json always exists and contains a full default shape
  await ensureDefaultsPersisted();

  // Ensure we pick a working backend BEFORE the UI loads
  await ensureConnectivityOnStartup();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}


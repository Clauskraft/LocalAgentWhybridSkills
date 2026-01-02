/// <reference types="node" />
import { app, BrowserWindow, ipcMain, dialog, Notification, safeStorage } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { globalApprovalQueue } from "../approval/approvalQueue.js";
import { loadConfig } from "../config.js";
import { DesktopAgent } from "../agent/DesktopAgent.js";
import { HyperLog } from "../logging/hyperlog.js";
// import { initUpdater } from "../updater/autoUpdater.js"; // TODO: Fix ESM/CJS loading issue

import type { ApprovalRequest } from "../approval/approvalQueue.js";

// ES Module __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let agent: DesktopAgent | null = null;
let log: HyperLog | null = null;
let runtimeCfg = loadConfig();
let settingsFilePath: string | null = null;
let cloudAccessToken: string | null = null;
let cloudRefreshTokenEncrypted: string | null = null;

type CloudTokenPair = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
};

function getBackendBaseUrl(): string {
  const raw = (runtimeCfg.backendUrl ?? "").trim();
  if (!raw) throw new Error("Cloud backendUrl is not configured");
  return raw.replace(/\/+$/, "");
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

async function persistSettingsToDisk(): Promise<void> {
  if (!settingsFilePath) return;
  await fs.mkdir(path.dirname(settingsFilePath), { recursive: true });
  await fs.writeFile(
    settingsFilePath,
    JSON.stringify(
      {
        ollamaHost: runtimeCfg.ollamaHost,
        ollamaModel: runtimeCfg.ollamaModel,
        maxTurns: runtimeCfg.maxTurns,
        fullAccess: runtimeCfg.fullAccess,
        autoApprove: runtimeCfg.autoApprove,
        backendUrl: runtimeCfg.backendUrl,
        useCloud: runtimeCfg.useCloud,
        theme: runtimeCfg.theme,
        safeDirs: runtimeCfg.safeDirs,

        // Encrypted secrets (never expose to renderer)
        cloudRefreshTokenEncrypted,
      },
      null,
      2
    ),
    { encoding: "utf8" }
  );
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
  await persistSettingsToDisk();
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
  await persistSettingsToDisk();
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
      preload: path.join(__dirname, "preload.js")
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
  const model = payload.model ?? runtimeCfg.ollamaModel;

  // Prefer cloud backend if configured
  const backend = payload.backendUrl?.trim();
  if (payload.useCloud) {
    if (!backend) {
      throw new Error("Cloud mode kræver backendUrl (SCA_BACKEND_URL). Ingen localhost fallback er tilladt.");
    }
    const body = {
      model,
      messages: payload.messages,
      stream: false,
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

function setupChatIpc(): void {
  ipcMain.handle("chat-send-message", (_event: unknown, payload: Parameters<typeof chatSendMessage>[0]) => chatSendMessage(payload));
  ipcMain.handle("chat-get-models", () => chatGetModels());
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

    await persistSettingsToDisk();

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
    const backendUrl = (runtimeCfg.backendUrl ?? "").trim();
    return {
      backendUrl,
      encryptionAvailable: safeStorage.isEncryptionAvailable(),
      loggedIn: typeof cloudRefreshTokenEncrypted === "string" && cloudRefreshTokenEncrypted.length > 0,
    };
  });

  ipcMain.handle("cloud-login", async (_event: unknown, payload: { email: string; password: string }) => {
    await cloudLogin(payload.email, payload.password);
    return { success: true };
  });

  ipcMain.handle("cloud-logout", async () => {
    cloudAccessToken = null;
    cloudRefreshTokenEncrypted = null;
    await persistSettingsToDisk();
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
  const cfg = loadConfig();
  runtimeCfg = cfg;
  settingsFilePath = path.join(app.getPath("userData"), "settings.json");

  // Load persisted overrides (best-effort) BEFORE agent/log init
  if (settingsFilePath) {
    try {
      const raw = await fs.readFile(settingsFilePath, { encoding: "utf8" });
      const persisted = JSON.parse(raw) as unknown;
      if (persisted && typeof persisted === "object") {
        const p = persisted as Record<string, unknown>;
        const next = { ...runtimeCfg };

        if (typeof p.ollamaHost === "string") next.ollamaHost = p.ollamaHost;
        if (typeof p.ollamaModel === "string") next.ollamaModel = p.ollamaModel;
        if (typeof p.maxTurns === "number" && Number.isFinite(p.maxTurns)) next.maxTurns = p.maxTurns;
        if (typeof p.fullAccess === "boolean") next.fullAccess = p.fullAccess;
        if (typeof p.autoApprove === "boolean") next.autoApprove = p.autoApprove;
        if (typeof p.backendUrl === "string") next.backendUrl = p.backendUrl;
        if (typeof p.useCloud === "boolean") next.useCloud = p.useCloud;
        if (typeof p.theme === "string") next.theme = p.theme;
        if (Array.isArray(p.safeDirs) && p.safeDirs.every((x) => typeof x === "string")) {
          next.safeDirs = p.safeDirs.map((x) => x.trim()).filter(Boolean);
        }
        if (typeof p.cloudRefreshTokenEncrypted === "string" && p.cloudRefreshTokenEncrypted.trim().length > 0) {
          cloudRefreshTokenEncrypted = p.cloudRefreshTokenEncrypted.trim();
        }

        runtimeCfg = next;
      }
    } catch {
      // ignore missing/invalid settings
    }
  }

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
}

app.whenReady().then(async () => {
  await setupIpc();
  createWindow();

  // TODO: Re-enable auto-updater after fixing ESM/CJS loading issue
  // const updater = initUpdater({
  //   checkOnStartup: true,
  //   autoDownload: true,
  //   autoInstallOnQuit: true,
  //   checkInterval: 60 * 60 * 1000, // 1 hour
  // }, runtimeCfg.logDir);
  //
  // if (mainWindow) {
  //   updater.setMainWindow(mainWindow);
  //   updater.startPeriodicChecks();
  // }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});


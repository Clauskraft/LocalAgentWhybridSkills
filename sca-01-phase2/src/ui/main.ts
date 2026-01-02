/// <reference types="node" />
import { app, BrowserWindow, ipcMain, dialog, Notification } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { globalApprovalQueue } from "../approval/approvalQueue.js";
import { loadConfig } from "../config.js";
import { DesktopAgent } from "../agent/DesktopAgent.js";
import { HyperLog } from "../logging/hyperlog.js";

import type { ApprovalRequest } from "../approval/approvalQueue.js";

// ES Module __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let agent: DesktopAgent | null = null;
let log: HyperLog | null = null;
let runtimeCfg = loadConfig();
let settingsFilePath: string | null = null;

function resolveRendererEntry(): { type: "url" | "file"; value: string } {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    return { type: "url", value: devUrl };
  }
  return {
    type: "file",
    value: path.resolve(__dirname, "../../dist/renderer/index.html")
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
  if (backend && payload.useCloud) {
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

    if (settingsFilePath) {
      await fs.mkdir(path.dirname(settingsFilePath), { recursive: true });
      await fs.writeFile(settingsFilePath, JSON.stringify({
        ollamaHost: runtimeCfg.ollamaHost,
        ollamaModel: runtimeCfg.ollamaModel,
        maxTurns: runtimeCfg.maxTurns,
        fullAccess: runtimeCfg.fullAccess,
        autoApprove: runtimeCfg.autoApprove,
        backendUrl: runtimeCfg.backendUrl,
        useCloud: runtimeCfg.useCloud,
        theme: runtimeCfg.theme,
        safeDirs: runtimeCfg.safeDirs,
      }, null, 2), { encoding: "utf8" });
    }

    return true;
  });
  ipcMain.handle("chat-set-theme", (_event: unknown, theme: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("chat-theme", theme);
    }
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

        runtimeCfg = next;
      }
    } catch {
      // ignore missing/invalid settings
    }
  }

  log = new HyperLog(runtimeCfg.logDir, "ui.hyperlog.jsonl");
  agent = new DesktopAgent(runtimeCfg);

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
}

app.whenReady().then(async () => {
  await setupIpc();
  createWindow();

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


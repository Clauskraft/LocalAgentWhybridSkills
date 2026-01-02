import { app, BrowserWindow, ipcMain, dialog, Notification } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globalApprovalQueue } from "../approval/approvalQueue.js";
import { loadConfig } from "../config.js";
import { DesktopAgent } from "../agent/DesktopAgent.js";
import { HyperLog } from "../logging/hyperlog.js";
import fetch from "node-fetch";

// ES Module __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let agent: DesktopAgent | null = null;
let log: HyperLog | null = null;

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
    mainWindow.loadURL(renderer.value).catch((err) => {
      console.error("Failed to load renderer dev server:", err);
      dialog.showErrorBox("Renderer load error", `Dev server failed: ${err.message}`);
    });
  } else {
    mainWindow.loadFile(renderer.value).catch((err) => {
      console.error("Failed to load renderer file:", err);
      dialog.showErrorBox("Renderer load error", `File load failed: ${err.message}`);
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
  const cfg = loadConfig();
  const model = payload.model ?? cfg.ollamaModel;

  // Prefer cloud backend if configured
  const backend = payload.backendUrl?.trim();
  if (backend) {
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
  const host = (payload.host ?? cfg.ollamaHost).replace(/\/+$/, "");
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
  const cfg = loadConfig();
  const host = cfg.ollamaHost.replace(/\/+$/, "");
  const res = await fetch(`${host}/api/tags`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.models ?? []).map((m: any) => ({ name: m.name, size: m.size }));
}

async function chatGetAvailableModels() {
  // Ollama does not expose a full catalog; provide curated list
  return [
    { name: "qwen3", description: "General model with tool calling", size: "4.7 GB", recommended: true },
    { name: "llama3.1", description: "Meta Llama 3.1", size: "4.1 GB", recommended: true },
    { name: "mistral", description: "Mistral 7B", size: "4.1 GB" },
    { name: "codellama", description: "Code-focused model", size: "7B+" }
  ];
}

function setupChatIpc(): void {
  ipcMain.handle("chat-send-message", (_event, payload) => chatSendMessage(payload));
  ipcMain.handle("chat-get-models", () => chatGetModels());
  ipcMain.handle("chat-get-available-models", () => chatGetAvailableModels());
  ipcMain.handle("chat-update-settings", (_event, partial: Record<string, unknown>) => {
    // persist in memory for now; can be extended to disk
    // this keeps compatibility with existing cfg load
  });
  ipcMain.handle("chat-set-theme", (_event, theme: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("chat-theme", theme);
    }
  });
}

function setupIpc(): void {
  const cfg = loadConfig();
  log = new HyperLog(cfg.logDir, "ui.hyperlog.jsonl");
  agent = new DesktopAgent(cfg);

  // Get configuration
  ipcMain.handle("get-config", () => {
    return cfg;
  });

  // Run agent with goal
  ipcMain.handle("run-agent", async (_event, goal: string) => {
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
  ipcMain.handle("get-approval-history", (_event, limit: number) => {
    return globalApprovalQueue.getHistory(limit);
  });

  // Approve request
  ipcMain.handle("approve-request", (_event, requestId: string) => {
    const success = globalApprovalQueue.approve(requestId, "ui-user");
    if (success) {
      log?.security("ui.approval.approve", "Request approved via UI", { requestId });
    }
    return success;
  });

  // Reject request
  ipcMain.handle("reject-request", (_event, requestId: string) => {
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
  globalApprovalQueue.on("request", (request) => {
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
  globalApprovalQueue.on("resolved", (request) => {
    if (mainWindow) {
      mainWindow.webContents.send("approval-resolved", request);
    }
  });

  setupChatIpc();
}

app.whenReady().then(() => {
  setupIpc();
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


import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs";
import { ConfigStore } from "../config/configStore.js";
import { HyperLog } from "../logging/hyperlog.js";
import { bootstrap, startOllama, isOllamaRunning, type BootstrapResult, type CheckResult } from "../startup/bootstrap.js";
import { MCP_SERVER_CATALOG, getServersByCategory, getPopularServers, searchServers, getServerById, getAllCategories, getCategoryLabel, type McpCategory } from "../mcp/serverCatalog.js";
import { getIntegrationManager } from "../config/integrationConfig.js";

// ============================================================================
// CHAT MAIN PROCESS
// Handles communication between Electron UI and SCA-01 agent
// ============================================================================

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let configStore: ConfigStore;
let log: HyperLog;
let bootstrapResult: BootstrapResult | null = null;

// Chat storage
interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
  timestamp: string;
}

interface ChatData {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

const chatStorePath = "./data/chats";

function ensureChatStorage(): void {
  if (!fs.existsSync(chatStorePath)) {
    fs.mkdirSync(chatStorePath, { recursive: true });
  }
}

// ========== SPLASH / STARTUP SCREEN ==========

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });
  
  // Load inline splash HTML
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getSplashHtml())}`);
}

function getSplashHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(145deg, #0d0d14, #1a1a2e);
      color: #fff;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      -webkit-app-region: drag;
      border-radius: 16px;
      overflow: hidden;
    }
    .logo {
      font-size: 48px;
      font-weight: 700;
      background: linear-gradient(135deg, #00ff88, #00d4ff);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #888;
      margin-bottom: 32px;
    }
    .status {
      font-size: 14px;
      color: #00ff88;
      margin-bottom: 16px;
      min-height: 20px;
    }
    .checks {
      width: 80%;
      max-width: 350px;
    }
    .check {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .check-icon {
      width: 24px;
      height: 24px;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .check-icon.pending { color: #666; }
    .check-icon.running { color: #00d4ff; animation: pulse 1s infinite; }
    .check-icon.pass { color: #00ff88; }
    .check-icon.warn { color: #ffaa00; }
    .check-icon.fail { color: #ff4466; }
    .check-name { flex: 1; font-size: 13px; }
    .check-status { font-size: 12px; color: #666; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #333;
      border-top-color: #00ff88;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error-box {
      background: rgba(255,68,102,0.1);
      border: 1px solid rgba(255,68,102,0.3);
      padding: 12px;
      border-radius: 8px;
      margin-top: 16px;
      font-size: 12px;
      color: #ff4466;
      display: none;
    }
  </style>
</head>
<body>
  <div class="logo">SCA-01</div>
  <div class="subtitle">The Finisher • Executive Edition</div>
  <div id="status" class="status">
    <div class="spinner" style="display: inline-block; margin-right: 8px;"></div>
    Running startup checks...
  </div>
  <div class="checks" id="checks"></div>
  <div class="error-box" id="errorBox"></div>
</body>
</html>`;
}

function updateSplashStatus(status: string): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.executeJavaScript(`
      document.getElementById('status').innerHTML = '${status.replace(/'/g, "\\'")}';
    `).catch(() => {/* ignore */});
  }
}

function updateSplashChecks(checks: CheckResult[]): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    const html = checks.map(c => {
      const iconClass = c.status;
      const icon = c.status === "pass" ? "✓" : c.status === "warn" ? "⚠" : "✕";
      return `<div class="check">
        <div class="check-icon ${iconClass}">${icon}</div>
        <div class="check-name">${c.name}</div>
        <div class="check-status">${c.message}</div>
      </div>`;
    }).join("");
    
    splashWindow.webContents.executeJavaScript(`
      document.getElementById('checks').innerHTML = \`${html.replace(/`/g, "\\`")}\`;
    `).catch(() => {/* ignore */});
  }
}

function showSplashError(errors: string[]): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    const html = errors.map(e => `• ${e}`).join("<br>");
    splashWindow.webContents.executeJavaScript(`
      const box = document.getElementById('errorBox');
      box.innerHTML = \`${html.replace(/`/g, "\\`")}\`;
      box.style.display = 'block';
      document.getElementById('status').innerHTML = '<span style="color:#ff4466">❌ Startup failed</span>';
    `).catch(() => {/* ignore */});
  }
}

function closeSplash(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

async function runStartupChecks(): Promise<boolean> {
  const settings = configStore.getSettings();
  
  // Parse Ollama host
  let port = 11434;
  let host = "localhost";
  
  try {
    const url = new URL(settings.ollamaHost);
    host = url.hostname;
    port = parseInt(url.port, 10) || 11434;
  } catch {
    // Use defaults
  }
  
  updateSplashStatus('<div class="spinner" style="display: inline-block; margin-right: 8px;"></div> Running startup checks...');
  
  bootstrapResult = await bootstrap({
    host,
    port,
    model: settings.ollamaModel,
    autoStart: true,
    startTimeout: 30000,
  });
  
  updateSplashChecks(bootstrapResult.checks);
  
  if (!bootstrapResult.success) {
    showSplashError(bootstrapResult.errors);
    
    // Wait a bit before closing
    await new Promise(r => setTimeout(r, 5000));
    return false;
  }
  
  updateSplashStatus('<span style="color:#00ff88">✓ All checks passed!</span>');
  await new Promise(r => setTimeout(r, 1000));
  
  return true;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0d0d14",
    webPreferences: {
      // Preload bundle is written to build/ui by build-preload.js
      preload: path.join(import.meta.dirname, "preloadChat.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // Must be false for preload to work correctly
    },
    titleBarStyle: "hiddenInset",
    title: "SCA-01 The Finisher"
  });

  // Load chat.html from src folder
  const htmlPath = path.join(import.meta.dirname, "..", "..", "src", "ui", "chat.html");
  mainWindow.loadFile(htmlPath);
  
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ========== OLLAMA INTEGRATION ==========

async function checkOllama(): Promise<boolean> {
  const settings = configStore.getSettings();
  try {
    const response = await fetch(`${settings.ollamaHost}/api/version`);
    return response.ok;
  } catch {
    return false;
  }
}

async function getOllamaModels(): Promise<Array<{ name: string; size?: string }>> {
  const settings = configStore.getSettings();
  try {
    const response = await fetch(`${settings.ollamaHost}/api/tags`);
    if (!response.ok) return [];
    
    const data = await response.json() as { models?: Array<{ name: string; size?: number }> };
    return (data.models ?? []).map(m => ({
      name: m.name,
      size: m.size ? `${(m.size / 1e9).toFixed(1)} GB` : undefined
    }));
  } catch {
    return [];
  }
}

async function sendToOllama(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<{ content: string; toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }> }> {
  const settings = configStore.getSettings();
  
  // Build Ollama messages
  const ollamaMessages = [];
  
  if (systemPrompt) {
    ollamaMessages.push({ role: "system", content: systemPrompt });
  }
  
  for (const msg of messages) {
    ollamaMessages.push({
      role: msg.role,
      content: msg.content
    });
  }
  
  // Get available tools
  const tools = getAvailableTools();
  
  const response = await fetch(`${settings.ollamaHost}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.ollamaModel,
      messages: ollamaMessages,
      tools,
      stream: false
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Ollama error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const data = await response.json() as {
    message?: {
      content?: string;
      tool_calls?: Array<{
        function: { name: string; arguments: Record<string, unknown> }
      }>;
    };
    error?: string;
  };
  
  if (data.error) {
    throw new Error(`Ollama: ${data.error}`);
  }
  
  if (!data.message) {
    throw new Error("Ollama returned empty response");
  }
  
  return {
    content: data.message.content ?? "",
    toolCalls: data.message.tool_calls?.map(tc => ({
      name: tc.function.name,
      arguments: tc.function.arguments
    }))
  };
}

function getAvailableTools(): Array<{ type: string; function: unknown }> {
  return [
    {
      type: "function",
      function: {
        name: "read_file",
        description: "Read contents of a file",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to read" }
          },
          required: ["path"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "write_file",
        description: "Write content to a file",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path" },
            content: { type: "string", description: "Content to write" }
          },
          required: ["path", "content"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "list_directory",
        description: "List files in a directory",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Directory path" }
          },
          required: ["path"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "run_command",
        description: "Execute a shell command",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string", description: "Command to run" }
          },
          required: ["command"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "search_files",
        description: "Search for files matching a pattern",
        parameters: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Search pattern" },
            path: { type: "string", description: "Directory to search in" }
          },
          required: ["pattern"]
        }
      }
    }
  ];
}

// ========== IPC HANDLERS ==========

function setupIpcHandlers(): void {
  // Bootstrap / Startup
  ipcMain.handle("chat:getBootstrapResult", () => {
    return bootstrapResult;
  });

  ipcMain.handle("chat:rerunStartupChecks", async () => {
    const settings = configStore.getSettings();
    let port = 11434;
    let host = "localhost";
    
    try {
      const url = new URL(settings.ollamaHost);
      host = url.hostname;
      port = parseInt(url.port, 10) || 11434;
    } catch {
      // Use defaults
    }
    
    bootstrapResult = await bootstrap({
      host,
      port,
      model: settings.ollamaModel,
      autoStart: false, // Don't auto-start on recheck
      startTimeout: 15000,
    });
    
    return bootstrapResult;
  });

  ipcMain.handle("chat:startOllama", async () => {
    const settings = configStore.getSettings();
    let port = 11434;
    let host = "localhost";
    
    try {
      const url = new URL(settings.ollamaHost);
      host = url.hostname;
      port = parseInt(url.port, 10) || 11434;
    } catch {
      // Use defaults
    }
    
    const started = await startOllama({
      host,
      port,
      model: settings.ollamaModel,
      autoStart: true,
      startTimeout: 30000,
    });
    
    return { success: started };
  });

  ipcMain.handle("chat:isOllamaRunning", async () => {
    const settings = configStore.getSettings();
    let port = 11434;
    let host = "localhost";
    
    try {
      const url = new URL(settings.ollamaHost);
      host = url.hostname;
      port = parseInt(url.port, 10) || 11434;
    } catch {
      // Use defaults
    }
    
    return await isOllamaRunning({ host, port, model: "", autoStart: false, startTimeout: 0 });
  });

  // Config
  ipcMain.handle("chat:getConfig", () => {
    const settings = configStore.getSettings();
    return {
      ollamaHost: settings.ollamaHost,
      model: settings.ollamaModel,
      maxTurns: settings.maxTurns,
      fullAccess: settings.fullAccess,
      autoApprove: settings.autoApprove
    };
  });

  ipcMain.handle("chat:updateSettings", (_event, updates: Record<string, unknown>) => {
    // Map frontend names to config names
    const mapped: Partial<ReturnType<typeof configStore.getSettings>> = {};
    
    if ("ollamaModel" in updates) mapped.ollamaModel = updates.ollamaModel as string;
    if ("ollamaHost" in updates) mapped.ollamaHost = updates.ollamaHost as string;
    if ("maxTurns" in updates) mapped.maxTurns = updates.maxTurns as number;
    if ("fullAccess" in updates) mapped.fullAccess = updates.fullAccess as boolean;
    if ("autoApprove" in updates) mapped.autoApprove = updates.autoApprove as boolean;
    
    configStore.updateSettings(mapped);
    log.info("chat.settingsUpdated", "Settings updated", updates);
    return true;
  });

  // Ollama
  ipcMain.handle("chat:checkOllama", async () => {
    return await checkOllama();
  });

  ipcMain.handle("chat:getModels", async () => {
    return await getOllamaModels();
  });

  ipcMain.handle("chat:getAvailableModels", async () => {
    // Popular models from Ollama library
    return [
      { name: "qwen3", description: "Alibaba's Qwen3 - excellent tool calling", size: "4.7GB", recommended: true },
      { name: "qwen3:14b", description: "Qwen3 14B - more capable", size: "9.0GB", recommended: true },
      { name: "llama3.1", description: "Meta Llama 3.1 8B", size: "4.7GB", recommended: true },
      { name: "llama3.1:70b", description: "Meta Llama 3.1 70B - very capable", size: "40GB", recommended: false },
      { name: "llama3.2", description: "Meta Llama 3.2 3B - fast", size: "2.0GB", recommended: true },
      { name: "mistral", description: "Mistral 7B v0.3", size: "4.1GB", recommended: true },
      { name: "mixtral", description: "Mixtral 8x7B MoE", size: "26GB", recommended: false },
      { name: "codellama", description: "Code Llama 7B", size: "3.8GB", recommended: false },
      { name: "deepseek-coder-v2", description: "DeepSeek Coder V2", size: "8.9GB", recommended: true },
      { name: "phi3", description: "Microsoft Phi-3 Mini", size: "2.2GB", recommended: true },
      { name: "phi3:medium", description: "Microsoft Phi-3 Medium", size: "7.9GB", recommended: false },
      { name: "gemma2", description: "Google Gemma 2 9B", size: "5.4GB", recommended: true },
      { name: "gemma2:27b", description: "Google Gemma 2 27B", size: "16GB", recommended: false },
      { name: "command-r", description: "Cohere Command R", size: "20GB", recommended: false },
      { name: "wizardlm2", description: "WizardLM 2 7B", size: "4.1GB", recommended: false },
      { name: "dolphin-mixtral", description: "Dolphin Mixtral uncensored", size: "26GB", recommended: false },
      { name: "nous-hermes2", description: "Nous Hermes 2 Mixtral", size: "26GB", recommended: false },
      { name: "starcoder2", description: "StarCoder2 3B", size: "1.7GB", recommended: false },
      { name: "codegemma", description: "Google CodeGemma 7B", size: "5.0GB", recommended: false },
      { name: "llava", description: "LLaVA 7B - vision model", size: "4.5GB", recommended: false },
    ];
  });

  ipcMain.handle("chat:pullModel", async (_event, modelName: string) => {
    const settings = configStore.getSettings();
    log.info("chat.pullModel", `Starting download: ${modelName}`);
    
    try {
      const response = await fetch(`${settings.ollamaHost}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName, stream: false })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }
      
      const result = await response.json();
      log.info("chat.pullModel", `Download complete: ${modelName}`);
      return { success: true, result };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      log.error("chat.pullModel", msg);
      return { success: false, error: msg };
    }
  });

  ipcMain.handle("chat:pullModelStream", async (_event, modelName: string) => {
    const settings = configStore.getSettings();
    log.info("chat.pullModelStream", `Starting streamed download: ${modelName}`);
    
    try {
      const response = await fetch(`${settings.ollamaHost}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName, stream: true })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let lastStatus = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as { status?: string; completed?: number; total?: number };
            lastStatus = data.status ?? lastStatus;
            
            // Send progress to renderer
            if (data.completed && data.total) {
              const percent = Math.round((data.completed / data.total) * 100);
              mainWindow?.webContents.send("chat:pullProgress", {
                model: modelName,
                status: lastStatus,
                percent,
                completed: data.completed,
                total: data.total
              });
            } else {
              mainWindow?.webContents.send("chat:pullProgress", {
                model: modelName,
                status: lastStatus,
                percent: 0
              });
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      log.info("chat.pullModelStream", `Download complete: ${modelName}`);
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      log.error("chat.pullModelStream", msg);
      return { success: false, error: msg };
    }
  });

  ipcMain.handle("chat:deleteModel", async (_event, modelName: string) => {
    const settings = configStore.getSettings();
    log.info("chat.deleteModel", `Deleting: ${modelName}`);
    
    try {
      const response = await fetch(`${settings.ollamaHost}/api/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete model: ${response.statusText}`);
      }
      
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      log.error("chat.deleteModel", msg);
      return { success: false, error: msg };
    }
  });

  // Chat
  ipcMain.handle("chat:sendMessage", async (_event, data: { 
    chatId: string; 
    messages: ChatMessage[]; 
    settings: { systemPrompt?: string } 
  }) => {
    try {
      log.info("chat.send", "Sending message", { chatId: data.chatId, messageCount: data.messages.length });
      
      const response = await sendToOllama(data.messages, data.settings.systemPrompt);
      
      // If there are tool calls, execute them
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const tc of response.toolCalls) {
          log.info("chat.toolCall", `Executing tool: ${tc.name}`, { args: tc.arguments });
          
          // Notify UI about tool call
          mainWindow?.webContents.send("chat:toolCall", tc);
        }
      }
      
      return response;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      log.error("chat.error", msg);
      throw e;
    }
  });

  ipcMain.handle("chat:getChatHistory", () => {
    ensureChatStorage();
    
    const files = fs.readdirSync(chatStorePath).filter(f => f.endsWith(".json"));
    const chats: Array<{ id: string; title: string; createdAt: string }> = [];
    
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(chatStorePath, file), "utf8")) as ChatData;
        chats.push({
          id: data.id,
          title: data.title,
          createdAt: data.createdAt
        });
      } catch {
        // Skip invalid files
      }
    }
    
    // Sort by date, newest first
    return chats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  ipcMain.handle("chat:loadChat", (_event, chatId: string) => {
    ensureChatStorage();
    const filePath = path.join(chatStorePath, `${chatId}.json`);
    
    if (!fs.existsSync(filePath)) return null;
    
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      return null;
    }
  });

  ipcMain.handle("chat:saveChat", (_event, data: ChatData) => {
    ensureChatStorage();
    const filePath = path.join(chatStorePath, `${data.id}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify({
      ...data,
      createdAt: data.createdAt || new Date().toISOString()
    }, null, 2));
    
    return true;
  });

  ipcMain.handle("chat:deleteChat", (_event, chatId: string) => {
    ensureChatStorage();
    const filePath = path.join(chatStorePath, `${chatId}.json`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return true;
  });

  // MCP
  ipcMain.handle("chat:getMcpServers", () => {
    return configStore.getServices();
  });

  ipcMain.handle("chat:addMcpServer", (_event, server: { name: string; type: string; command: string }) => {
    configStore.addService({
      name: server.name,
      type: "custom",
      endpoint: server.command,
      enabled: true
    });
    return true;
  });

  ipcMain.handle("chat:removeMcpServer", (_event, name: string) => {
    const services = configStore.getServices();
    const service = services.find(s => s.name === name);
    if (service) {
      configStore.removeService(service.id);
    }
    return true;
  });

  // MCP Catalog
  ipcMain.handle("chat:getMcpCatalog", () => {
    return MCP_SERVER_CATALOG;
  });

  ipcMain.handle("chat:getMcpCategories", () => {
    return getAllCategories().map(cat => ({
      id: cat,
      label: getCategoryLabel(cat)
    }));
  });

  ipcMain.handle("chat:getMcpByCategory", (_event, category: McpCategory) => {
    return getServersByCategory(category);
  });

  ipcMain.handle("chat:getPopularMcp", () => {
    return getPopularServers();
  });

  ipcMain.handle("chat:searchMcp", (_event, query: string) => {
    return searchServers(query);
  });

  ipcMain.handle("chat:installMcpFromCatalog", (_event, serverId: string) => {
    const server = getServerById(serverId);
    if (!server) {
      return { success: false, error: "Server not found in catalog" };
    }

    // Build command string
    let command = server.command ?? "";
    if (server.args) {
      command += " " + server.args.join(" ");
    }

    // Add to config store
    configStore.addService({
      name: server.name,
      type: "custom", // All catalog servers are custom type for config store
      endpoint: server.url ?? command,
      enabled: true
    });

    log.info("mcp.install", `Installed MCP server: ${server.name}`, { serverId });

    return { 
      success: true, 
      server,
      requiresAuth: server.requiresAuth,
      authEnvVar: server.authEnvVar
    };
  });

  ipcMain.handle("chat:autoSetupMcp", (_event, opts?: { includeAuth?: boolean }) => {
    const includeAuth = opts?.includeAuth === true;

    const existing = configStore.getServices();
    const existingNames = new Set(existing.map((s) => s.name));

    // Start with built-in tools, then popular catalog servers.
    const targets = [
      getServerById("sca-01-tools"),
      ...getPopularServers(),
    ].filter(Boolean);

    /** @type {string[]} */
    const installed = [];
    /** @type {Array<{ id: string; name: string; reason: string; authEnvVar?: string }>} */
    const skipped = [];
    /** @type {Array<{ id: string; name: string; authEnvVar?: string }>} */
    const requiresAuth = [];

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

      configStore.addService({
        name: server.name,
        type: "custom",
        endpoint: server.url ?? command,
        enabled: true
      });
      existingNames.add(server.name);
      installed.push(server.name);

    }

    log.info("mcp.autosetup", "Auto-setup completed", { installedCount: installed.length, skippedCount: skipped.length });

    return { success: true, installed, skipped, requiresAuth };
  });

  // Files
  ipcMain.handle("chat:attachFile", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openFile"],
      filters: [
        { name: "All Files", extensions: ["*"] },
        { name: "Text", extensions: ["txt", "md", "json", "ts", "js", "py"] }
      ]
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    
    const filePath = result.filePaths[0];
    if (!filePath) return null;
    
    try {
      const content = fs.readFileSync(filePath, "utf8");
      return {
        path: filePath,
        name: path.basename(filePath),
        content: content.substring(0, 100000) // Limit to 100KB
      };
    } catch {
      return null;
    }
  });

  // Integration Config
  ipcMain.handle("chat:getIntegrations", () => {
    const manager = getIntegrationManager("./config");
    return manager.getConfig();
  });

  ipcMain.handle("chat:getIntegrationStatus", () => {
    const manager = getIntegrationManager("./config");
    return manager.getStatus();
  });

  ipcMain.handle("chat:updateIntegration", (_event, data: { integration: string; config: Record<string, unknown> }) => {
    const manager = getIntegrationManager("./config");
    
    // Update specific integration
    const updates: Record<string, unknown> = {};
    updates[data.integration] = data.config;
    
    manager.updateConfig(updates as Parameters<typeof manager.updateConfig>[0]);
    log.info("integrations.update", `Updated integration: ${data.integration}`);
    
    return { success: true };
  });

  ipcMain.handle("chat:testIntegration", async (_event, integrationId: string) => {
    const manager = getIntegrationManager("./config");
    
    try {
      switch (integrationId) {
        case "github": {
          const token = manager.getGitHubToken();
          if (!token) return { success: false, error: "No token configured" };
          
          const res = await fetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.ok) {
            const user = await res.json() as { login: string };
            return { success: true, message: `Connected as ${user.login}` };
          }
          return { success: false, error: `GitHub API error: ${res.status}` };
        }
        
        case "notion": {
          const key = manager.getNotionApiKey();
          if (!key) return { success: false, error: "No API key configured" };
          
          const res = await fetch("https://api.notion.com/v1/users/me", {
            headers: {
              Authorization: `Bearer ${key}`,
              "Notion-Version": "2022-06-28"
            }
          });
          
          if (res.ok) {
            const user = await res.json() as { name?: string };
            return { success: true, message: `Connected as ${user.name ?? "Notion user"}` };
          }
          return { success: false, error: `Notion API error: ${res.status}` };
        }
        
        case "huggingface": {
          const token = manager.getHuggingFaceToken();
          if (!token) return { success: false, error: "No token configured" };
          
          const res = await fetch("https://huggingface.co/api/whoami-v2", {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.ok) {
            const user = await res.json() as { name?: string };
            return { success: true, message: `Connected as ${user.name ?? "HF user"}` };
          }
          return { success: false, error: `HuggingFace API error: ${res.status}` };
        }
        
        case "brave-search": {
          const key = manager.getBraveApiKey();
          if (!key) return { success: false, error: "No API key configured" };
          
          const res = await fetch("https://api.search.brave.com/res/v1/web/search?q=test&count=1", {
            headers: { "X-Subscription-Token": key }
          });
          
          if (res.ok) {
            return { success: true, message: "Brave Search API working" };
          }
          return { success: false, error: `Brave API error: ${res.status}` };
        }
        
        default:
          return { success: false, error: "Test not implemented for this integration" };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return { success: false, error: msg };
    }
  });
}

// ========== APP LIFECYCLE ==========

app.whenReady().then(async () => {
  configStore = new ConfigStore("./config");
  log = new HyperLog("./logs", "chat.jsonl");
  
  ensureChatStorage();
  setupIpcHandlers();
  
  // Show splash and run startup checks
  createSplashWindow();
  
  log.info("app.startup", "Running startup checks...");
  
  const startupOk = await runStartupChecks();
  
  if (startupOk) {
    log.info("app.startup", "Startup checks passed", { checks: bootstrapResult?.checks.length });
    closeSplash();
    createWindow();
  } else {
    log.error("app.startup", "Startup checks failed", { errors: bootstrapResult?.errors });
    
    // Show main window anyway but with error state
    closeSplash();
    createWindow();
    
    // Notify window of startup failure
    mainWindow?.webContents.once("did-finish-load", () => {
      mainWindow?.webContents.send("chat:startupFailed", bootstrapResult);
    });
  }

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


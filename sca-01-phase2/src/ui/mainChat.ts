import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs";
import { ConfigStore } from "../config/configStore.js";
import { HyperLog } from "../logging/hyperlog.js";

// ============================================================================
// CHAT MAIN PROCESS
// Handles communication between Electron UI and SCA-01 agent
// ============================================================================

let mainWindow: BrowserWindow | null = null;
let configStore: ConfigStore;
let log: HyperLog;

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

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0d0d14",
    webPreferences: {
      preload: path.join(import.meta.dirname, "preloadChat.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
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
    throw new Error(`Ollama error: ${response.statusText}`);
  }
  
  const data = await response.json() as {
    message: {
      content?: string;
      tool_calls?: Array<{
        function: { name: string; arguments: Record<string, unknown> }
      }>;
    };
  };
  
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

  ipcMain.handle("chat:updateSettings", (_event, updates: Partial<ReturnType<typeof configStore.getSettings>>) => {
    configStore.updateSettings(updates);
    return true;
  });

  // Ollama
  ipcMain.handle("chat:checkOllama", async () => {
    return await checkOllama();
  });

  ipcMain.handle("chat:getModels", async () => {
    return await getOllamaModels();
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
}

// ========== APP LIFECYCLE ==========

app.whenReady().then(() => {
  configStore = new ConfigStore("./config");
  log = new HyperLog("./logs", "chat.jsonl");
  
  ensureChatStorage();
  setupIpcHandlers();
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


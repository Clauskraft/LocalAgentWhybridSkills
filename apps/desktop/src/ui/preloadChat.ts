import { contextBridge, ipcRenderer } from "electron";

// Chat API exposed to renderer
contextBridge.exposeInMainWorld("chat", {
  // Startup / Bootstrap
  getBootstrapResult: () => ipcRenderer.invoke("chat:getBootstrapResult"),
  rerunStartupChecks: () => ipcRenderer.invoke("chat:rerunStartupChecks"),
  startOllama: () => ipcRenderer.invoke("chat:startOllama"),
  isOllamaRunning: () => ipcRenderer.invoke("chat:isOllamaRunning"),
  onStartupFailed: (callback: (data: unknown) => void) => {
    ipcRenderer.on("chat:startupFailed", (_event, data) => callback(data));
  },
  
  // Config
  getConfig: () => ipcRenderer.invoke("chat:getConfig"),
  updateSettings: (settings: unknown) => ipcRenderer.invoke("chat:updateSettings", settings),
  
  // Ollama
  checkOllama: () => ipcRenderer.invoke("chat:checkOllama"),
  getModels: () => ipcRenderer.invoke("chat:getModels"),
  getAvailableModels: () => ipcRenderer.invoke("chat:getAvailableModels"),
  pullModel: (name: string) => ipcRenderer.invoke("chat:pullModel", name),
  pullModelStream: (name: string) => ipcRenderer.invoke("chat:pullModelStream", name),
  deleteModel: (name: string) => ipcRenderer.invoke("chat:deleteModel", name),
  onPullProgress: (callback: (data: unknown) => void) => {
    ipcRenderer.on("chat:pullProgress", (_event, data) => callback(data));
  },
  
  // Chat
  sendMessage: (data: unknown) => ipcRenderer.invoke("chat:sendMessage", data),
  getChatHistory: () => ipcRenderer.invoke("chat:getChatHistory"),
  loadChat: (chatId: string) => ipcRenderer.invoke("chat:loadChat", chatId),
  saveChat: (data: unknown) => ipcRenderer.invoke("chat:saveChat", data),
  deleteChat: (chatId: string) => ipcRenderer.invoke("chat:deleteChat", chatId),
  
  // MCP
  getMcpServers: () => ipcRenderer.invoke("chat:getMcpServers"),
  addMcpServer: (server: unknown) => ipcRenderer.invoke("chat:addMcpServer", server),
  removeMcpServer: (name: string) => ipcRenderer.invoke("chat:removeMcpServer", name),
  
  // Files
  attachFile: () => ipcRenderer.invoke("chat:attachFile"),
  
  // Events
  onToolCall: (callback: (data: unknown) => void) => {
    ipcRenderer.on("chat:toolCall", (_event, data) => callback(data));
  },
  onApprovalNeeded: (callback: (data: unknown) => void) => {
    ipcRenderer.on("chat:approvalNeeded", (_event, data) => callback(data));
  }
});


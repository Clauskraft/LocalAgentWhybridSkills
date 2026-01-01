import { contextBridge, ipcRenderer } from "electron";

// Chat API exposed to renderer
contextBridge.exposeInMainWorld("chat", {
  // Config
  getConfig: () => ipcRenderer.invoke("chat:getConfig"),
  updateSettings: (settings: unknown) => ipcRenderer.invoke("chat:updateSettings", settings),
  
  // Ollama
  checkOllama: () => ipcRenderer.invoke("chat:checkOllama"),
  getModels: () => ipcRenderer.invoke("chat:getModels"),
  
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


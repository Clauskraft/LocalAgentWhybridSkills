/**
 * Preload script for Chat UI
 * Must be CommonJS for Electron compatibility
 */
const { contextBridge, ipcRenderer } = require("electron");

// Chat API exposed to renderer
contextBridge.exposeInMainWorld("chat", {
  // Startup / Bootstrap
  getBootstrapResult: () => ipcRenderer.invoke("chat:getBootstrapResult"),
  rerunStartupChecks: () => ipcRenderer.invoke("chat:rerunStartupChecks"),
  startOllama: () => ipcRenderer.invoke("chat:startOllama"),
  isOllamaRunning: () => ipcRenderer.invoke("chat:isOllamaRunning"),
  onStartupFailed: (callback) => {
    ipcRenderer.on("chat:startupFailed", (_event, data) => callback(data));
  },

  // Config
  getConfig: () => ipcRenderer.invoke("chat:getConfig"),
  updateSettings: (settings) => ipcRenderer.invoke("chat:updateSettings", settings),

  // Ollama
  checkOllama: () => ipcRenderer.invoke("chat:checkOllama"),
  getModels: () => ipcRenderer.invoke("chat:getModels"),
  getAvailableModels: () => ipcRenderer.invoke("chat:getAvailableModels"),
  pullModel: (name) => ipcRenderer.invoke("chat:pullModel", name),
  pullModelStream: (name) => ipcRenderer.invoke("chat:pullModelStream", name),
  deleteModel: (name) => ipcRenderer.invoke("chat:deleteModel", name),
  onPullProgress: (callback) => {
    ipcRenderer.on("chat:pullProgress", (_event, data) => callback(data));
  },

  // Chat
  sendMessage: (data) => ipcRenderer.invoke("chat:sendMessage", data),
  getChatHistory: () => ipcRenderer.invoke("chat:getChatHistory"),
  loadChat: (chatId) => ipcRenderer.invoke("chat:loadChat", chatId),
  saveChat: (data) => ipcRenderer.invoke("chat:saveChat", data),
  deleteChat: (chatId) => ipcRenderer.invoke("chat:deleteChat", chatId),

  // MCP - Installed servers
  getMcpServers: () => ipcRenderer.invoke("chat:getMcpServers"),
  addMcpServer: (server) => ipcRenderer.invoke("chat:addMcpServer", server),
  removeMcpServer: (name) => ipcRenderer.invoke("chat:removeMcpServer", name),

  // MCP - Server Catalog (one-click install)
  getMcpCatalog: () => ipcRenderer.invoke("chat:getMcpCatalog"),
  getMcpCategories: () => ipcRenderer.invoke("chat:getMcpCategories"),
  getMcpByCategory: (category) => ipcRenderer.invoke("chat:getMcpByCategory", category),
  getPopularMcp: () => ipcRenderer.invoke("chat:getPopularMcp"),
  searchMcp: (query) => ipcRenderer.invoke("chat:searchMcp", query),
  installMcpFromCatalog: (serverId) => ipcRenderer.invoke("chat:installMcpFromCatalog", serverId),

  // Files
  attachFile: () => ipcRenderer.invoke("chat:attachFile"),

  // Integrations
  getIntegrations: () => ipcRenderer.invoke("chat:getIntegrations"),
  getIntegrationStatus: () => ipcRenderer.invoke("chat:getIntegrationStatus"),
  updateIntegration: (data) => ipcRenderer.invoke("chat:updateIntegration", data),
  testIntegration: (id) => ipcRenderer.invoke("chat:testIntegration", id),

  // Events
  onToolCall: (callback) => {
    ipcRenderer.on("chat:toolCall", (_event, data) => callback(data));
  },
  onApprovalNeeded: (callback) => {
    ipcRenderer.on("chat:approvalNeeded", (_event, data) => callback(data));
  }
});


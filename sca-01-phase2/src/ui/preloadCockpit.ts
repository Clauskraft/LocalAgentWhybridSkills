import { contextBridge, ipcRenderer } from "electron";

// Cockpit API exposed to renderer
contextBridge.exposeInMainWorld("cockpit", {
  // Config
  getConfig: () => ipcRenderer.invoke("cockpit:getConfig"),
  
  // Path rules
  addSafePath: (path: string) => ipcRenderer.invoke("cockpit:addSafePath", path),
  removeSafePath: (path: string) => ipcRenderer.invoke("cockpit:removeSafePath", path),
  addBlockedPath: (path: string) => ipcRenderer.invoke("cockpit:addBlockedPath", path),
  removeBlockedPath: (path: string) => ipcRenderer.invoke("cockpit:removeBlockedPath", path),
  addPathRule: (rule: unknown) => ipcRenderer.invoke("cockpit:addPathRule", rule),
  removePathRule: (id: string) => ipcRenderer.invoke("cockpit:removePathRule", id),
  
  // Repos
  addRepo: (repo: unknown) => ipcRenderer.invoke("cockpit:addRepo", repo),
  updateRepo: (id: string, updates: unknown) => ipcRenderer.invoke("cockpit:updateRepo", id, updates),
  removeRepo: (id: string) => ipcRenderer.invoke("cockpit:removeRepo", id),
  
  // Credentials
  addCredential: (cred: unknown) => ipcRenderer.invoke("cockpit:addCredential", cred),
  updateCredential: (id: string, updates: unknown) => ipcRenderer.invoke("cockpit:updateCredential", id, updates),
  removeCredential: (id: string) => ipcRenderer.invoke("cockpit:removeCredential", id),
  
  // Services
  addService: (svc: unknown) => ipcRenderer.invoke("cockpit:addService", svc),
  updateService: (id: string, updates: unknown) => ipcRenderer.invoke("cockpit:updateService", id, updates),
  removeService: (id: string) => ipcRenderer.invoke("cockpit:removeService", id),
  checkService: (id: string) => ipcRenderer.invoke("cockpit:checkService", id),
  
  // Settings
  updateSettings: (settings: unknown) => ipcRenderer.invoke("cockpit:updateSettings", settings)
});


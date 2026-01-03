import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { ConfigStore } from "../config/configStore.js";

let mainWindow: BrowserWindow | null = null;
let configStore: ConfigStore;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: "#0a0a12",
    webPreferences: {
      // Preload bundle is written to build/ui by build-preload.js
      preload: path.join(import.meta.dirname, "preloadCockpit.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    titleBarStyle: "hiddenInset",
    title: "SCA-01 Configuration Cockpit"
  });

  // HTML files are in src/ui, not build/ui
  const htmlPath = path.join(import.meta.dirname, "..", "..", "src", "ui", "cockpit.html");
  mainWindow.loadFile(htmlPath);
  
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function checkServiceHealth(endpoint: string): Promise<{ connected: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(endpoint.replace(/\/$/, "") + "/api/version", {
      method: "GET",
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    return { connected: response.ok };
  } catch (e) {
    return { connected: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

function setupIpcHandlers(): void {
  // Config
  ipcMain.handle("cockpit:getConfig", () => {
    return configStore.getFullConfig();
  });

  // Path rules
  ipcMain.handle("cockpit:addSafePath", (_event, path: string) => {
    configStore.addSafePath(path);
    return true;
  });

  ipcMain.handle("cockpit:removeSafePath", (_event, path: string) => {
    return configStore.removeSafePath(path);
  });

  ipcMain.handle("cockpit:addBlockedPath", (_event, path: string) => {
    configStore.addBlockedPath(path);
    return true;
  });

  ipcMain.handle("cockpit:removeBlockedPath", (_event, path: string) => {
    return configStore.removeBlockedPath(path);
  });

  ipcMain.handle("cockpit:addPathRule", (_event, rule: Parameters<typeof configStore.addPathRule>[0]) => {
    return configStore.addPathRule(rule);
  });

  ipcMain.handle("cockpit:removePathRule", (_event, id: string) => {
    return configStore.removePathRule(id);
  });

  // Repos
  ipcMain.handle("cockpit:addRepo", (_event, repo: Parameters<typeof configStore.addRepo>[0]) => {
    return configStore.addRepo(repo);
  });

  ipcMain.handle("cockpit:updateRepo", (_event, id: string, updates: Parameters<typeof configStore.updateRepo>[1]) => {
    return configStore.updateRepo(id, updates);
  });

  ipcMain.handle("cockpit:removeRepo", (_event, id: string) => {
    return configStore.removeRepo(id);
  });

  // Credentials
  ipcMain.handle("cockpit:addCredential", (_event, cred: Parameters<typeof configStore.addToolCredential>[0]) => {
    return configStore.addToolCredential(cred);
  });

  ipcMain.handle("cockpit:updateCredential", (_event, id: string, updates: Parameters<typeof configStore.updateToolCredential>[1]) => {
    return configStore.updateToolCredential(id, updates);
  });

  ipcMain.handle("cockpit:removeCredential", (_event, id: string) => {
    return configStore.removeToolCredential(id);
  });

  // Services
  ipcMain.handle("cockpit:addService", (_event, svc: Parameters<typeof configStore.addService>[0]) => {
    return configStore.addService(svc);
  });

  ipcMain.handle("cockpit:updateService", (_event, id: string, updates: Parameters<typeof configStore.updateService>[1]) => {
    return configStore.updateService(id, updates);
  });

  ipcMain.handle("cockpit:removeService", (_event, id: string) => {
    return configStore.removeService(id);
  });

  ipcMain.handle("cockpit:checkService", async (_event, id: string) => {
    const services = configStore.getServices();
    const service = services.find(s => s.id === id);
    
    if (!service) return { connected: false, error: "Service not found" };
    
    const result = await checkServiceHealth(service.endpoint);
    
    configStore.updateService(id, {
      status: result.connected ? "connected" : "disconnected",
      lastChecked: new Date().toISOString()
    });
    
    return result;
  });

  // Settings
  ipcMain.handle("cockpit:updateSettings", (_event, settings: Parameters<typeof configStore.updateSettings>[0]) => {
    configStore.updateSettings(settings);
    return true;
  });
}

app.whenReady().then(() => {
  configStore = new ConfigStore("./config");
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


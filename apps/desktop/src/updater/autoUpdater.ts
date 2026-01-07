/**
 * SCA-01 Auto-Updater
 * Handles automatic updates via GitHub Releases or custom server
 *
 * Uses dynamic import for electron-updater to handle ESM/CJS compatibility
 */

import { app, dialog, BrowserWindow, ipcMain } from "electron";
import { HyperLog } from "../logging/hyperlog.js";

// Dynamic import types for electron-updater (CJS module)
type ElectronUpdaterModule = typeof import("electron-updater");
type AutoUpdaterType = ElectronUpdaterModule["autoUpdater"];
type UpdateInfoType = import("electron-updater").UpdateInfo;
type ProgressInfoType = import("electron-updater").ProgressInfo;

// Module-level reference for the dynamically imported autoUpdater
let autoUpdater: AutoUpdaterType | null = null;

/**
 * Lazily load electron-updater (CJS module in ESM context)
 */
async function getAutoUpdater(): Promise<AutoUpdaterType> {
  if (autoUpdater) return autoUpdater;

  try {
    // Dynamic import for CJS compatibility
    const electronUpdater = await import("electron-updater");
    autoUpdater = electronUpdater.autoUpdater;
    return autoUpdater;
  } catch (error) {
    console.error("Failed to load electron-updater:", error);
    throw error;
  }
}

export interface UpdaterConfig {
  /** Check for updates on startup */
  checkOnStartup: boolean;
  /** Auto-download updates */
  autoDownload: boolean;
  /** Auto-install on quit */
  autoInstallOnQuit: boolean;
  /** Update server URL (optional, defaults to GitHub) */
  updateServerUrl?: string;
  /** Check interval in milliseconds (default: 1 hour) */
  checkInterval: number;
}

const DEFAULT_CONFIG: UpdaterConfig = {
  checkOnStartup: true,
  autoDownload: true,
  autoInstallOnQuit: true,
  checkInterval: 60 * 60 * 1000, // 1 hour
};

export class SCA01Updater {
  private config: UpdaterConfig;
  private log: HyperLog;
  private mainWindow: BrowserWindow | null = null;
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  constructor(config: Partial<UpdaterConfig> = {}, logDir = "./logs") {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.log = new HyperLog(logDir, "updater.hyperlog.jsonl");
    this.setupIpcHandlers();
  }

  /**
   * Initialize the updater (must be called before use)
   * This handles the async loading of electron-updater
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const updater = await getAutoUpdater();

      // Configure autoUpdater
      updater.autoDownload = this.config.autoDownload;
      updater.autoInstallOnAppQuit = this.config.autoInstallOnQuit;

      // Use custom update server if provided
      if (this.config.updateServerUrl) {
        updater.setFeedURL({
          provider: "generic",
          url: this.config.updateServerUrl,
        });
      }

      this.setupEventHandlers(updater);
      this.initialized = true;
      this.log.info("updater", "Auto-updater initialized successfully");
    } catch (error) {
      this.log.error("updater", `Failed to initialize auto-updater: ${(error as Error).message}`);
      throw error;
    }
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  private setupEventHandlers(updater: AutoUpdaterType): void {
    updater.on("checking-for-update", () => {
      this.log.info("updater", "Checking for updates...");
      this.sendToRenderer("update-status", { status: "checking" });
    });

    updater.on("update-available", (info: UpdateInfoType) => {
      this.log.info("updater", `Update available: ${info.version}`, {
        version: info.version,
        releaseDate: info.releaseDate,
      });
      this.sendToRenderer("update-status", {
        status: "available",
        version: info.version,
        releaseNotes: info.releaseNotes,
      });

      // Show notification if not auto-downloading
      if (!this.config.autoDownload) {
        this.showUpdateDialog(info);
      }
    });

    updater.on("update-not-available", (info: UpdateInfoType) => {
      this.log.info("updater", "No updates available", { version: info.version });
      this.sendToRenderer("update-status", {
        status: "up-to-date",
        version: info.version,
      });
    });

    updater.on("download-progress", (progress: ProgressInfoType) => {
      this.log.info("updater", `Download progress: ${progress.percent.toFixed(1)}%`);
      this.sendToRenderer("update-status", {
        status: "downloading",
        progress: {
          percent: progress.percent,
          bytesPerSecond: progress.bytesPerSecond,
          transferred: progress.transferred,
          total: progress.total,
        },
      });
    });

    updater.on("update-downloaded", (info: UpdateInfoType) => {
      this.log.info("updater", `Update downloaded: ${info.version}`);
      this.sendToRenderer("update-status", {
        status: "downloaded",
        version: info.version,
      });

      // Show restart dialog
      this.showRestartDialog(info);
    });

    updater.on("error", (error: Error) => {
      this.log.error("updater", `Update error: ${error.message}`, {
        stack: error.stack,
      });
      this.sendToRenderer("update-status", {
        status: "error",
        error: error.message,
      });
    });
  }

  private setupIpcHandlers(): void {
    // Manual check for updates
    ipcMain.handle("updater:check", async () => {
      return await this.checkForUpdates();
    });

    // Download update
    ipcMain.handle("updater:download", async () => {
      const updater = await getAutoUpdater();
      return await updater.downloadUpdate();
    });

    // Install update (restart)
    ipcMain.handle("updater:install", async () => {
      const updater = await getAutoUpdater();
      updater.quitAndInstall(false, true);
    });

    // Get current version
    ipcMain.handle("updater:version", () => {
      return app.getVersion();
    });

    // Get update config
    ipcMain.handle("updater:config", () => {
      return this.config;
    });

    // Update config
    ipcMain.handle("updater:setConfig", async (_event, newConfig: Partial<UpdaterConfig>) => {
      this.config = { ...this.config, ...newConfig };
      const updater = await getAutoUpdater();
      updater.autoDownload = this.config.autoDownload;
      updater.autoInstallOnAppQuit = this.config.autoInstallOnQuit;
      return this.config;
    });
  }

  async checkForUpdates(): Promise<{ available: boolean; version?: string }> {
    try {
      const updater = await getAutoUpdater();
      const result = await updater.checkForUpdates();
      if (result?.updateInfo) {
        return {
          available: result.updateInfo.version !== app.getVersion(),
          version: result.updateInfo.version,
        };
      }
      return { available: false };
    } catch (error) {
      this.log.error("updater", `Check failed: ${(error as Error).message}`);
      return { available: false };
    }
  }

  startPeriodicChecks(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }

    // Initial check
    if (this.config.checkOnStartup) {
      setTimeout(() => this.checkForUpdates(), 5000); // Wait 5s after startup
    }

    // Periodic checks
    this.checkIntervalId = setInterval(() => {
      this.checkForUpdates();
    }, this.config.checkInterval);
  }

  stopPeriodicChecks(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  private async showUpdateDialog(info: UpdateInfoType): Promise<void> {
    const result = await dialog.showMessageBox({
      type: "info",
      title: "Opdatering tilgængelig",
      message: `En ny version (${info.version}) er tilgængelig.`,
      detail: "Vil du downloade og installere opdateringen nu?",
      buttons: ["Download", "Senere"],
      defaultId: 0,
    });

    if (result.response === 0) {
      const updater = await getAutoUpdater();
      updater.downloadUpdate();
    }
  }

  private async showRestartDialog(info: UpdateInfoType): Promise<void> {
    const result = await dialog.showMessageBox({
      type: "info",
      title: "Opdatering klar",
      message: `Version ${info.version} er downloadet.`,
      detail: "Genstart applikationen for at installere opdateringen.",
      buttons: ["Genstart nu", "Senere"],
      defaultId: 0,
    });

    if (result.response === 0) {
      const updater = await getAutoUpdater();
      updater.quitAndInstall(false, true);
    }
  }
}

// Singleton instance
let updaterInstance: SCA01Updater | null = null;

/**
 * Initialize the updater singleton
 * This handles the async loading of electron-updater for ESM/CJS compatibility
 */
export async function initUpdater(config?: Partial<UpdaterConfig>, logDir?: string): Promise<SCA01Updater> {
  if (!updaterInstance) {
    updaterInstance = new SCA01Updater(config, logDir);
    await updaterInstance.init();
  }
  return updaterInstance;
}

/**
 * Get the updater instance (may be null if not initialized)
 */
export function getUpdater(): SCA01Updater | null {
  return updaterInstance;
}


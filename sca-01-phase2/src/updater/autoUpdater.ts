/**
 * SCA-01 Auto-Updater
 * Handles automatic updates via GitHub Releases or custom server
 */

import { app, dialog, BrowserWindow, ipcMain } from "electron";
import { autoUpdater, UpdateInfo, ProgressInfo } from "electron-updater";
import { HyperLog } from "../logging/hyperlog.js";

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

  constructor(config: Partial<UpdaterConfig> = {}, logDir = "./logs") {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.log = new HyperLog(logDir, "updater.hyperlog.jsonl");

    // Configure autoUpdater
    autoUpdater.autoDownload = this.config.autoDownload;
    autoUpdater.autoInstallOnAppQuit = this.config.autoInstallOnQuit;

    // Use custom update server if provided
    if (this.config.updateServerUrl) {
      autoUpdater.setFeedURL({
        provider: "generic",
        url: this.config.updateServerUrl,
      });
    }

    this.setupEventHandlers();
    this.setupIpcHandlers();
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  private setupEventHandlers(): void {
    autoUpdater.on("checking-for-update", () => {
      this.log.info("updater", "Checking for updates...");
      this.sendToRenderer("update-status", { status: "checking" });
    });

    autoUpdater.on("update-available", (info: UpdateInfo) => {
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

    autoUpdater.on("update-not-available", (info: UpdateInfo) => {
      this.log.info("updater", "No updates available", { version: info.version });
      this.sendToRenderer("update-status", {
        status: "up-to-date",
        version: info.version,
      });
    });

    autoUpdater.on("download-progress", (progress: ProgressInfo) => {
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

    autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
      this.log.info("updater", `Update downloaded: ${info.version}`);
      this.sendToRenderer("update-status", {
        status: "downloaded",
        version: info.version,
      });

      // Show restart dialog
      this.showRestartDialog(info);
    });

    autoUpdater.on("error", (error: Error) => {
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
      return await autoUpdater.downloadUpdate();
    });

    // Install update (restart)
    ipcMain.handle("updater:install", () => {
      autoUpdater.quitAndInstall(false, true);
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
    ipcMain.handle("updater:setConfig", (_event, newConfig: Partial<UpdaterConfig>) => {
      this.config = { ...this.config, ...newConfig };
      autoUpdater.autoDownload = this.config.autoDownload;
      autoUpdater.autoInstallOnAppQuit = this.config.autoInstallOnQuit;
      return this.config;
    });
  }

  async checkForUpdates(): Promise<{ available: boolean; version?: string }> {
    try {
      const result = await autoUpdater.checkForUpdates();
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

  private async showUpdateDialog(info: UpdateInfo): Promise<void> {
    const result = await dialog.showMessageBox({
      type: "info",
      title: "Opdatering tilgængelig",
      message: `En ny version (${info.version}) er tilgængelig.`,
      detail: "Vil du downloade og installere opdateringen nu?",
      buttons: ["Download", "Senere"],
      defaultId: 0,
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  }

  private async showRestartDialog(info: UpdateInfo): Promise<void> {
    const result = await dialog.showMessageBox({
      type: "info",
      title: "Opdatering klar",
      message: `Version ${info.version} er downloadet.`,
      detail: "Genstart applikationen for at installere opdateringen.",
      buttons: ["Genstart nu", "Senere"],
      defaultId: 0,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  }
}

// Singleton instance
let updaterInstance: SCA01Updater | null = null;

export function initUpdater(config?: Partial<UpdaterConfig>, logDir?: string): SCA01Updater {
  if (!updaterInstance) {
    updaterInstance = new SCA01Updater(config, logDir);
  }
  return updaterInstance;
}

export function getUpdater(): SCA01Updater | null {
  return updaterInstance;
}


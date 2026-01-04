/**
 * Cloud Sync Service
 * Synkroniserer Desktop sessions til Railway cloud
 */
import Store from "electron-store";

function resolveCloudBaseUrl(): string {
  const raw = (process.env["SCA_BACKEND_URL"] ?? "").trim();
  if (raw) return raw.replace(/\/+$/, "");
  return "https://backend-production-d3da.up.railway.app";
}

const API_BASE_URL = resolveCloudBaseUrl();

interface CloudAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface SyncConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // minutes
  lastSync: string | null;
}

interface LocalSession {
  id: string;
  title: string;
  model: string;
  systemPrompt?: string;
  messages: LocalMessage[];
  createdAt: string;
  updatedAt: string;
  cloudId?: string; // Cloud session ID if synced
  notionPageId?: string;
}

interface LocalMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  synced: boolean;
}

interface SyncResult {
  success: boolean;
  syncedSessions: number;
  syncedMessages: number;
  errors: string[];
}

type AnyStore = Store<any>;

class CloudSyncService {
  private store: AnyStore;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.store = new Store({
      name: "cloud-sync",
      defaults: {
        cloudAuth: null,
        syncConfig: {
          enabled: false,
          autoSync: true,
          syncInterval: 5,
          lastSync: null,
        },
        sessions: [],
      },
    });
  }

  private getCloudAuth(): CloudAuthTokens | null {
    return this.store.get("cloudAuth") as CloudAuthTokens | null;
  }

  private setCloudAuth(auth: CloudAuthTokens | null): void {
    this.store.set("cloudAuth", auth);
  }

  // ========== Auth ==========

  isAuthenticated(): boolean {
    const auth = this.getCloudAuth();
    return auth !== null && auth.expiresAt > Date.now();
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.message || "Login failed" };
      }

      const data = await res.json();
      this.setCloudAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn || 900) * 1000,
      });

      // Enable sync
      this.store.set("syncConfig.enabled", true);
      this.startAutoSync();

      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      return { success: false, error: msg };
    }
  }

  async logout(): Promise<void> {
    this.setCloudAuth(null);
    this.store.set("syncConfig.enabled", false);
    this.stopAutoSync();
  }

  private async refreshToken(): Promise<boolean> {
    const auth = this.getCloudAuth();
    if (!auth?.refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: auth.refreshToken }),
      });

      if (!res.ok) {
        this.setCloudAuth(null);
        return false;
      }

      const data = await res.json();
      this.setCloudAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn || 900) * 1000,
      });

      return true;
    } catch {
      return false;
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string> | null> {
    let auth = this.getCloudAuth();
    if (!auth) return null;

    // Refresh if expires within 1 minute
    if (auth.expiresAt < Date.now() + 60000) {
      const refreshed = await this.refreshToken();
      if (!refreshed) return null;
      auth = this.getCloudAuth();
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth?.accessToken}`,
    };
  }

  // ========== Sessions ==========

  getSessions(): LocalSession[] {
    return (this.store.get("sessions") as LocalSession[]) || [];
  }

  getSession(id: string): LocalSession | undefined {
    return this.getSessions().find((s) => s.id === id);
  }

  createSession(title: string, model: string, systemPrompt?: string): LocalSession {
    const session: LocalSession = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      model,
      systemPrompt,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sessions = this.getSessions();
    sessions.unshift(session);
    this.store.set("sessions", sessions);

    return session;
  }

  addMessage(sessionId: string, role: "user" | "assistant" | "system", content: string): LocalMessage | null {
    const sessions = this.getSessions();
    const sessionIndex = sessions.findIndex((s) => s.id === sessionId);

    if (sessionIndex === -1) return null;

    const message: LocalMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role,
      content,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    const sessionToUpdate = sessions[sessionIndex];
    if (sessionToUpdate) {
      sessionToUpdate.messages.push(message);
      sessionToUpdate.updatedAt = new Date().toISOString();
      this.store.set("sessions", sessions);
    }

    return message;
  }

  deleteSession(id: string): boolean {
    const sessions = this.getSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    if (filtered.length === sessions.length) return false;
    this.store.set("sessions", filtered);
    return true;
  }

  // ========== Sync ==========

  getSyncConfig(): SyncConfig {
    return this.store.get("syncConfig") as SyncConfig;
  }

  setSyncConfig(config: Partial<SyncConfig>): void {
    const current = this.getSyncConfig();
    this.store.set("syncConfig", { ...current, ...config });

    if (config.enabled !== undefined) {
      if (config.enabled) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    }
  }

  startAutoSync(): void {
    this.stopAutoSync();

    const config = this.getSyncConfig();
    if (!config.enabled || !config.autoSync) return;

    const intervalMs = config.syncInterval * 60 * 1000;
    this.syncTimer = setInterval(() => {
      this.syncAll().catch(console.error);
    }, intervalMs);

    // Initial sync
    this.syncAll().catch(console.error);
  }

  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer as unknown as number);
      this.syncTimer = null;
    }
  }

  async syncAll(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedSessions: 0,
      syncedMessages: 0,
      errors: [],
    };

    if (!this.isAuthenticated()) {
      result.success = false;
      result.errors.push("Not authenticated");
      return result;
    }

    const headers = await this.getAuthHeaders();
    if (!headers) {
      result.success = false;
      result.errors.push("Failed to get auth headers");
      return result;
    }

    const sessions = this.getSessions();

    for (const session of sessions) {
      try {
        // Sync session if not synced yet
        if (!session.cloudId) {
          const syncResult = await this.syncSession(session, headers);
          if (syncResult.cloudId) {
            session.cloudId = syncResult.cloudId;
            result.syncedSessions++;
          }
        }

        // Sync unsynced messages
        if (session.cloudId) {
          for (const message of session.messages) {
            if (!message.synced) {
              const synced = await this.syncMessage(session.cloudId, message, headers);
              if (synced) {
                message.synced = true;
                result.syncedMessages++;
              }
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Sync error";
        result.errors.push(`Session ${session.title}: ${msg}`);
      }
    }

    // Update store with synced state
    this.store.set("sessions", sessions);
    this.store.set("syncConfig.lastSync", new Date().toISOString());

    return result;
  }

  private async syncSession(
    session: LocalSession,
    headers: Record<string, string>
  ): Promise<{ cloudId?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: session.title,
        model: session.model,
        systemPrompt: session.systemPrompt,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to sync session: ${res.status}`);
    }

    const data = await res.json();
    return { cloudId: data.id };
  }

  private async syncMessage(
    cloudSessionId: string,
    message: LocalMessage,
    headers: Record<string, string>
  ): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/sessions/${cloudSessionId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        role: message.role,
        content: message.content,
      }),
    });

    return res.ok;
  }

  // ========== Notion Sync ==========

  async syncToNotion(sessionId: string): Promise<{ success: boolean; notionPageId?: string; error?: string }> {
    const session = this.getSession(sessionId);
    if (!session) {
      return { success: false, error: "Session not found" };
    }

    const headers = await this.getAuthHeaders();
    if (!headers) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/notion/sync/session`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId: session.cloudId || session.id,
          title: session.title,
          model: session.model,
          createdAt: session.createdAt,
          messageCount: session.messages.length,
          notionPageId: session.notionPageId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.error || "Notion sync failed" };
      }

      const data = await res.json();

      // Update local session with Notion page ID
      const sessions = this.getSessions();
      const idx = sessions.findIndex((s) => s.id === sessionId);
      if (idx !== -1) {
        const sessionToUpdate = sessions[idx];
        if (sessionToUpdate) {
          sessionToUpdate.notionPageId = data.notionPageId;
          this.store.set("sessions", sessions);
        }
      }

      return { success: true, notionPageId: data.notionPageId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      return { success: false, error: msg };
    }
  }
}

export const cloudSync = new CloudSyncService();
export type { LocalSession, LocalMessage, SyncConfig, SyncResult };


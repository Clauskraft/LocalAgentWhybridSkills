/**
 * SCA-01 Cloud API Client
 * Kommunikerer med Railway-hosted backend
 */
const API_BASE_URL = "https://sca-01-phase3-production.up.railway.app";

export type ApiLogEntry = {
  ts: string;
  method: string;
  path: string;
  status?: number;
  ok: boolean;
  durationMs: number;
  error?: string;
};

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface Session {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type TokenStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
};

const memoryStore: Record<string, string> = {};
let resolvedStore: TokenStore | null = null;

async function getTokenStore(): Promise<TokenStore> {
  if (resolvedStore) return resolvedStore;
  try {
    const SecureStore = await import("expo-secure-store");
    resolvedStore = {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      deleteItem: (key) => SecureStore.deleteItemAsync(key),
    };
    return resolvedStore;
  } catch {
    // Node/test fallback (no Expo runtime)
    resolvedStore = {
      getItem: async (key) => (key in memoryStore ? memoryStore[key]! : null),
      setItem: async (key, value) => {
        memoryStore[key] = value;
      },
      deleteItem: async (key) => {
        delete memoryStore[key];
      },
    };
    return resolvedStore;
  }
}

class ApiClient {
  private tokens: AuthTokens | null = null;
  private logs: ApiLogEntry[] = [];
  private maxLogs = 50;

  private pushLog(entry: ApiLogEntry): void {
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) this.logs.length = this.maxLogs;
  }

  getRecentLogs(): ApiLogEntry[] {
    return [...this.logs];
  }

  async initialize(): Promise<boolean> {
    try {
      const store = await getTokenStore();
      const stored = await store.getItem("auth_tokens");
      if (stored) {
        this.tokens = JSON.parse(stored);
        // Check if token is expired
        if (this.tokens && this.tokens.expiresAt < Date.now()) {
          await this.refreshToken();
        }
        return true;
      }
    } catch (e) {
      console.error("Failed to initialize auth:", e);
    }
    return false;
  }

  isAuthenticated(): boolean {
    return this.tokens !== null && this.tokens.expiresAt > Date.now();
  }

  async login(email: string, password: string): Promise<ApiResponse<{ userId: string }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Login failed" }));
        return { success: false, error: err.message || "Login failed" };
      }

      const data = await res.json();
      this.tokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn || 900) * 1000,
      };
      const store = await getTokenStore();
      await store.setItem("auth_tokens", JSON.stringify(this.tokens));

      return { success: true, data: { userId: data.userId } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      return { success: false, error: msg };
    }
  }

  async register(email: string, password: string): Promise<ApiResponse<{ userId: string }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Registration failed" }));
        return { success: false, error: err.message || "Registration failed" };
      }

      const data = await res.json();
      return { success: true, data: { userId: data.userId } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      return { success: false, error: msg };
    }
  }

  async logout(): Promise<void> {
    this.tokens = null;
    const store = await getTokenStore();
    await store.deleteItem("auth_tokens");
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.tokens?.refreshToken) return false;

    try {
      const start = Date.now();
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
      });

      if (!res.ok) {
        this.pushLog({
          ts: new Date().toISOString(),
          method: "POST",
          path: "/auth/refresh",
          status: res.status,
          ok: false,
          durationMs: Date.now() - start,
          error: "refresh_failed",
        });
        await this.logout();
        return false;
      }

      const data = await res.json();
      this.tokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn || 900) * 1000,
      };
      const store = await getTokenStore();
      await store.setItem("auth_tokens", JSON.stringify(this.tokens));
      this.pushLog({
        ts: new Date().toISOString(),
        method: "POST",
        path: "/auth/refresh",
        status: res.status,
        ok: true,
        durationMs: Date.now() - start,
      });
      return true;
    } catch {
      this.pushLog({
        ts: new Date().toISOString(),
        method: "POST",
        path: "/auth/refresh",
        ok: false,
        durationMs: 0,
        error: "network_error",
      });
      await this.logout();
      return false;
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    if (!this.tokens) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if token needs refresh
    if (this.tokens.expiresAt < Date.now() + 60000) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        return { success: false, error: "Session expired" };
      }
    }

    try {
      const start = Date.now();
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.tokens.accessToken}`,
          ...options.headers,
        },
      });

      if (res.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.request(path, options);
        }
        this.pushLog({
          ts: new Date().toISOString(),
          method: String(options.method ?? "GET"),
          path,
          status: 401,
          ok: false,
          durationMs: Date.now() - start,
          error: "unauthorized",
        });
        return { success: false, error: "Session expired" };
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" }));
        this.pushLog({
          ts: new Date().toISOString(),
          method: String(options.method ?? "GET"),
          path,
          status: res.status,
          ok: false,
          durationMs: Date.now() - start,
          error: err.message || `Error ${res.status}`,
        });
        return { success: false, error: err.message || `Error ${res.status}` };
      }

      const data = await res.json();
      this.pushLog({
        ts: new Date().toISOString(),
        method: String(options.method ?? "GET"),
        path,
        status: res.status,
        ok: true,
        durationMs: Date.now() - start,
      });
      return { success: true, data };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      this.pushLog({
        ts: new Date().toISOString(),
        method: String(options.method ?? "GET"),
        path,
        ok: false,
        durationMs: 0,
        error: msg,
      });
      return { success: false, error: msg };
    }
  }

  // ========== Sessions ==========

  async getSessions(): Promise<ApiResponse<{ sessions: Session[] }>> {
    return this.request("/api/sessions");
  }

  async createSession(title: string, model: string): Promise<ApiResponse<Session>> {
    return this.request("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ title, model }),
    });
  }

  async getSession(sessionId: string): Promise<ApiResponse<Session>> {
    return this.request(`/api/sessions/${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request(`/api/sessions/${sessionId}`, { method: "DELETE" });
  }

  // ========== Messages ==========

  async getMessages(sessionId: string): Promise<ApiResponse<{ messages: Message[] }>> {
    return this.request(`/api/sessions/${sessionId}/messages`);
  }

  async sendMessage(sessionId: string, content: string): Promise<ApiResponse<Message>> {
    return this.request(`/api/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ role: "user", content }),
    });
  }

  // ========== Health ==========

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const api = new ApiClient();
export type { Session, Message, ApiResponse };


import { API_BASE_URL } from "./config";
import type { Message, Session, TokenResponse } from "./types";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type ApiTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt = 0;

  constructor(tokens?: ApiTokens | null) {
    if (tokens) this.setTokens(tokens);
  }

  setTokens(tokens: ApiTokens | null): void {
    this.accessToken = tokens?.accessToken ?? null;
    this.refreshToken = tokens?.refreshToken ?? null;
    this.expiresAt = tokens?.expiresAt ?? 0;
  }

  getTokens(): ApiTokens | null {
    if (!this.accessToken || !this.refreshToken) return null;
    return { accessToken: this.accessToken, refreshToken: this.refreshToken, expiresAt: this.expiresAt };
  }

  private async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const url = `${API_BASE_URL}${path}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text().catch(() => "");
    const json = text ? (JSON.parse(text) as unknown) : null;

    if (!res.ok) {
      const err = (json && typeof json === "object" ? (json as Record<string, unknown>).error : null) ?? res.statusText;
      const e = new Error(String(err));
      (e as Error & { status?: number }).status = res.status;
      throw e;
    }

    return json as T;
  }

  private isTokenFresh(): boolean {
    return !!this.accessToken && Date.now() < this.expiresAt;
  }

  async ensureAuth(): Promise<void> {
    if (this.isTokenFresh()) return;
    if (!this.refreshToken) return;
    await this.refresh();
  }

  async login(email: string, password: string): Promise<TokenResponse> {
    const out = await this.request<TokenResponse>("POST", "/auth/login", { email, password });
    this.setTokens({
      accessToken: out.access_token,
      refreshToken: out.refresh_token,
      expiresAt: Date.now() + out.expires_in * 1000 - 60_000,
    });
    return out;
  }

  async register(email: string, password: string, displayName?: string): Promise<TokenResponse> {
    const out = await this.request<TokenResponse>("POST", "/auth/register", { email, password, displayName });
    this.setTokens({
      accessToken: out.access_token,
      refreshToken: out.refresh_token,
      expiresAt: Date.now() + out.expires_in * 1000 - 60_000,
    });
    return out;
  }

  async refresh(): Promise<void> {
    if (!this.refreshToken) throw new Error("missing_refresh_token");
    const out = await this.request<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }>(
      "POST",
      "/auth/refresh",
      { refresh_token: this.refreshToken }
    );
    this.setTokens({
      accessToken: out.access_token,
      refreshToken: out.refresh_token,
      expiresAt: Date.now() + out.expires_in * 1000 - 60_000,
    });
  }

  async me(): Promise<{ id: string; email: string }> {
    await this.ensureAuth();
    return this.request("GET", "/auth/me");
  }

  async listSessions(includeArchived = false): Promise<Session[]> {
    await this.ensureAuth();
    const q = includeArchived ? "?archived=true" : "";
    const out = await this.request<{ sessions: Session[] }>("GET", `/api/sessions${q}`);
    return out.sessions;
  }

  async createSession(input: { title?: string; model?: string; systemPrompt?: string }): Promise<Session> {
    await this.ensureAuth();
    const out = await this.request<{ session: Session }>("POST", "/api/sessions", input);
    return out.session;
  }

  async listMessages(sessionId: string): Promise<Message[]> {
    await this.ensureAuth();
    const out = await this.request<{ messages: Message[] }>("GET", `/api/sessions/${encodeURIComponent(sessionId)}/messages`);
    return out.messages;
  }

  async addMessage(sessionId: string, input: { role: Message["role"]; content: string | null }): Promise<Message> {
    await this.ensureAuth();
    const out = await this.request<{ message: Message }>("POST", `/api/sessions/${encodeURIComponent(sessionId)}/messages`, input);
    return out.message;
  }

  async models(): Promise<Array<{ name: string; size?: string }>> {
    const out = await this.request<{ models: Array<{ name: string; size?: string }> }>("GET", "/api/models");
    return out.models ?? [];
  }

  async chat(input: { model: string; messages: Array<{ role: string; content: string }>; stream?: boolean }): Promise<{ content: string }> {
    // /api/chat is public (no auth), but requires OLLAMA_HOST on the server.
    const out = await this.request<{ message?: { content?: string } }>("POST", "/api/chat", { ...input, stream: false });
    return { content: out.message?.content ?? "" };
  }
}



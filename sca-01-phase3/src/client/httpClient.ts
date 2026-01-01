// ============================================================================
// MCP HTTP CLIENT
// Connects to SCA-01 Cloud Server with JWT authentication
// ============================================================================

export interface HttpClientConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  timeout?: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export class McpHttpClient {
  private config: HttpClientConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: HttpClientConfig) {
    this.config = {
      timeout: 30000,
      ...config
    };
  }

  private async authenticate(): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Authentication failed: ${(error as { error?: string }).error || response.statusText}`);
    }

    const tokens: TokenResponse = await response.json();
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.tokenExpiry = Date.now() + (tokens.expires_in * 1000) - 60000; // 1 min buffer
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || Date.now() > this.tokenExpiry) {
      if (this.refreshToken) {
        try {
          await this.refreshAccessToken();
          return;
        } catch {
          // Fall through to full auth
        }
      }
      await this.authenticate();
    }
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken
      })
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const tokens: TokenResponse = await response.json();
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.tokenExpiry = Date.now() + (tokens.expires_in * 1000) - 60000;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    await this.ensureAuthenticated();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.accessToken}`
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as { error?: string }).error || `Request failed: ${response.statusText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async connect(): Promise<void> {
    await this.authenticate();
  }

  async listTools(): Promise<{ tools: McpTool[] }> {
    return this.request("GET", "/mcp/tools");
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<McpToolResult> {
    return this.request("POST", "/mcp/tools/call", { name, arguments: args });
  }

  async healthCheck(): Promise<{ status: string; version: string }> {
    const response = await fetch(`${this.config.baseUrl}/health`);
    return response.json();
  }

  async getServerInfo(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.config.baseUrl}/mcp/info`);
    return response.json();
  }
}


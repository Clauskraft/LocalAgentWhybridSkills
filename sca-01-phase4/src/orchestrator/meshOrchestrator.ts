/**
 * Mesh Orchestrator
 * Coordinates tool calls between multiple agents
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  AgentRegistryEntry,
  ToolCallRequest,
  ToolCallResponse,
  OrchestratorConfig,
} from "../types/agent.js";
import { AgentRegistry, registry as defaultRegistry } from "../registry/agentRegistry.js";

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrentCalls: 5,
  defaultTimeout: 30000,
  retryAttempts: 2,
  retryDelayMs: 1000,
  heartbeatIntervalMs: 30000,
};

type HttpTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
};

class Phase3TokenManager {
  private baseUrl: string;
  private tokens: HttpTokens | null = null;

  public constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private getClientCreds(): { clientId: string; clientSecret: string } {
    const clientId =
      (process.env.SCA_PHASE3_CLIENT_ID ?? process.env.PHASE3_CLIENT_ID ?? process.env.CLIENT_ID ?? "").trim();
    const clientSecret =
      (process.env.SCA_PHASE3_CLIENT_SECRET ?? process.env.PHASE3_CLIENT_SECRET ?? process.env.CLIENT_SECRET ?? "").trim();

    if (!clientId || !clientSecret) {
      throw new Error("Missing Phase3 client credentials (SCA_PHASE3_CLIENT_ID/SCA_PHASE3_CLIENT_SECRET)");
    }
    return { clientId, clientSecret };
  }

  private async fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<{ status: number; json: any }> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const txt = await res.text().catch(() => "");
      let parsed: any = {};
      try {
        parsed = txt ? JSON.parse(txt) : {};
      } catch {
        parsed = { raw: txt };
      }
      return { status: res.status, json: parsed };
    } finally {
      clearTimeout(t);
    }
  }

  private async issueTokens(timeoutMs: number): Promise<void> {
    const { clientId, clientSecret } = this.getClientCreds();
    const url = `${this.baseUrl}/auth/token`;
    const { status, json } = await this.fetchJson(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
      },
      timeoutMs
    );
    if (status !== 200) throw new Error(`Token issuance failed: HTTP ${status}`);

    const expiresIn = Number(json?.expires_in ?? 900);
    this.tokens = {
      accessToken: String(json?.access_token ?? ""),
      refreshToken: String(json?.refresh_token ?? ""),
      expiresAt: Date.now() + Math.max(30, expiresIn - 60) * 1000, // refresh 60s early
    };
    if (!this.tokens.accessToken || !this.tokens.refreshToken) throw new Error("Token issuance returned invalid pair");
  }

  private async refreshTokens(timeoutMs: number): Promise<void> {
    if (!this.tokens?.refreshToken) {
      await this.issueTokens(timeoutMs);
      return;
    }
    const url = `${this.baseUrl}/auth/token`;
    const { status, json } = await this.fetchJson(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "refresh_token", refresh_token: this.tokens.refreshToken }),
      },
      timeoutMs
    );
    if (status !== 200) {
      // fallback: re-issue
      this.tokens = null;
      await this.issueTokens(timeoutMs);
      return;
    }
    const expiresIn = Number(json?.expires_in ?? 900);
    this.tokens = {
      accessToken: String(json?.access_token ?? ""),
      refreshToken: String(json?.refresh_token ?? ""),
      expiresAt: Date.now() + Math.max(30, expiresIn - 60) * 1000,
    };
    if (!this.tokens.accessToken || !this.tokens.refreshToken) throw new Error("Token refresh returned invalid pair");
  }

  public async getAccessToken(timeoutMs: number): Promise<string> {
    if (!this.tokens) {
      await this.issueTokens(timeoutMs);
      return this.tokens!.accessToken;
    }
    if (Date.now() >= this.tokens.expiresAt) {
      await this.refreshTokens(timeoutMs);
    }
    return this.tokens!.accessToken;
  }

  public async refreshOn401(timeoutMs: number): Promise<void> {
    await this.refreshTokens(timeoutMs);
  }
}

type ActiveStdioConnection = {
  agentId: string;
  client: Client;
  transport: StdioClientTransport;
  lastUsed: Date;
};

type ActiveHttpConnection = {
  agentId: string;
  baseUrl: string;
  tokenManager: Phase3TokenManager;
  lastUsed: Date;
};

type ActiveConnection = ActiveStdioConnection | ActiveHttpConnection;

export class MeshOrchestrator {
  private config: OrchestratorConfig;
  private connections: Map<string, ActiveConnection> = new Map();
  private pendingRequests: Map<string, { resolve: (r: ToolCallResponse) => void; reject: (e: Error) => void }> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private registry: AgentRegistry;

  constructor(config: Partial<OrchestratorConfig> = {}, registryImpl: AgentRegistry = defaultRegistry) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registry = registryImpl;
  }

  async start(): Promise<void> {
    await this.registry.load();
    
    console.log("🔗 Mesh Orchestrator starting...");
    console.log(`📋 ${this.registry.list().length} agents registered`);
    
    // Start heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeats().catch(console.error);
    }, this.config.heartbeatIntervalMs);
    
    // Connect to all online agents
    for (const entry of this.registry.list()) {
      if (entry.manifest.transport === "stdio" || entry.manifest.transport === "http") {
        await this.connectAgent(entry).catch((e) => {
          console.warn(`Failed to connect to ${entry.manifest.id}:`, e);
        });
      }
    }
  }

  public async pingAgent(
    agentId: string,
    timeoutMs: number = this.config.defaultTimeout
  ): Promise<{ agentId: string; status: "online" | "offline" | "degraded"; latencyMs: number; reason?: string }> {
    const entry = this.registry.get(agentId);
    if (!entry) {
      return { agentId, status: "offline", latencyMs: 0, reason: "agent_not_found" };
    }

    const start = Date.now();
    try {
      if (entry.manifest.transport === "http") {
        const baseUrl = normalizePhase3BaseUrl(entry.manifest.endpoint);
        const ok = await ping(`${baseUrl}/health`, timeoutMs);
        const latencyMs = Date.now() - start;
        if (!ok) {
          this.registry.updateStatus(agentId, "offline", "health_check_failed");
          return { agentId, status: "offline", latencyMs, reason: "health_check_failed" };
        }

        // Ensure token acquisition works (degraded if auth fails)
        try {
          const tm = new Phase3TokenManager(baseUrl);
          await tm.getAccessToken(timeoutMs);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "auth_failed";
          this.registry.updateStatus(agentId, "error", msg);
          return { agentId, status: "degraded", latencyMs, reason: msg };
        }

        this.registry.updateStatus(agentId, "online");
        return { agentId, status: "online", latencyMs };
      }

      // stdio: verify we can list tools within timeout
      const conn = this.connections.get(agentId);
      if (!conn || !("client" in conn)) {
        // try connecting
        await this.connectAgent(entry);
      }
      const conn2 = this.connections.get(agentId);
      if (!conn2 || !("client" in conn2)) {
        this.registry.updateStatus(agentId, "offline", "no_connection");
        return { agentId, status: "offline", latencyMs: Date.now() - start, reason: "no_connection" };
      }

      await Promise.race([
        conn2.client.listTools(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
      ]);

      this.registry.updateStatus(agentId, "online");
      return { agentId, status: "online", latencyMs: Date.now() - start };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.registry.updateStatus(agentId, "error", msg);
      return { agentId, status: "degraded", latencyMs: Date.now() - start, reason: msg };
    }
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Close all connections
    for (const conn of this.connections.values()) {
      if ("transport" in conn) {
        await conn.transport.close().catch(() => {});
      }
    }
    this.connections.clear();
    
    await this.registry.save();
    console.log("🔗 Mesh Orchestrator stopped");
  }

  private async connectAgent(entry: AgentRegistryEntry): Promise<void> {
    if (entry.manifest.transport === "http") {
      const endpoint = entry.manifest.endpoint.trim();
      if (!endpoint) throw new Error(`Invalid endpoint: ${entry.manifest.endpoint}`);
      const baseUrl = normalizePhase3BaseUrl(endpoint);

      // Validate cloud is reachable (public)
      const ok = await ping(`${baseUrl}/health`, this.config.defaultTimeout);
      if (!ok) throw new Error(`Health check failed for ${baseUrl}`);

      // Prepare token manager (bearer token)
      const tokenManager = new Phase3TokenManager(baseUrl);
      await tokenManager.getAccessToken(this.config.defaultTimeout);

      this.connections.set(entry.manifest.id, {
        agentId: entry.manifest.id,
        baseUrl,
        tokenManager,
        lastUsed: new Date(),
      });

      this.registry.updateStatus(entry.manifest.id, "online");
      console.log(`✅ Connected to HTTP agent: ${entry.manifest.name}`);
      return;
    }

    if (entry.manifest.transport !== "stdio") {
      throw new Error(`Unsupported transport: ${entry.manifest.transport}`);
    }

    // Parse command and args from endpoint
    const parts = entry.manifest.endpoint.split(" ");
    const command = parts[0];
    const args = parts.slice(1);

    if (!command) {
      throw new Error(`Invalid endpoint: ${entry.manifest.endpoint}`);
    }

    const transport = new StdioClientTransport({ command, args });
    const client = new Client(
      { name: "mesh-orchestrator", version: "0.4.0" },
      { capabilities: {} }
    );

    await client.connect(transport);

    this.connections.set(entry.manifest.id, {
      agentId: entry.manifest.id,
      client,
      transport,
      lastUsed: new Date(),
    });

    this.registry.updateStatus(entry.manifest.id, "online");
    console.log(`✅ Connected to agent: ${entry.manifest.name}`);
  }

  private async disconnectAgent(agentId: string): Promise<void> {
    const conn = this.connections.get(agentId);
    if (conn) {
      if ("transport" in conn) {
        await conn.transport.close().catch(() => {});
      }
      this.connections.delete(agentId);
      this.registry.updateStatus(agentId, "offline");
    }
  }

  private async checkHeartbeats(): Promise<void> {
    for (const entry of this.registry.list()) {
      const conn = this.connections.get(entry.manifest.id);
      
      if ((entry.manifest.transport === "stdio" || entry.manifest.transport === "http") && !conn) {
        // Try to reconnect
        await this.connectAgent(entry).catch(() => {
          this.registry.updateStatus(entry.manifest.id, "offline");
        });
      }
      if (entry.manifest.transport === "http" && conn && "baseUrl" in conn) {
        const ok = await ping(`${conn.baseUrl}/health`, this.config.defaultTimeout);
        if (!ok) {
          this.connections.delete(entry.manifest.id);
          this.registry.updateStatus(entry.manifest.id, "offline", "health_check_failed");
        }
      }
    }
  }

  async listAllTools(): Promise<Array<{ agentId: string; agentName: string; tools: Array<{ name: string; description: string | undefined }> }>> {
    const results: Array<{ agentId: string; agentName: string; tools: Array<{ name: string; description: string | undefined }> }> = [];

    for (const entry of this.registry.listOnline()) {
      const conn = this.connections.get(entry.manifest.id);
      if (!conn) continue;

      try {
        const toolsResult = await listToolsForConnection(conn, this.config.defaultTimeout);
        results.push({
          agentId: entry.manifest.id,
          agentName: entry.manifest.name,
          tools: toolsResult.map((t) => ({ name: t.name, description: t.description })),
        });
      } catch (e) {
        console.warn(`Failed to list tools for ${entry.manifest.id}:`, e);
      }
    }

    return results;
  }

  async callTool(request: ToolCallRequest): Promise<ToolCallResponse> {
    const startTime = Date.now();
    
    // Find target agent
    const entry = this.registry.get(request.targetAgentId);
    if (!entry) {
      return {
        requestId: request.requestId,
        success: false,
        error: `Agent not found: ${request.targetAgentId}`,
        durationMs: Date.now() - startTime,
      };
    }

    // Check if online
    if (entry.state.status !== "online") {
      return {
        requestId: request.requestId,
        success: false,
        error: `Agent is ${entry.state.status}: ${request.targetAgentId}`,
        durationMs: Date.now() - startTime,
      };
    }

    // Get connection
    const conn = this.connections.get(request.targetAgentId);
    if (!conn) {
      return {
        requestId: request.requestId,
        success: false,
        error: `No connection to agent: ${request.targetAgentId}`,
        durationMs: Date.now() - startTime,
      };
    }

    // Execute with retry
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const timeout = request.timeout ?? this.config.defaultTimeout;
        
        const result = await callToolForConnection(conn, request.toolName, request.arguments, timeout);

        const durationMs = Date.now() - startTime;
        this.registry.recordCall(request.targetAgentId, true, durationMs);
        conn.lastUsed = new Date();

        return {
          requestId: request.requestId,
          success: true,
          content: result,
          durationMs,
        };
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        
        if (attempt < this.config.retryAttempts) {
          await new Promise((r) => setTimeout(r, this.config.retryDelayMs));
        }
      }
    }

    const durationMs = Date.now() - startTime;
    this.registry.recordCall(request.targetAgentId, false, durationMs);

    return {
      requestId: request.requestId,
      success: false,
      error: lastError?.message ?? "Unknown error",
      durationMs,
    };
  }

  async broadcast(
    toolName: string,
    args: Record<string, unknown>,
    filter?: { tags?: string[]; transport?: string }
  ): Promise<ToolCallResponse[]> {
    let targets = this.registry.listOnline();

    // Apply filters
    if (filter?.tags) {
      targets = targets.filter((e) =>
        filter.tags?.some((tag) => e.manifest.tags?.includes(tag))
      );
    }
    if (filter?.transport) {
      targets = targets.filter((e) => e.manifest.transport === filter.transport);
    }

    // Filter to agents that have the tool
    const allTools = await this.listAllTools();
    const agentsWithTool = allTools
      .filter((a) => a.tools.some((t) => t.name === toolName))
      .map((a) => a.agentId);

    targets = targets.filter((e) => agentsWithTool.includes(e.manifest.id));

    // Execute in parallel
    const requests: ToolCallRequest[] = targets.map((e) => ({
      requestId: `broadcast-${Date.now()}-${e.manifest.id}`,
      sourceAgentId: "orchestrator",
      targetAgentId: e.manifest.id,
      toolName,
      arguments: args,
    }));

    const results = await Promise.all(
      requests.map((req) => this.callTool(req))
    );

    return results;
  }

  getStatus(): {
    online: number;
    offline: number;
    total: number;
    connections: string[];
  } {
    const agents = this.registry.list();
    const online = agents.filter((a) => a.state.status === "online").length;
    
    return {
      online,
      offline: agents.length - online,
      total: agents.length,
      connections: Array.from(this.connections.keys()),
    };
  }
}

// Singleton
export const orchestrator = new MeshOrchestrator();

function normalizePhase3BaseUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  // allow endpoint to be either base url or base url + /mcp
  if (trimmed.endsWith("/mcp")) return trimmed.slice(0, -"/mcp".length);
  if (trimmed.endsWith("/mcp/")) return trimmed.slice(0, -"/mcp/".length);
  return trimmed;
}

async function ping(url: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function listToolsForConnection(
  conn: ActiveConnection,
  timeoutMs: number
): Promise<Array<{ name: string; description?: string }>> {
  if ("client" in conn) {
    const toolsResult = await conn.client.listTools();
    return toolsResult.tools.map((t) => ({
      name: t.name,
      ...(t.description ? { description: t.description } : {})
    }));
  }

  const token = await conn.tokenManager.getAccessToken(timeoutMs);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${conn.baseUrl}/mcp/tools`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (res.status === 401) {
      await conn.tokenManager.refreshOn401(timeoutMs);
      const retryToken = await conn.tokenManager.getAccessToken(timeoutMs);
      const res2 = await fetch(`${conn.baseUrl}/mcp/tools`, {
        method: "GET",
        headers: { Authorization: `Bearer ${retryToken}` },
        signal: controller.signal,
      });
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
      const j2 = (await res2.json()) as { tools?: Array<{ name: string; description?: string }> };
      return j2.tools ?? [];
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as { tools?: Array<{ name: string; description?: string }> };
    return j.tools ?? [];
  } finally {
    clearTimeout(t);
  }
}

async function callToolForConnection(
  conn: ActiveConnection,
  toolName: string,
  args: Record<string, unknown>,
  timeoutMs: number
): Promise<unknown> {
  if ("client" in conn) {
    const result = await conn.client.callTool({ name: toolName, arguments: args });
    return result.content;
  }

  const attemptCall = async (token: string): Promise<Response> => {
    return fetch(`${conn.baseUrl}/mcp/tools/call`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: toolName, arguments: args }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  };

  const token = await conn.tokenManager.getAccessToken(timeoutMs);
  let res = await attemptCall(token);
  if (res.status === 401) {
    await conn.tokenManager.refreshOn401(timeoutMs);
    const retryToken = await conn.tokenManager.getAccessToken(timeoutMs);
    res = await attemptCall(retryToken);
  }
  const txt = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`HTTP ${res.status} ${txt}`);
  let parsed: unknown = {};
  try {
    parsed = txt ? JSON.parse(txt) : {};
  } catch {
    parsed = txt;
  }
  return parsed;
}

// CLI entry point
if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  const cmd = process.argv[2];

  await orchestrator.start();

  try {
    if (cmd === "status") {
      const status = orchestrator.getStatus();
      console.log("\n🔗 Mesh Status:");
      console.log(`  Online: ${status.online}/${status.total}`);
      console.log(`  Connections: ${status.connections.join(", ") || "none"}`);
    } else if (cmd === "tools") {
      const tools = await orchestrator.listAllTools();
      console.log("\n🛠️ Available Tools:");
      for (const agent of tools) {
        console.log(`\n  ${agent.agentName}:`);
        for (const tool of agent.tools) {
          console.log(`    - ${tool.name}: ${tool.description ?? ""}`);
        }
      }
    } else if (cmd === "call" && process.argv[3] && process.argv[4]) {
      const agentId = process.argv[3];
      const toolName = process.argv[4];
      const argsJson = process.argv[5] ?? "{}";
      
      const result = await orchestrator.callTool({
        requestId: `cli-${Date.now()}`,
        sourceAgentId: "cli",
        targetAgentId: agentId,
        toolName,
        arguments: JSON.parse(argsJson),
      });
      
      console.log("\n📤 Result:");
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("Usage:");
      console.log("  npx tsx src/orchestrator/meshOrchestrator.ts status");
      console.log("  npx tsx src/orchestrator/meshOrchestrator.ts tools");
      console.log('  npx tsx src/orchestrator/meshOrchestrator.ts call <agentId> <toolName> \'{"arg":"value"}\'');
    }
  } finally {
    await orchestrator.stop();
  }
}


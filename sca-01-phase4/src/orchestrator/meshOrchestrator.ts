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
import { registry } from "../registry/agentRegistry.js";

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrentCalls: 5,
  defaultTimeout: 30000,
  retryAttempts: 2,
  retryDelayMs: 1000,
  heartbeatIntervalMs: 30000,
};

interface ActiveConnection {
  agentId: string;
  client: Client;
  transport: StdioClientTransport;
  lastUsed: Date;
}

export class MeshOrchestrator {
  private config: OrchestratorConfig;
  private connections: Map<string, ActiveConnection> = new Map();
  private pendingRequests: Map<string, { resolve: (r: ToolCallResponse) => void; reject: (e: Error) => void }> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    await registry.load();
    
    console.log("🔗 Mesh Orchestrator starting...");
    console.log(`📋 ${registry.list().length} agents registered`);
    
    // Start heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeats().catch(console.error);
    }, this.config.heartbeatIntervalMs);
    
    // Connect to all online agents
    for (const entry of registry.list()) {
      if (entry.manifest.transport === "stdio") {
        await this.connectAgent(entry).catch((e) => {
          console.warn(`Failed to connect to ${entry.manifest.id}:`, e);
        });
      }
    }
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Close all connections
    for (const conn of this.connections.values()) {
      await conn.transport.close().catch(() => {});
    }
    this.connections.clear();
    
    await registry.save();
    console.log("🔗 Mesh Orchestrator stopped");
  }

  private async connectAgent(entry: AgentRegistryEntry): Promise<void> {
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

    registry.updateStatus(entry.manifest.id, "online");
    console.log(`✅ Connected to agent: ${entry.manifest.name}`);
  }

  private async disconnectAgent(agentId: string): Promise<void> {
    const conn = this.connections.get(agentId);
    if (conn) {
      await conn.transport.close().catch(() => {});
      this.connections.delete(agentId);
      registry.updateStatus(agentId, "offline");
    }
  }

  private async checkHeartbeats(): Promise<void> {
    for (const entry of registry.list()) {
      const conn = this.connections.get(entry.manifest.id);
      
      if (entry.manifest.transport === "stdio" && !conn) {
        // Try to reconnect
        await this.connectAgent(entry).catch(() => {
          registry.updateStatus(entry.manifest.id, "offline");
        });
      }
    }
  }

  async listAllTools(): Promise<Array<{ agentId: string; agentName: string; tools: Array<{ name: string; description: string | undefined }> }>> {
    const results: Array<{ agentId: string; agentName: string; tools: Array<{ name: string; description: string | undefined }> }> = [];

    for (const entry of registry.listOnline()) {
      const conn = this.connections.get(entry.manifest.id);
      if (!conn) continue;

      try {
        const toolsResult = await conn.client.listTools();
        results.push({
          agentId: entry.manifest.id,
          agentName: entry.manifest.name,
          tools: toolsResult.tools.map((t) => ({
            name: t.name,
            description: t.description,
          })),
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
    const entry = registry.get(request.targetAgentId);
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
        
        const result = await Promise.race([
          conn.client.callTool({ name: request.toolName, arguments: request.arguments }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), timeout)
          ),
        ]);

        const durationMs = Date.now() - startTime;
        registry.recordCall(request.targetAgentId, true, durationMs);
        conn.lastUsed = new Date();

        return {
          requestId: request.requestId,
          success: true,
          content: result.content,
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
    registry.recordCall(request.targetAgentId, false, durationMs);

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
    let targets = registry.listOnline();

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
    const agents = registry.list();
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


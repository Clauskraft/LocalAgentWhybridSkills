import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export interface McpClientConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export class McpToolClient {
  private readonly cfg: McpClientConfig;
  private readonly client: Client;
  private transport: StdioClientTransport | null = null;

  constructor(cfg: McpClientConfig) {
    this.cfg = cfg;
    this.client = new Client({ name: "mcp-backend", version: "0.1.0" }, { capabilities: {} });
  }

  public async connect(): Promise<void> {
    const transportParams = this.cfg.env
      ? { command: this.cfg.command, args: this.cfg.args, env: this.cfg.env }
      : { command: this.cfg.command, args: this.cfg.args };

    this.transport = new StdioClientTransport(transportParams);
    await this.client.connect(this.transport);
  }

  public async close(): Promise<void> {
    if (this.transport) {
      await this.transport.close().catch(() => {});
      this.transport = null;
    }
  }

  public async listTools(): Promise<{ tools: McpTool[] }> {
    const res = await this.client.listTools();
    return { tools: res.tools as unknown as McpTool[] };
  }

  public async callTool(name: string, args: Record<string, unknown>): Promise<{ content: unknown; isError?: boolean }> {
    const res = await this.client.callTool({ name, arguments: args });
    return res as unknown as { content: unknown; isError?: boolean };
  }
}



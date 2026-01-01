import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface McpToolClientOptions {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface ListToolsResult {
  tools: McpTool[];
}

export interface CallToolResult {
  content: unknown;
  isError?: boolean;
}

export class McpToolClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private readonly options: McpToolClientOptions;

  public constructor(options: McpToolClientOptions) {
    this.options = options;
  }

  public async connect(): Promise<void> {
    const transportOptions: { command: string; args: string[]; env?: Record<string, string> } = {
      command: this.options.command,
      args: this.options.args
    };
    if (this.options.env !== undefined) {
      transportOptions.env = this.options.env;
    }

    this.transport = new StdioClientTransport(transportOptions);

    this.client = new Client(
      { name: "sca-01-desktop", version: "0.2.0" },
      { capabilities: {} }
    );

    await this.client.connect(this.transport);
  }

  public async listTools(): Promise<ListToolsResult> {
    if (!this.client) throw new Error("MCP client not connected");
    const result = await this.client.listTools();
    return {
      tools: result.tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown> | undefined
      }))
    };
  }

  public async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    if (!this.client) throw new Error("MCP client not connected");
    const result = await this.client.callTool({ name, arguments: args });
    return {
      content: result.content,
      isError: result.isError
    };
  }

  public async close(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
    }
    this.transport = null;
    this.client = null;
  }
}


/**
 * WidgeTDC MCP Client
 * 
 * Connects Local Agent to WidgeTDC's MCP server providing access to:
 * - 20+ Knowledge Graph tools (Neo4j)
 * - 10+ File System tools
 * - 8+ Memory tools
 * - 5+ Communication tools
 * - 5+ Note management tools
 * - 5+ LLM tools
 * - 3+ Prometheus code analysis tools
 * - 3+ OSINT tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface WidgeTDCClientConfig {
  /** Path to WidgeTDC MCP server script */
  serverPath?: string;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export interface MCPToolResult {
  content: any[];
  isError?: boolean;
}

/**
 * MCP Client for WidgeTDC integration
 */
export class WidgeTDCMCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connected: boolean = false;

  constructor(private config: WidgeTDCClientConfig = {}) {
    // Default configuration
    this.config.serverPath = config.serverPath ||
      'c:\\Users\\claus\\Projects\\WidgeTDC_fresh\\packages\\mcp-backend-core\\dist\\index.js';
    this.config.timeout = config.timeout || 30000;
    this.config.debug = config.debug ?? false;
  }

  /**
   * Connect to WidgeTDC MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      this.log('Already connected');
      return;
    }

    try {
      this.log('Connecting to WidgeTDC MCP server...');

      // Create transport
      this.transport = new StdioClientTransport({
        command: 'node',
        args: [this.config.serverPath!],
      });

      // Create client
      this.client = new Client({
        name: 'local-agent-client',
        version: '1.0.0',
      }, {
        capabilities: {},
      } as any);

      // Connect
      await this.client.connect(this.transport);
      this.connected = true;

      this.log('✅ Connected to WidgeTDC MCP server');
    } catch (error) {
      this.log('❌ Failed to connect:', error);
      throw new Error(`Failed to connect to WidgeTDC MCP: ${error}`);
    }
  }

  /**
   * List all available MCP tools
   */
  async listTools(): Promise<MCPTool[]> {
    this.ensureConnected();

    try {
      const response = await this.client!.listTools();
      this.log(`📦 Found ${response.tools.length} tools`);
      return response.tools as MCPTool[];
    } catch (error) {
      this.log('❌ Failed to list tools:', error);
      throw error;
    }
  }

  /**
   * Call an MCP tool
   */
  async callTool(name: string, args: Record<string, any> = {}): Promise<MCPToolResult> {
    this.ensureConnected();

    try {
      this.log(`🔧 Calling tool: ${name}`, args);

      const response = await this.client!.callTool({
        name,
        arguments: args,
      });

      this.log(`✅ Tool ${name} completed`);
      return response as MCPToolResult;
    } catch (error) {
      this.log(`❌ Tool ${name} failed:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      if (this.client) {
        await this.client.close();
      }
      this.connected = false;
      this.client = null;
      this.transport = null;

      this.log('👋 Disconnected from WidgeTDC MCP server');
    } catch (error) {
      this.log('⚠️  Error during disconnect:', error);
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ============================================
  // Convenience Methods for Common Tools
  // ============================================

  /**
   * Query Neo4j knowledge graph
   */
  async queryNeo4j(cypher: string, params: Record<string, any> = {}): Promise<any> {
    const result = await this.callTool('neo4j_query', { cypher, params });
    return result.content[0];
  }

  /**
   * Create a note
   */
  async createNote(title: string, content: string, tags: string[] = []): Promise<any> {
    const result = await this.callTool('create_note', { title, content, tags });
    return result.content[0];
  }

  /**
   * Store memory
   */
  async storeMemory(key: string, value: any, metadata: Record<string, any> = {}): Promise<any> {
    const result = await this.callTool('store_memory', { key, value, metadata });
    return result.content[0];
  }

  /**
   * Retrieve memory
   */
  async retrieveMemory(key: string): Promise<any> {
    const result = await this.callTool('retrieve_memory', { key });
    return result.content[0];
  }

  /**
   * Run Prometheus code analysis
   */
  async runPrometheusAnalysis(path?: string): Promise<any> {
    const result = await this.callTool('prometheus_analyze', { path });
    return result.content[0];
  }

  /**
   * Check system health
   */
  async checkHealth(): Promise<any> {
    const result = await this.callTool('system_health', {});
    return result.content[0];
  }

  // ============================================
  // Private Methods
  // ============================================

  private ensureConnected(): void {
    if (!this.connected || !this.client) {
      throw new Error('Not connected to WidgeTDC MCP server. Call connect() first.');
    }
  }

  private log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[WidgeTDC MCP] ${message}`, ...args);
    }
  }
}

/**
 * Create and connect a WidgeTDC MCP client
 */
export async function createWidgeTDCClient(
  config?: WidgeTDCClientConfig
): Promise<WidgeTDCMCPClient> {
  const client = new WidgeTDCMCPClient(config);
  await client.connect();
  return client;
}

/**
 * Singleton instance for convenience
 */
let globalClient: WidgeTDCMCPClient | null = null;

/**
 * Get or create global WidgeTDC client instance
 */
export async function getGlobalWidgeTDCClient(
  config?: WidgeTDCClientConfig
): Promise<WidgeTDCMCPClient> {
  if (!globalClient || !globalClient.isConnected()) {
    globalClient = await createWidgeTDCClient(config);
  }
  return globalClient;
}

/**
 * Disconnect global client
 */
export async function disconnectGlobalClient(): Promise<void> {
  if (globalClient) {
    await globalClient.disconnect();
    globalClient = null;
  }
}

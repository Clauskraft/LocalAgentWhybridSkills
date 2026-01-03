/**
 * MCP Server Catalog
 * Pre-configured MCP servers that can be installed with one click
 */

export interface McpServerDefinition {
  id: string;
  name: string;
  description: string;
  category: McpCategory;
  transport: "stdio" | "http" | "sse";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  requiresAuth?: boolean;
  authType?: "api-key" | "oauth" | "token";
  authEnvVar?: string;
  documentation?: string;
  icon?: string;
  tags?: string[];
  popular?: boolean;
}

export type McpCategory = 
  | "filesystem"
  | "code"
  | "database"
  | "ai"
  | "productivity"
  | "cloud"
  | "security"
  | "widgetdc"
  | "custom";

export const MCP_SERVER_CATALOG: McpServerDefinition[] = [
  // ============ OFFICIAL / POPULAR ============
  {
    id: "filesystem",
    name: "Filesystem",
    description: "Read, write, and manage files on your system",
    category: "filesystem",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
    icon: "📁",
    tags: ["files", "read", "write", "directory"],
    popular: true,
  },
  {
    id: "github",
    name: "GitHub",
    description: "Interact with GitHub repositories, issues, and PRs",
    category: "code",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    requiresAuth: true,
    authType: "token",
    authEnvVar: "GITHUB_TOKEN",
    documentation: "https://github.com/modelcontextprotocol/servers",
    icon: "🐙",
    tags: ["git", "code", "repository", "issues", "pull-requests"],
    popular: true,
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    description: "Query and manage PostgreSQL databases",
    category: "database",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    requiresAuth: true,
    authType: "api-key",
    authEnvVar: "POSTGRES_CONNECTION_STRING",
    icon: "🐘",
    tags: ["database", "sql", "postgres"],
    popular: true,
  },
  {
    id: "sqlite",
    name: "SQLite",
    description: "Query and manage SQLite databases",
    category: "database",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sqlite", "--db-path", "./data.db"],
    icon: "🗃️",
    tags: ["database", "sql", "sqlite", "local"],
    popular: true,
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description: "Web search using Brave Search API",
    category: "ai",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    requiresAuth: true,
    authType: "api-key",
    authEnvVar: "BRAVE_API_KEY",
    documentation: "https://brave.com/search/api/",
    icon: "🦁",
    tags: ["search", "web", "internet"],
    popular: true,
  },
  {
    id: "puppeteer",
    name: "Puppeteer",
    description: "Browser automation and web scraping",
    category: "code",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    icon: "🎭",
    tags: ["browser", "automation", "scraping", "testing"],
    popular: true,
  },
  {
    id: "memory",
    name: "Memory",
    description: "Persistent memory and knowledge graph",
    category: "ai",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    icon: "🧠",
    tags: ["memory", "knowledge", "graph", "persistence"],
    popular: true,
  },
  {
    id: "fetch",
    name: "Fetch",
    description: "Fetch web pages and convert to markdown",
    category: "productivity",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
    icon: "🌐",
    tags: ["web", "fetch", "markdown", "scraping"],
    popular: true,
  },
  {
    id: "sequential-thinking",
    name: "Sequential Thinking",
    description: "Dynamic problem-solving through structured thoughts",
    category: "ai",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    icon: "🔄",
    tags: ["thinking", "reasoning", "problem-solving"],
    popular: true,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Interact with Slack workspaces",
    category: "productivity",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    requiresAuth: true,
    authType: "token",
    authEnvVar: "SLACK_BOT_TOKEN",
    icon: "💬",
    tags: ["chat", "messaging", "team"],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Access and manage Google Drive files",
    category: "cloud",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gdrive"],
    requiresAuth: true,
    authType: "oauth",
    icon: "📂",
    tags: ["cloud", "storage", "google", "files"],
  },
  {
    id: "notion",
    name: "Notion",
    description: "Read and write Notion pages and databases",
    category: "productivity",
    transport: "stdio",
    command: "npx",
    args: ["-y", "notion-mcp-server"],
    requiresAuth: true,
    authType: "api-key",
    authEnvVar: "NOTION_API_KEY",
    icon: "📝",
    tags: ["notes", "database", "wiki", "productivity"],
  },
  {
    id: "sentry",
    name: "Sentry",
    description: "Monitor errors and issues from Sentry",
    category: "code",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sentry"],
    requiresAuth: true,
    authType: "token",
    authEnvVar: "SENTRY_AUTH_TOKEN",
    icon: "🐛",
    tags: ["errors", "monitoring", "debugging"],
  },
  {
    id: "aws-kb-retrieval",
    name: "AWS Knowledge Base",
    description: "Query AWS Bedrock Knowledge Bases",
    category: "cloud",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-aws-kb-retrieval"],
    requiresAuth: true,
    authType: "api-key",
    authEnvVar: "AWS_ACCESS_KEY_ID",
    icon: "☁️",
    tags: ["aws", "cloud", "knowledge", "rag"],
  },
  {
    id: "everart",
    name: "EverArt",
    description: "Generate images with AI",
    category: "ai",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-everart"],
    requiresAuth: true,
    authType: "api-key",
    authEnvVar: "EVERART_API_KEY",
    icon: "🎨",
    tags: ["image", "generation", "art", "ai"],
  },

  // ============ CLAUDE / ANTHROPIC COMMON ============
  {
    id: "context7",
    name: "Context7",
    description: "Up-to-date documentation for any library",
    category: "code",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@upstash/context7-mcp"],
    icon: "📚",
    tags: ["documentation", "libraries", "api"],
    popular: true,
  },
  {
    id: "serena",
    name: "Serena",
    description: "Semantic code tools for intelligent editing",
    category: "code",
    transport: "stdio",
    command: "npx",
    args: ["-y", "serena-mcp-server"],
    icon: "🔮",
    tags: ["code", "semantic", "refactoring", "symbols"],
  },
  {
    id: "magic-21st",
    name: "21st.dev Magic",
    description: "UI component builder and inspiration",
    category: "code",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@21st-dev/magic-mcp"],
    icon: "✨",
    tags: ["ui", "components", "react", "design"],
  },

  // ============ SECURITY ============
  {
    id: "vault",
    name: "HashiCorp Vault",
    description: "Secrets management with Vault",
    category: "security",
    transport: "stdio",
    command: "npx",
    args: ["-y", "mcp-server-vault"],
    requiresAuth: true,
    authType: "token",
    authEnvVar: "VAULT_TOKEN",
    icon: "🔐",
    tags: ["secrets", "security", "vault"],
  },

  // ============ WIDGETDC / CUSTOM ============
  {
    id: "widgetdc-core",
    name: "WidgetDC Core",
    description: "Core WidgetDC tools and integrations",
    category: "widgetdc",
    transport: "stdio",
    command: "node",
    args: ["./build/mcp/widgetdc-server.js"],
    icon: "🔧",
    tags: ["widgetdc", "core", "tools"],
  },
  {
    id: "widgetdc-neo4j",
    name: "WidgetDC Neo4j",
    description: "Neo4j graph database for WidgetDC",
    category: "widgetdc",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@neo4j-contrib/mcp-neo4j"],
    requiresAuth: true,
    authType: "api-key",
    authEnvVar: "NEO4J_URI",
    icon: "🕸️",
    tags: ["widgetdc", "neo4j", "graph", "database"],
  },
  {
    id: "widgetdc-fastify",
    name: "WidgetDC API",
    description: "WidgetDC Fastify API server tools",
    category: "widgetdc",
    transport: "http",
    url: "http://localhost:3000/mcp",
    icon: "⚡",
    tags: ["widgetdc", "api", "fastify"],
  },

  // ============ LOCAL TOOLS ============
  {
    id: "sca-01-tools",
    name: "SCA-01 Tools",
    description: "Built-in SCA-01 file and make tools",
    category: "filesystem",
    transport: "stdio",
    command: "node",
    args: ["./build/mcp/toolServer.js"],
    icon: "🎯",
    tags: ["sca-01", "local", "tools"],
  },
];

// ============ HELPER FUNCTIONS ============

export function getServersByCategory(category: McpCategory): McpServerDefinition[] {
  return MCP_SERVER_CATALOG.filter(s => s.category === category);
}

export function getPopularServers(): McpServerDefinition[] {
  return MCP_SERVER_CATALOG.filter(s => s.popular);
}

export function searchServers(query: string): McpServerDefinition[] {
  const q = query.toLowerCase();
  return MCP_SERVER_CATALOG.filter(s => 
    s.name.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q) ||
    s.tags?.some(t => t.toLowerCase().includes(q))
  );
}

export function getServerById(id: string): McpServerDefinition | undefined {
  return MCP_SERVER_CATALOG.find(s => s.id === id);
}

export function getCategoryLabel(category: McpCategory): string {
  const labels: Record<McpCategory, string> = {
    filesystem: "📁 Filesystem",
    code: "💻 Code & Dev",
    database: "🗄️ Database",
    ai: "🤖 AI & ML",
    productivity: "📋 Productivity",
    cloud: "☁️ Cloud",
    security: "🔐 Security",
    widgetdc: "🔧 WidgetDC",
    custom: "⚙️ Custom",
  };
  return labels[category];
}

export function getAllCategories(): McpCategory[] {
  return ["filesystem", "code", "database", "ai", "productivity", "cloud", "security", "widgetdc", "custom"];
}


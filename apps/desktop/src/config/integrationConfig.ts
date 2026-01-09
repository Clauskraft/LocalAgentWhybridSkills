/**
 * Integration Configuration Manager
 * Loads and validates API keys for MCP server integrations
 */
import fs from "node:fs";
import path from "node:path";

// ============================================================================
// TYPES
// ============================================================================

export interface IntegrationConfig {
  github?: {
    enabled: boolean;
    token: string;
  };
  notion?: {
    enabled: boolean;
    apiKey: string;
    databaseId?: string;
  };
  huggingface?: {
    enabled: boolean;
    token: string;
  };
  braveSearch?: {
    enabled: boolean;
    apiKey: string;
  };
  google?: {
    maps?: { enabled: boolean; apiKey: string };
    drive?: { enabled: boolean; clientId: string; clientSecret: string };
    calendar?: { enabled: boolean };
    youtube?: { enabled: boolean; apiKey: string };
  };
  twitter?: {
    enabled: boolean;
    bearerToken: string;
    apiKey?: string;
    apiSecret?: string;
  };
  slack?: {
    enabled: boolean;
    botToken: string;
  };
  databases?: {
    postgres?: { enabled: boolean; connectionString: string };
    mongodb?: { enabled: boolean; uri: string };
    redis?: { enabled: boolean; url: string };
    neo4j?: { enabled: boolean; uri: string; user: string; password: string };
    supabase?: { enabled: boolean; url: string; serviceRoleKey: string };
  };
  projectManagement?: {
    linear?: { enabled: boolean; apiKey: string };
    jira?: { enabled: boolean; apiToken: string; email: string; host: string };
    todoist?: { enabled: boolean; apiToken: string };
  };
  ai?: {
    openai?: { enabled: boolean; apiKey: string };
    anthropic?: { enabled: boolean; apiKey: string };
  };
  devops?: {
    azureDevops?: { enabled: boolean; pat: string; organization: string };
  };
  payments?: {
    stripe?: { enabled: boolean; secretKey: string };
  };
  email?: {
    smtp?: { enabled: boolean; host: string; port: number; user: string; password: string };
  };
  widgetdc?: {
    cloudflare?: { enabled: boolean; workerUrl: string };
  };
  microsoft?: { // Added for Dot.Corp / Power Platform Integration
    enabled: boolean;
    tenantId: string;
    clientId: string;
    clientSecret?: string; // Optional: If present, use ClientSecretCredential (Server mode)
    environmentUrl?: string; // e.g. https://org123.crm.dynamics.com
  };
}

export interface IntegrationStatus {
  name: string;
  enabled: boolean;
  configured: boolean;
  error?: string;
}

// ============================================================================
// INTEGRATION CONFIG MANAGER
// ============================================================================

export class IntegrationConfigManager {
  private config: IntegrationConfig = {};
  private readonly configDir: string;
  private readonly configPath: string;

  public constructor(configDir: string = "./config") {
    this.configDir = path.resolve(configDir);
    this.configPath = path.join(this.configDir, "integrations.json");
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, "utf8");
        this.config = JSON.parse(content);
      }
    } catch {
      console.warn("Could not load integrations.json, using defaults");
      this.config = {};
    }
  }

  public save(): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  public getConfig(): IntegrationConfig {
    return this.config;
  }

  public updateConfig(updates: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...updates };
    this.save();
  }

  // ========== GETTERS FOR SPECIFIC INTEGRATIONS ==========

  public getGitHubToken(): string | undefined {
    if (this.config.github?.enabled && this.config.github.token) {
      return this.config.github.token;
    }
    return process.env.GITHUB_TOKEN;
  }

  public getNotionApiKey(): string | undefined {
    if (this.config.notion?.enabled && this.config.notion.apiKey) {
      return this.config.notion.apiKey;
    }
    return process.env.NOTION_API_KEY;
  }

  public getNotionDatabaseId(): string | undefined {
    return this.config.notion?.databaseId ?? process.env.NOTION_DATABASE_ID;
  }

  public getHuggingFaceToken(): string | undefined {
    if (this.config.huggingface?.enabled && this.config.huggingface.token) {
      return this.config.huggingface.token;
    }
    return process.env.HF_TOKEN;
  }

  public getBraveApiKey(): string | undefined {
    if (this.config.braveSearch?.enabled && this.config.braveSearch.apiKey) {
      return this.config.braveSearch.apiKey;
    }
    return process.env.BRAVE_API_KEY;
  }

  public getPostgresConnectionString(): string | undefined {
    if (this.config.databases?.postgres?.enabled) {
      return this.config.databases.postgres.connectionString;
    }
    return process.env.POSTGRES_CONNECTION_STRING;
  }

  public getSlackToken(): string | undefined {
    if (this.config.slack?.enabled && this.config.slack.botToken) {
      return this.config.slack.botToken;
    }
    return process.env.SLACK_BOT_TOKEN;
  }

  public getOpenAIApiKey(): string | undefined {
    if (this.config.ai?.openai?.enabled && this.config.ai.openai.apiKey) {
      return this.config.ai.openai.apiKey;
    }
    return process.env.OPENAI_API_KEY;
  }

  // ========== STATUS CHECKING ==========

  public getStatus(): IntegrationStatus[] {
    const statuses: IntegrationStatus[] = [];

    // GitHub
    const githubToken = this.getGitHubToken();
    statuses.push({
      name: "GitHub",
      enabled: this.config.github?.enabled ?? false,
      configured: !!githubToken && githubToken.startsWith("ghp_"),
    });

    // Notion
    const notionKey = this.getNotionApiKey();
    statuses.push({
      name: "Notion",
      enabled: this.config.notion?.enabled ?? false,
      configured: !!notionKey && notionKey.startsWith("secret_"),
    });

    // Hugging Face
    const hfToken = this.getHuggingFaceToken();
    statuses.push({
      name: "Hugging Face",
      enabled: this.config.huggingface?.enabled ?? false,
      configured: !!hfToken && hfToken.startsWith("hf_"),
    });

    // Brave Search
    const braveKey = this.getBraveApiKey();
    statuses.push({
      name: "Brave Search",
      enabled: this.config.braveSearch?.enabled ?? false,
      configured: !!braveKey && braveKey.startsWith("BSA"),
    });

    // PostgreSQL
    const pgConn = this.getPostgresConnectionString();
    statuses.push({
      name: "PostgreSQL",
      enabled: this.config.databases?.postgres?.enabled ?? false,
      configured: !!pgConn && pgConn.startsWith("postgresql://"),
    });

    // Slack
    const slackToken = this.getSlackToken();
    statuses.push({
      name: "Slack",
      enabled: this.config.slack?.enabled ?? false,
      configured: !!slackToken && slackToken.startsWith("xoxb-"),
    });

    // OpenAI
    const openaiKey = this.getOpenAIApiKey();
    statuses.push({
      name: "OpenAI",
      enabled: this.config.ai?.openai?.enabled ?? false,
      configured: !!openaiKey && openaiKey.startsWith("sk-"),
    });

    // Cyberstreams
    statuses.push({
      name: "Cyberstreams",
      enabled: this.config.widgetdc?.cyberstreams?.enabled ?? false,
      configured: !!this.config.widgetdc?.cyberstreams?.serverPath,
    });

    return statuses;
  }

  // ========== ENVIRONMENT BUILDING ==========

  /**
   * Build environment variables for MCP server processes
   */
  public buildEnvForMcp(serverId: string): Record<string, string> {
    const env: Record<string, string> = {};

    switch (serverId) {
      case "github":
        const ghToken = this.getGitHubToken();
        if (ghToken) env.GITHUB_PERSONAL_ACCESS_TOKEN = ghToken;
        break;

      case "notion":
        const notionKey = this.getNotionApiKey();
        if (notionKey) env.NOTION_API_KEY = notionKey;
        break;

      case "huggingface":
        const hfToken = this.getHuggingFaceToken();
        if (hfToken) env.HF_TOKEN = hfToken;
        break;

      case "brave-search":
        const braveKey = this.getBraveApiKey();
        if (braveKey) env.BRAVE_API_KEY = braveKey;
        break;

      case "postgres":
        const pgConn = this.getPostgresConnectionString();
        if (pgConn) env.POSTGRES_CONNECTION_STRING = pgConn;
        break;

      case "slack":
        const slackToken = this.getSlackToken();
        if (slackToken) env.SLACK_BOT_TOKEN = slackToken;
        break;

      case "openai":
        const openaiKey = this.getOpenAIApiKey();
        if (openaiKey) env.OPENAI_API_KEY = openaiKey;
        break;

      case "google-maps":
        if (this.config.google?.maps?.enabled) {
          env.GOOGLE_MAPS_API_KEY = this.config.google.maps.apiKey;
        }
        break;

      case "google-drive":
        if (this.config.google?.drive?.enabled) {
          env.GDRIVE_CLIENT_ID = this.config.google.drive.clientId;
          env.GDRIVE_CLIENT_SECRET = this.config.google.drive.clientSecret;
        }
        break;

      case "twitter":
        if (this.config.twitter?.enabled) {
          env.TWITTER_BEARER_TOKEN = this.config.twitter.bearerToken;
          if (this.config.twitter.apiKey) env.TWITTER_API_KEY = this.config.twitter.apiKey;
          if (this.config.twitter.apiSecret) env.TWITTER_API_SECRET = this.config.twitter.apiSecret;
        }
        break;

      case "widgetdc-core":
      case "widgettdc-core":
        // Ensure WidgetDC/WidgetTDC server processes can resolve the same config root.
        env.SCA_CONFIG_DIR = this.configDir;

        // Optional: also pass through resolved settings so stdio servers can run without reading JSON directly.
        if (this.config.widgetdc?.cyberstreams?.enabled && this.config.widgetdc.cyberstreams.serverPath) {
          env.WIDGETDC_CYBERSTREAMS_SERVER_PATH = this.config.widgetdc.cyberstreams.serverPath;
        }
        if (this.config.widgetdc?.cockpit?.enabled && this.config.widgetdc.cockpit.url) {
          env.WIDGETDC_COCKPIT_URL = this.config.widgetdc.cockpit.url;
        }
        if (this.config.widgetdc?.cloudflare?.enabled && this.config.widgetdc.cloudflare.workerUrl) {
          env.WIDGETDC_WORKER_URL = this.config.widgetdc.cloudflare.workerUrl;
        }
        break;

      case "microsoft":
        if (this.config.microsoft?.enabled) {
          env.MS_TENANT_ID = this.config.microsoft.tenantId;
          env.MS_CLIENT_ID = this.config.microsoft.clientId;
          if (this.config.microsoft.clientSecret) env.MS_CLIENT_SECRET = this.config.microsoft.clientSecret;
          if (this.config.microsoft.environmentUrl) env.MS_POWER_PLATFORM_URL = this.config.microsoft.environmentUrl;
        }
        break;
    }

    return env;
  }
}

// Cache per configDir to avoid cross-talk (tests/package/app can use different config roots).
const integrationManagers = new Map<string, IntegrationConfigManager>();

export function getIntegrationManager(configDir: string = "./config"): IntegrationConfigManager {
  const key = path.resolve(configDir);
  const existing = integrationManagers.get(key);
  if (existing) return existing;

  const created = new IntegrationConfigManager(configDir);
  integrationManagers.set(key, created);
  return created;
}


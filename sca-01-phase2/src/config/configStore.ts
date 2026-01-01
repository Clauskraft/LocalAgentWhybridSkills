import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ============================================================================
// CONFIGURATION STORE - Secure storage for agent configuration
// ============================================================================

export interface PathRule {
  id: string;
  path: string;
  access: "allow" | "deny" | "require_approval";
  description?: string;
  createdAt: string;
}

export interface RepoConfig {
  id: string;
  name: string;
  owner: string;
  url: string;
  accessToken?: string; // Encrypted
  enabled: boolean;
  permissions: ("read" | "write" | "admin")[];
  description?: string;
  createdAt: string;
}

export interface ToolCredential {
  id: string;
  toolName: string;
  credentialType: "api_key" | "oauth" | "basic" | "bearer" | "custom";
  credentials: Record<string, string>; // Encrypted values
  enabled: boolean;
  expiresAt?: string;
  description?: string;
  createdAt: string;
}

export interface ServiceConnection {
  id: string;
  name: string;
  type: "github" | "azure" | "aws" | "ollama" | "custom";
  endpoint: string;
  credentials?: Record<string, string>; // Encrypted
  enabled: boolean;
  healthCheck?: string;
  lastChecked?: string;
  status?: "connected" | "disconnected" | "error";
  createdAt: string;
}

export interface AgentConfig {
  version: string;
  
  // Access Control
  pathRules: PathRule[];
  blockedPaths: string[];
  safePaths: string[];
  
  // Repository Access
  repos: RepoConfig[];
  
  // Tool Credentials
  toolCredentials: ToolCredential[];
  
  // Service Connections
  services: ServiceConnection[];
  
  // Agent Settings
  settings: {
    fullAccess: boolean;
    autoApprove: boolean;
    maxTurns: number;
    shellTimeout: number;
    maxFileSize: number;
    logLevel: "debug" | "info" | "warn" | "error";
    ollamaModel: string;
    ollamaHost: string;
  };
  
  // Metadata
  lastModified: string;
  modifiedBy: string;
}

const DEFAULT_CONFIG: AgentConfig = {
  version: "1.0.0",
  
  pathRules: [],
  blockedPaths: [
    "C:\\Windows\\System32\\config",
    "C:\\Windows\\System32\\drivers",
    "/etc/shadow",
    "/etc/sudoers",
    ".ssh/id_rsa",
    ".ssh/id_ed25519",
    ".gnupg",
    ".aws/credentials"
  ],
  safePaths: ["."],
  
  repos: [],
  toolCredentials: [],
  services: [
    {
      id: "ollama-local",
      name: "Ollama Local",
      type: "ollama",
      endpoint: "http://localhost:11434",
      enabled: true,
      createdAt: new Date().toISOString()
    }
  ],
  
  settings: {
    fullAccess: false,
    autoApprove: false,
    maxTurns: 16,
    shellTimeout: 300000,
    maxFileSize: 10000000,
    logLevel: "info",
    ollamaModel: "qwen3",
    ollamaHost: "http://localhost:11434"
  },
  
  lastModified: new Date().toISOString(),
  modifiedBy: "system"
};

export class ConfigStore {
  private configPath: string;
  private encryptionKey: Buffer;
  private config: AgentConfig;

  constructor(configDir: string = "./config") {
    const dir = path.resolve(configDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    this.configPath = path.join(dir, "agent-config.json");
    this.encryptionKey = this.getOrCreateEncryptionKey(dir);
    this.config = this.load();
  }

  private getOrCreateEncryptionKey(dir: string): Buffer {
    const keyPath = path.join(dir, ".encryption-key");
    
    if (fs.existsSync(keyPath)) {
      return Buffer.from(fs.readFileSync(keyPath, "utf8"), "hex");
    }
    
    // Generate new key
    const key = crypto.randomBytes(32);
    fs.writeFileSync(keyPath, key.toString("hex"), { mode: 0o600 });
    return key;
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  private decrypt(encrypted: string): string {
    const [ivHex, authTagHex, data] = encrypted.split(":");
    if (!ivHex || !authTagHex || !data) {
      throw new Error("Invalid encrypted data format");
    }
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(data, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  private load(): AgentConfig {
    if (!fs.existsSync(this.configPath)) {
      this.save(DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }
    
    try {
      const data = fs.readFileSync(this.configPath, "utf8");
      return JSON.parse(data) as AgentConfig;
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  private save(config?: AgentConfig): void {
    const toSave = config ?? this.config;
    toSave.lastModified = new Date().toISOString();
    fs.writeFileSync(this.configPath, JSON.stringify(toSave, null, 2), { mode: 0o600 });
  }

  // ========== PATH RULES ==========
  
  addPathRule(rule: Omit<PathRule, "id" | "createdAt">): PathRule {
    const newRule: PathRule = {
      ...rule,
      id: `path-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.config.pathRules.push(newRule);
    this.save();
    return newRule;
  }

  removePathRule(id: string): boolean {
    const idx = this.config.pathRules.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.config.pathRules.splice(idx, 1);
    this.save();
    return true;
  }

  getPathRules(): PathRule[] {
    return [...this.config.pathRules];
  }

  addBlockedPath(path: string): void {
    if (!this.config.blockedPaths.includes(path)) {
      this.config.blockedPaths.push(path);
      this.save();
    }
  }

  removeBlockedPath(path: string): boolean {
    const idx = this.config.blockedPaths.indexOf(path);
    if (idx === -1) return false;
    this.config.blockedPaths.splice(idx, 1);
    this.save();
    return true;
  }

  addSafePath(path: string): void {
    if (!this.config.safePaths.includes(path)) {
      this.config.safePaths.push(path);
      this.save();
    }
  }

  removeSafePath(path: string): boolean {
    const idx = this.config.safePaths.indexOf(path);
    if (idx === -1) return false;
    this.config.safePaths.splice(idx, 1);
    this.save();
    return true;
  }

  // ========== REPOS ==========

  addRepo(repo: Omit<RepoConfig, "id" | "createdAt">): RepoConfig {
    const newRepo: RepoConfig = {
      ...repo,
      id: `repo-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    
    // Encrypt access token if provided
    if (newRepo.accessToken) {
      newRepo.accessToken = this.encrypt(newRepo.accessToken);
    }
    
    this.config.repos.push(newRepo);
    this.save();
    return newRepo;
  }

  updateRepo(id: string, updates: Partial<RepoConfig>): RepoConfig | null {
    const repo = this.config.repos.find(r => r.id === id);
    if (!repo) return null;
    
    Object.assign(repo, updates);
    
    // Re-encrypt if token changed
    if (updates.accessToken && !updates.accessToken.includes(":")) {
      repo.accessToken = this.encrypt(updates.accessToken);
    }
    
    this.save();
    return repo;
  }

  removeRepo(id: string): boolean {
    const idx = this.config.repos.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.config.repos.splice(idx, 1);
    this.save();
    return true;
  }

  getRepos(): RepoConfig[] {
    return this.config.repos.map(r => ({
      ...r,
      accessToken: r.accessToken ? "[ENCRYPTED]" : undefined
    }));
  }

  getRepoToken(id: string): string | null {
    const repo = this.config.repos.find(r => r.id === id);
    if (!repo?.accessToken) return null;
    try {
      return this.decrypt(repo.accessToken);
    } catch {
      return null;
    }
  }

  // ========== TOOL CREDENTIALS ==========

  addToolCredential(cred: Omit<ToolCredential, "id" | "createdAt">): ToolCredential {
    const newCred: ToolCredential = {
      ...cred,
      id: `cred-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    
    // Encrypt all credential values
    const encrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(newCred.credentials)) {
      encrypted[key] = this.encrypt(value);
    }
    newCred.credentials = encrypted;
    
    this.config.toolCredentials.push(newCred);
    this.save();
    return newCred;
  }

  updateToolCredential(id: string, updates: Partial<ToolCredential>): ToolCredential | null {
    const cred = this.config.toolCredentials.find(c => c.id === id);
    if (!cred) return null;
    
    // Handle credential updates
    if (updates.credentials) {
      const encrypted: Record<string, string> = {};
      for (const [key, value] of Object.entries(updates.credentials)) {
        encrypted[key] = this.encrypt(value);
      }
      updates.credentials = encrypted;
    }
    
    Object.assign(cred, updates);
    this.save();
    return cred;
  }

  removeToolCredential(id: string): boolean {
    const idx = this.config.toolCredentials.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.config.toolCredentials.splice(idx, 1);
    this.save();
    return true;
  }

  getToolCredentials(): ToolCredential[] {
    return this.config.toolCredentials.map(c => ({
      ...c,
      credentials: Object.fromEntries(
        Object.keys(c.credentials).map(k => [k, "[ENCRYPTED]"])
      )
    }));
  }

  getDecryptedCredential(id: string): Record<string, string> | null {
    const cred = this.config.toolCredentials.find(c => c.id === id);
    if (!cred) return null;
    
    try {
      const decrypted: Record<string, string> = {};
      for (const [key, value] of Object.entries(cred.credentials)) {
        decrypted[key] = this.decrypt(value);
      }
      return decrypted;
    } catch {
      return null;
    }
  }

  // ========== SERVICES ==========

  addService(service: Omit<ServiceConnection, "id" | "createdAt">): ServiceConnection {
    const newService: ServiceConnection = {
      ...service,
      id: `svc-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    
    // Encrypt credentials
    if (newService.credentials) {
      const encrypted: Record<string, string> = {};
      for (const [key, value] of Object.entries(newService.credentials)) {
        encrypted[key] = this.encrypt(value);
      }
      newService.credentials = encrypted;
    }
    
    this.config.services.push(newService);
    this.save();
    return newService;
  }

  updateService(id: string, updates: Partial<ServiceConnection>): ServiceConnection | null {
    const service = this.config.services.find(s => s.id === id);
    if (!service) return null;
    
    if (updates.credentials) {
      const encrypted: Record<string, string> = {};
      for (const [key, value] of Object.entries(updates.credentials)) {
        encrypted[key] = this.encrypt(value);
      }
      updates.credentials = encrypted;
    }
    
    Object.assign(service, updates);
    this.save();
    return service;
  }

  removeService(id: string): boolean {
    const idx = this.config.services.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.config.services.splice(idx, 1);
    this.save();
    return true;
  }

  getServices(): ServiceConnection[] {
    return this.config.services.map(s => ({
      ...s,
      credentials: s.credentials 
        ? Object.fromEntries(Object.keys(s.credentials).map(k => [k, "[ENCRYPTED]"]))
        : undefined
    }));
  }

  // ========== SETTINGS ==========

  getSettings(): AgentConfig["settings"] {
    return { ...this.config.settings };
  }

  updateSettings(updates: Partial<AgentConfig["settings"]>): void {
    Object.assign(this.config.settings, updates);
    this.save();
  }

  // ========== FULL CONFIG ==========

  getFullConfig(): AgentConfig {
    return {
      ...this.config,
      repos: this.getRepos(),
      toolCredentials: this.getToolCredentials(),
      services: this.getServices()
    };
  }

  exportConfig(includeSensitive = false): string {
    if (includeSensitive) {
      return JSON.stringify(this.config, null, 2);
    }
    return JSON.stringify(this.getFullConfig(), null, 2);
  }

  importConfig(json: string): void {
    const imported = JSON.parse(json) as AgentConfig;
    this.config = imported;
    this.save();
  }
}

// Singleton
let globalStore: ConfigStore | null = null;

export function getConfigStore(configDir?: string): ConfigStore {
  if (!globalStore) {
    globalStore = new ConfigStore(configDir);
  }
  return globalStore;
}


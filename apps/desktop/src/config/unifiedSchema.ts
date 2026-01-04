import { z } from "zod";

export const CURRENT_CONFIG_VERSION = 1 as const;

// -----------------------------
// Shared sub-schemas
// -----------------------------

export const ZPathRule = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  access: z.enum(["allow", "deny", "require_approval"]),
  description: z.string().optional(),
  createdAt: z.string().min(1),
});

export const ZRepoConfig = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  owner: z.string().min(1),
  url: z.string().min(1),
  enabled: z.boolean(),
  permissions: z.array(z.enum(["read", "write", "admin"])),
  description: z.string().optional(),
  createdAt: z.string().min(1),
});

export const ZToolCredential = z.object({
  id: z.string().min(1),
  toolName: z.string().min(1),
  credentialType: z.enum(["api_key", "oauth", "basic", "bearer", "custom"]),
  enabled: z.boolean(),
  expiresAt: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.string().min(1),
});

export const ZServiceConnection = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["github", "azure", "aws", "ollama", "custom"]),
  endpoint: z.string().min(1),
  enabled: z.boolean(),
  healthCheck: z.string().optional(),
  lastChecked: z.string().optional(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
  createdAt: z.string().min(1),
});

// -----------------------------
// Secrets schema (always encrypted at rest)
// -----------------------------

export const ZUnifiedSecrets = z.object({
  // Encrypted with Electron safeStorage (base64 payload)
  cloudRefreshTokenEncrypted: z.string().optional(),

  // Encrypted tokens/credentials for repos/tools/services
  repoAccessTokensEncrypted: z.record(z.string()).default({}), // repoId -> encrypted token
  toolCredentialsEncrypted: z.record(z.record(z.string())).default({}), // credId -> { key -> encrypted value }
  serviceCredentialsEncrypted: z.record(z.record(z.string())).default({}), // svcId -> { key -> encrypted value }

  // Metadata
  lastModified: z.string().optional(),
});

export type UnifiedSecrets = z.infer<typeof ZUnifiedSecrets>;

// -----------------------------
// Config schema (non-secret)
// -----------------------------

export const ZUnifiedConfig = z.object({
  version: z.literal(CURRENT_CONFIG_VERSION),

  // LLM
  ollamaHost: z.string(),
  ollamaModel: z.string(),

  // Cloud preference
  useCloud: z.boolean(),
  backendUrl: z.string(),

  // UI
  theme: z.string(),

  // Paths / repo root
  repoRoot: z.string(),
  logDir: z.string(),
  safeDirs: z.array(z.string()),

  // Permissions
  fullAccess: z.boolean(),
  autoApprove: z.boolean(),
  allowWrite: z.boolean(),
  allowExec: z.boolean(),

  // Limits
  maxTurns: z.number().int().positive(),
  shellTimeout: z.number().int().positive(),
  maxFileSize: z.number().int().positive(),

  // Extended config-store model
  pathRules: z.array(ZPathRule),
  blockedPaths: z.array(z.string()),
  repos: z.array(ZRepoConfig),
  toolCredentials: z.array(ZToolCredential),
  services: z.array(ZServiceConnection),

  // Metadata
  createdAt: z.string(),
  lastModified: z.string(),
});

export type UnifiedConfig = z.infer<typeof ZUnifiedConfig>;

export function nowIso(): string {
  return new Date().toISOString();
}



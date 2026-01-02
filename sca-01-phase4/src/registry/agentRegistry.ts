/**
 * Agent Registry
 * Central registry for discovering and managing agents
 */
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type {
  AgentManifest,
  AgentState,
  AgentRegistryEntry,
  AgentStatus,
} from "../types/agent.js";

const REGISTRY_FILE = "docs/AGENTS.md";
const REGISTRY_JSON = ".agent-registry.json";
const REGISTRY_DIR = "docs";

interface RegistryStorage {
  version: string;
  agents: AgentRegistryEntry[];
  lastUpdated: string;
}

const AgentTransportSchema = z.enum(["stdio", "http", "websocket"]);
const AgentTrustLevelSchema = z.enum(["untrusted", "local", "verified", "signed"]);

const AgentCapabilitySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  inputSchema: z.record(z.unknown()).optional(),
});

const AgentManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  author: z.string().min(1).optional(),

  transport: AgentTransportSchema,
  endpoint: z.string().min(1),

  capabilities: z.array(AgentCapabilitySchema),
  resources: z.array(z.string()).optional(),
  prompts: z.array(z.string()).optional(),

  trustLevel: AgentTrustLevelSchema,
  signature: z.string().optional(),
  publicKey: z.string().optional(),

  tags: z.array(z.string()).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export class AgentRegistry {
  private agents: Map<string, AgentRegistryEntry> = new Map();
  private repoRoot: string;

  constructor(repoRoot: string = process.cwd()) {
    this.repoRoot = repoRoot;
  }

  async load(): Promise<void> {
    const jsonPath = path.join(this.repoRoot, REGISTRY_JSON);
    
    try {
      const content = await fs.readFile(jsonPath, "utf8");
      const storage = JSON.parse(content) as RegistryStorage;
      
      this.agents.clear();
      for (const entry of storage.agents) {
        this.agents.set(entry.manifest.id, entry);
      }
      
      console.log(`Loaded ${this.agents.size} agents from registry`);
    } catch (e) {
      // Registry doesn't exist yet
      console.log("No existing registry found, starting fresh");
    }
  }

  async save(): Promise<void> {
    const storage: RegistryStorage = {
      version: "1.0.0",
      agents: Array.from(this.agents.values()),
      lastUpdated: new Date().toISOString(),
    };
    
    const jsonPath = path.join(this.repoRoot, REGISTRY_JSON);
    await fs.writeFile(jsonPath, JSON.stringify(storage, null, 2), "utf8");
    
    // Also update Markdown blackboard
    await this.updateMarkdownRegistry();
  }

  async syncFromMarkdown(): Promise<void> {
    const mdPath = path.join(this.repoRoot, REGISTRY_FILE);
    try {
      const content = await fs.readFile(mdPath, "utf8");

      // Preferred format: each agent section contains a JSON manifest code block.
      // This allows full fidelity round-trip between Markdown and JSON storage.
      const manifestsFromJsonBlocks = this.parseManifestsFromMarkdown(content);
      if (manifestsFromJsonBlocks.length > 0) {
        for (const manifest of manifestsFromJsonBlocks) {
          this.register(manifest);
        }
        return;
      }

      // Legacy fallback: parse table only (lossy).
      const lines = content.split("\n");
      let inTable = false;
      for (const line of lines) {
        if (line.startsWith("| ID |")) { inTable = true; continue; }
        if (inTable && line.startsWith("|") && line.includes("|")) {
          const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
          if (cols.length >= 5) {
            const [id, name, transport, status, trust] = cols;
            if (!id || !name || !transport || !status || !trust) continue;

            const trustLevel = ((trust.split(" ").pop() ?? "untrusted") as AgentManifest["trustLevel"]);
            const statusVal = ((status.split(" ").pop() ?? "offline") as AgentStatus);
            this.register({
              id,
              name,
              version: "unknown",
              description: "Imported from AGENTS.md",
              transport: transport as AgentManifest["transport"],
              endpoint: "unknown",
              trustLevel,
              capabilities: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            this.updateStatus(id, statusVal);
          }
        }
      }
    } catch {
      // ignore if no markdown yet
    }
  }

  private parseManifestsFromMarkdown(content: string): AgentManifest[] {
    const manifests: AgentManifest[] = [];
    const re = /```json\s*([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      const raw = match[1]?.trim();
      if (!raw) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        throw new Error(`Invalid JSON manifest block in ${REGISTRY_FILE}: ${e instanceof Error ? e.message : "parse error"}`);
      }
      const validated = AgentManifestSchema.safeParse(parsed);
      if (!validated.success) {
        throw new Error(`Invalid agent manifest in ${REGISTRY_FILE}: ${validated.error.message}`);
      }
      manifests.push(validated.data as AgentManifest);
    }
    return manifests;
  }

  private async updateMarkdownRegistry(): Promise<void> {
    const mdPath = path.join(this.repoRoot, REGISTRY_FILE);
    
    const lines: string[] = [
      "# Agent Registry",
      "",
      `> Last updated: ${new Date().toISOString()}`,
      "",
      "## Registered Agents",
      "",
      "| ID | Name | Transport | Status | Trust |",
      "|-----|------|-----------|--------|-------|",
    ];
    
    for (const entry of this.agents.values()) {
      const { manifest, state } = entry;
      const statusEmoji = this.getStatusEmoji(state.status);
      const trustEmoji = this.getTrustEmoji(manifest.trustLevel);
      
      lines.push(
        `| ${manifest.id} | ${manifest.name} | ${manifest.transport} | ${statusEmoji} ${state.status} | ${trustEmoji} ${manifest.trustLevel} |`
      );
    }
    
    lines.push("");
    lines.push("## Agent Details");
    lines.push("");
    
    for (const entry of this.agents.values()) {
      const { manifest, state } = entry;
      
      lines.push(`### ${manifest.name} (${manifest.id})`);
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(manifest, null, 2));
      lines.push("```");
      lines.push("");

      lines.push("**State:**");
      lines.push(`- Status: ${state.status}`);
      lines.push(`- Last seen: ${state.lastSeen}`);
      if (state.errorMessage) {
        lines.push(`- Error: ${state.errorMessage}`);
      }

      lines.push("");
      lines.push("**Metrics:**");
      lines.push(`- Calls: ${state.metrics.callsSuccess}/${state.metrics.callsTotal} success`);
      lines.push(`- Avg Response: ${state.metrics.avgResponseMs.toFixed(0)}ms`);
      lines.push("");
    }
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(mdPath), { recursive: true });
    await fs.writeFile(mdPath, lines.join("\n"), "utf8");
  }

  private getStatusEmoji(status: AgentStatus): string {
    switch (status) {
      case "online": return "🟢";
      case "busy": return "🟡";
      case "offline": return "⚫";
      case "error": return "🔴";
    }
  }

  private getTrustEmoji(trust: AgentManifest["trustLevel"]): string {
    switch (trust) {
      case "signed": return "✅";
      case "verified": return "🔒";
      case "local": return "🏠";
      case "untrusted": return "⚠️";
    }
  }

  register(manifest: AgentManifest): void {
    // Validate manifests at the boundary (CLI, markdown import, programmatic use)
    const validated = AgentManifestSchema.safeParse(manifest);
    if (!validated.success) {
      throw new Error(`Invalid agent manifest: ${validated.error.message}`);
    }

    const existing = this.agents.get(manifest.id);
    
    const state: AgentState = existing?.state ?? {
      id: manifest.id,
      status: "offline",
      lastSeen: new Date().toISOString(),
      metrics: {
        callsTotal: 0,
        callsSuccess: 0,
        callsFailed: 0,
        avgResponseMs: 0,
      },
    };
    
    this.agents.set(manifest.id, { manifest, state });
    console.log(`Registered agent: ${manifest.name} (${manifest.id})`);
  }

  unregister(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  get(agentId: string): AgentRegistryEntry | undefined {
    return this.agents.get(agentId);
  }

  list(): AgentRegistryEntry[] {
    return Array.from(this.agents.values());
  }

  listByCapability(capabilityName: string): AgentRegistryEntry[] {
    return this.list().filter((entry) =>
      entry.manifest.capabilities.some((cap) => cap.name === capabilityName)
    );
  }

  listByTransport(transport: AgentManifest["transport"]): AgentRegistryEntry[] {
    return this.list().filter((entry) => entry.manifest.transport === transport);
  }

  listOnline(): AgentRegistryEntry[] {
    return this.list().filter((entry) => entry.state.status === "online");
  }

  updateStatus(agentId: string, status: AgentStatus, errorMessage?: string): void {
    const entry = this.agents.get(agentId);
    if (entry) {
      entry.state.status = status;
      entry.state.lastSeen = new Date().toISOString();
      if (errorMessage !== undefined) {
        entry.state.errorMessage = errorMessage;
      }
    }
  }

  recordCall(agentId: string, success: boolean, durationMs: number): void {
    const entry = this.agents.get(agentId);
    if (entry) {
      const metrics = entry.state.metrics;
      metrics.callsTotal += 1;
      if (success) {
        metrics.callsSuccess += 1;
      } else {
        metrics.callsFailed += 1;
      }
      // Running average
      metrics.avgResponseMs =
        (metrics.avgResponseMs * (metrics.callsTotal - 1) + durationMs) / metrics.callsTotal;
    }
  }
}

// Singleton
export const registry = new AgentRegistry();

// CLI entry point
if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  const cmd = process.argv[2];
  
  await registry.load();
  
  if (cmd === "list") {
    console.log("\nRegistered Agents:");
    console.log("==================");
    for (const entry of registry.list()) {
      console.log(`  ${entry.manifest.id}: ${entry.manifest.name} [${entry.state.status}]`);
    }
  } else if (cmd === "add" && process.argv[3]) {
    // Load manifest from file
    const manifestPath = process.argv[3];
    const content = await fs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(content) as AgentManifest;
    registry.register(manifest);
    await registry.save();
    console.log(`Added agent: ${manifest.id}`);
  } else if (cmd === "remove" && process.argv[3]) {
    const agentId = process.argv[3];
    if (registry.unregister(agentId)) {
      await registry.save();
      console.log(`Removed agent: ${agentId}`);
    } else {
      console.log(`Agent not found: ${agentId}`);
    }
  } else {
    console.log("Usage: npx tsx src/registry/agentRegistry.ts <list|add|remove> [args]");
  }
}


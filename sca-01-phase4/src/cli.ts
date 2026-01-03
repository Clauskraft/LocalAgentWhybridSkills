/**
 * SCA-01 Phase 4 CLI
 * Agent-Mesh management and orchestration
 */
import fs from "node:fs/promises";
import path from "node:path";
import { registry } from "./registry/agentRegistry.js";
import { orchestrator } from "./orchestrator/meshOrchestrator.js";
import type { AgentManifest } from "./types/agent.js";

function printHelp(): void {
  console.log(`
🔗 SCA-01 Phase 4: Agent-Mesh CLI

Commands:
  registry list              List all registered agents
  registry add <file.json>   Register agent from manifest file
  registry sync              Sync registry from docs/AGENTS.md into JSON
  registry remove <id>       Unregister an agent
  
  mesh start                 Start the mesh orchestrator
  mesh status                Show mesh status
  mesh ping <agentId>        Ping/heartbeat a specific agent (online/offline/degraded + reason)
  mesh tools                 List all tools from all agents
  mesh call <agent> <tool>   Call a tool on an agent
  
  init                       Initialize agent-mesh in current directory

Examples:
  npm run dev -- registry list
  npm run dev -- mesh tools
  npm run dev -- mesh call sca-01-tools read_file '{"path":"README.md"}'
`);
}

async function cmdRegistryList(): Promise<void> {
  await registry.load();
  
  const agents = registry.list();
  
  if (agents.length === 0) {
    console.log("\nNo agents registered.");
    console.log("Use 'registry add <manifest.json>' to register an agent.");
    return;
  }
  
  console.log("\n📋 Registered Agents:");
  console.log("━".repeat(60));
  
  for (const entry of agents) {
    const { manifest, state } = entry;
    const statusEmoji = state.status === "online" ? "🟢" : state.status === "busy" ? "🟡" : "⚫";
    
    console.log(`
${statusEmoji} ${manifest.name} (${manifest.id})
   Version: ${manifest.version}
   Transport: ${manifest.transport}
   Endpoint: ${manifest.endpoint}
   Capabilities: ${manifest.capabilities.map(c => c.name).join(", ")}
   Trust: ${manifest.trustLevel}
   Calls: ${state.metrics.callsSuccess}/${state.metrics.callsTotal}
`);
  }
}

async function cmdRegistryAdd(manifestPath: string): Promise<void> {
  const content = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(content) as AgentManifest;
  
  await registry.load();
  registry.register(manifest);
  await registry.save();
  
  console.log(`✅ Registered agent: ${manifest.name} (${manifest.id})`);
}

async function cmdRegistrySync(): Promise<void> {
  await registry.load();
  await registry.syncFromMarkdown();
  await registry.save();
  console.log(`✅ Synced registry from docs/AGENTS.md`);
}

async function cmdRegistryRemove(agentId: string): Promise<void> {
  await registry.load();
  
  if (registry.unregister(agentId)) {
    await registry.save();
    console.log(`✅ Removed agent: ${agentId}`);
  } else {
    console.log(`❌ Agent not found: ${agentId}`);
    process.exitCode = 1;
  }
}

async function cmdMeshStatus(): Promise<void> {
  await orchestrator.start();
  
  const status = orchestrator.getStatus();
  
  console.log(`
🔗 Mesh Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Agents:  ${status.total}
Online:        ${status.online}
Offline:       ${status.offline}
Connections:   ${status.connections.length > 0 ? status.connections.join(", ") : "(none)"}
`);

  // Per-agent health summary (online/offline/degraded + short reason)
  await registry.load();
  const entries = registry.list();
  if (entries.length > 0) {
    console.log("Agents:");
    for (const e of entries) {
      const s = e.state.status;
      const derived =
        s === "online" ? "online" : s === "offline" ? "offline" : s === "busy" ? "online" : "degraded";
      const reason = e.state.errorMessage ? ` (${e.state.errorMessage})` : "";
      console.log(`  ${e.manifest.id}: ${derived}${reason}`);
    }
  }

  await orchestrator.stop();
}

async function cmdMeshPing(agentId: string): Promise<void> {
  await orchestrator.start();

  const res = await orchestrator.pingAgent(agentId);
  const reason = res.reason ? ` — ${res.reason}` : "";

  console.log(`${res.agentId}: ${res.status} (${res.latencyMs}ms)${reason}`);

  await orchestrator.stop();
}

async function cmdMeshTools(): Promise<void> {
  await orchestrator.start();
  
  const allTools = await orchestrator.listAllTools();
  
  if (allTools.length === 0) {
    console.log("\nNo agents online or no tools available.");
  } else {
    console.log("\n🛠️ Available Tools:");
    console.log("━".repeat(60));
    
    for (const agent of allTools) {
      console.log(`\n📦 ${agent.agentName} (${agent.agentId})`);
      for (const tool of agent.tools) {
        console.log(`   • ${tool.name}`);
        if (tool.description) {
          console.log(`     ${tool.description}`);
        }
      }
    }
  }

  await orchestrator.stop();
}

async function cmdMeshCall(agentId: string, toolName: string, argsJson: string): Promise<void> {
  await orchestrator.start();
  
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson);
  } catch {
    console.error("Invalid JSON arguments");
    process.exitCode = 1;
    await orchestrator.stop();
    return;
  }
  
  console.log(`\n📤 Calling ${toolName} on ${agentId}...`);
  
  const result = await orchestrator.callTool({
    requestId: `cli-${Date.now()}`,
    sourceAgentId: "cli",
    targetAgentId: agentId,
    toolName,
    arguments: args,
  });
  
  if (result.success) {
    console.log(`\n✅ Success (${result.durationMs}ms):`);
    console.log(JSON.stringify(result.content, null, 2));
  } else {
    console.log(`\n❌ Failed (${result.durationMs}ms):`);
    console.log(result.error);
    process.exitCode = 1;
  }

  await orchestrator.stop();
}

async function cmdInit(): Promise<void> {
  const repoRoot = process.cwd();
  
  // Create sample agent manifest
  const sampleManifest: AgentManifest = {
    id: "sca-01-tools",
    name: "SCA-01 Tool Server",
    version: "0.1.0",
    description: "Phase 1 MCP tool server",
    transport: "stdio",
    endpoint: "npx tsx ../sca-01-phase1/src/mcp/toolServer.ts",
    capabilities: [
      { name: "read_handover_log", description: "Read blackboard" },
      { name: "read_file", description: "Read files from repo" },
      { name: "write_file", description: "Write files (requires permission)" },
      { name: "run_make_target", description: "Run make commands" },
    ],
    trustLevel: "local",
    tags: ["tools", "filesystem"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const manifestPath = path.join(repoRoot, "agent-manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(sampleManifest, null, 2), "utf8");
  
  console.log(`
✅ Agent-Mesh initialized!

Created:
  • agent-manifest.json (sample manifest)

Next steps:
  1. Edit agent-manifest.json with your agent details
  2. Register the agent:
     npm run dev -- registry add agent-manifest.json
  3. Start the mesh:
     npm run dev -- mesh status
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const subcmd = args[1];
  
  try {
    if (cmd === "registry" && subcmd === "list") {
      await cmdRegistryList();
    } else if (cmd === "registry" && subcmd === "add" && args[2]) {
      await cmdRegistryAdd(args[2]);
    } else if (cmd === "registry" && subcmd === "sync") {
      await cmdRegistrySync();
    } else if (cmd === "registry" && subcmd === "remove" && args[2]) {
      await cmdRegistryRemove(args[2]);
    } else if (cmd === "mesh" && subcmd === "status") {
      await cmdMeshStatus();
    } else if (cmd === "mesh" && subcmd === "ping" && args[2]) {
      await cmdMeshPing(args[2]);
    } else if (cmd === "mesh" && subcmd === "tools") {
      await cmdMeshTools();
    } else if (cmd === "mesh" && subcmd === "call" && args[2] && args[3]) {
      await cmdMeshCall(args[2], args[3], args[4] ?? "{}");
    } else if (cmd === "init") {
      await cmdInit();
    } else {
      printHelp();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`ERROR: ${msg}`);
    process.exitCode = 1;
  }
}

main().catch(console.error);


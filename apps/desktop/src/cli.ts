#!/usr/bin/env node

import readline from "node:readline";
import { loadConfig } from "./config.js";
import { HyperLog } from "./logging/hyperlog.js";
import { globalApprovalQueue } from "./approval/approvalQueue.js";

// Import agent (will be Phase 2 FinisherAgent)
import { DesktopAgent } from "./agent/DesktopAgent.js";

function printHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  SCA-01 Phase 2 - "The Finisher" Desktop Agent               ║
║  Full PC Access with Approval Gates                          ║
╚══════════════════════════════════════════════════════════════╝

Commands:
  doctor              Check Ollama connectivity and system status
  run [--goal "..."]  Run autonomous agent with full PC access
  chat                Interactive mode
  approve             Interactive approval mode for pending requests
  config              Show current configuration
  help

Environment Variables:
  OLLAMA_HOST         Ollama server URL (default: http://localhost:11434)
  OLLAMA_MODEL        Model name (default: qwen3)
  SCA_FULL_ACCESS     Enable full system access (default: false)
  SCA_AUTO_APPROVE    Auto-approve all operations (default: false)
  SCA_SAFE_DIRS       Comma-separated safe directories
  SCA_LOG_DIR         Log directory (default: ./logs)

Security:
  - Full access mode is DISABLED by default
  - High-risk operations require manual approval unless SCA_AUTO_APPROVE=true
  - All operations are logged to HyperLog for audit

Examples:
  # Read-only exploration (safe)
  npm run dev -- run

  # Full access with approval gates
  SCA_FULL_ACCESS=true npm run dev -- run

  # Full access, auto-approve everything (DANGEROUS)
  SCA_FULL_ACCESS=true SCA_AUTO_APPROVE=true npm run dev -- run
`.trim());
}

async function cmdDoctor(): Promise<void> {
  const cfg = loadConfig();
  const log = new HyperLog(cfg.logDir, "cli.hyperlog.jsonl");

  console.log("\n🔍 SCA-01 Phase 2 System Check\n");

  // Check Ollama
  console.log("Checking Ollama...");
  try {
    const res = await fetch(`${cfg.ollamaHost}/api/version`);
    if (res.ok) {
      const data = (await res.json()) as { version?: string };
      console.log(`  ✅ Ollama: OK (version ${data.version ?? "unknown"})`);
    } else {
      console.log(`  ❌ Ollama: HTTP ${res.status}`);
    }
  } catch (e) {
    console.log(`  ❌ Ollama: ${e instanceof Error ? e.message : "Connection failed"}`);
  }

  // Check configuration
  console.log("\nConfiguration:");
  console.log(`  Full Access:  ${cfg.fullAccess ? "✅ ENABLED" : "❌ Disabled"}`);
  console.log(`  Auto Approve: ${cfg.autoApprove ? "⚠️  ENABLED (DANGEROUS)" : "✅ Disabled (safe)"}`);
  console.log(`  Safe Dirs:    ${cfg.safeDirs.join(", ")}`);
  console.log(`  Max Turns:    ${cfg.maxTurns}`);

  // Check system
  console.log("\nSystem:");
  console.log(`  Platform:     ${process.platform}`);
  console.log(`  Architecture: ${process.arch}`);
  console.log(`  Node.js:      ${process.version}`);

  log.info("cli.doctor", "Doctor check completed", { fullAccess: cfg.fullAccess });
}

async function cmdConfig(): Promise<void> {
  const cfg = loadConfig();
  console.log("\nCurrent Configuration:\n");
  console.log(JSON.stringify(cfg, null, 2));
}

async function cmdApprove(): Promise<void> {
  console.log("\n🔐 SCA-01 Approval Mode\n");
  console.log("Waiting for approval requests...");
  console.log("Commands: [a]pprove, [r]eject, [l]ist, [q]uit\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Listen for new requests
  globalApprovalQueue.on("request", (req) => {
    console.log(`\n⚠️  NEW APPROVAL REQUEST`);
    console.log(`  ID:          ${req.id}`);
    console.log(`  Operation:   ${req.operation}`);
    console.log(`  Description: ${req.description}`);
    console.log(`  Risk Level:  ${req.riskLevel}`);
    console.log(`  Reason:      ${req.policyDecision.reason}`);
    console.log(`\nEnter command: `);
  });

  const prompt = (): void => {
    rl.question("> ", (answer) => {
      const [cmd, ...args] = answer.trim().split(" ");

      switch (cmd?.toLowerCase()) {
        case "a":
        case "approve": {
          const id = args[0];
          if (!id) {
            const pending = globalApprovalQueue.getPending();
            if (pending.length === 0) {
              console.log("No pending requests");
            } else if (pending.length === 1) {
              globalApprovalQueue.approve(pending[0]!.id);
              console.log(`Approved: ${pending[0]!.id}`);
            } else {
              console.log("Multiple pending. Specify ID: approve <id>");
            }
          } else {
            if (globalApprovalQueue.approve(id)) {
              console.log(`Approved: ${id}`);
            } else {
              console.log(`Not found: ${id}`);
            }
          }
          break;
        }
        case "r":
        case "reject": {
          const id = args[0];
          if (!id) {
            const pending = globalApprovalQueue.getPending();
            if (pending.length === 0) {
              console.log("No pending requests");
            } else if (pending.length === 1) {
              globalApprovalQueue.reject(pending[0]!.id);
              console.log(`Rejected: ${pending[0]!.id}`);
            } else {
              console.log("Multiple pending. Specify ID: reject <id>");
            }
          } else {
            if (globalApprovalQueue.reject(id)) {
              console.log(`Rejected: ${id}`);
            } else {
              console.log(`Not found: ${id}`);
            }
          }
          break;
        }
        case "l":
        case "list": {
          const pending = globalApprovalQueue.getPending();
          if (pending.length === 0) {
            console.log("No pending requests");
          } else {
            console.log("\nPending Approvals:");
            for (const req of pending) {
              console.log(`  [${req.id}] ${req.operation}: ${req.description}`);
            }
          }
          break;
        }
        case "q":
        case "quit":
          console.log("Exiting approval mode.");
          rl.close();
          return;
        default:
          console.log("Unknown command. Use: [a]pprove, [r]eject, [l]ist, [q]uit");
      }

      prompt();
    });
  };

  prompt();
}

async function cmdRun(argv: string[]): Promise<void> {
  const cfg = loadConfig();
  const goalIdx = argv.indexOf("--goal");
  const goal = goalIdx !== -1 ? argv[goalIdx + 1] : undefined;

  console.log("\n🚀 Starting SCA-01 Desktop Agent\n");
  console.log(`  Full Access:  ${cfg.fullAccess ? "YES" : "NO"}`);
  console.log(`  Auto Approve: ${cfg.autoApprove ? "YES" : "NO"}`);
  console.log("");

  const agent = new DesktopAgent(cfg);
  const output = await agent.run(goal);

  console.log("\n📋 Agent Output:\n");
  console.log(output);
}

async function cmdChat(): Promise<void> {
  const cfg = loadConfig();

  console.log("\n💬 SCA-01 Interactive Chat Mode\n");
  console.log("Type your goals or questions. Type 'exit' to quit.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const agent = new DesktopAgent(cfg);

  const prompt = (): void => {
    rl.question("You> ", async (input) => {
      const trimmed = input.trim();

      if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
        console.log("\nGoodbye!");
        rl.close();
        return;
      }

      if (!trimmed) {
        prompt();
        return;
      }

      console.log("\nSCA-01 is thinking...\n");

      try {
        const output = await agent.run(trimmed);
        console.log("SCA-01> " + output);
      } catch (e) {
        console.log("Error: " + (e instanceof Error ? e.message : "Unknown error"));
      }

      console.log("");
      prompt();
    });
  };

  prompt();
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0] ?? "help";

  try {
    switch (cmd) {
      case "help":
      case "--help":
      case "-h":
        printHelp();
        break;
      case "doctor":
        await cmdDoctor();
        break;
      case "config":
        await cmdConfig();
        break;
      case "approve":
        await cmdApprove();
        break;
      case "run":
        await cmdRun(argv);
        break;
      case "chat":
        await cmdChat();
        break;
      default:
        printHelp();
        process.exitCode = 2;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`ERROR: ${msg}`);
    process.exitCode = 1;
  }
}

void main();


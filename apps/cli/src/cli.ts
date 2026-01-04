#!/usr/bin/env node

import { loadConfig } from "./config.js";
import { FinisherAgent } from "./agent/FinisherAgent.js";
import { generateFinisherMermaid } from "./agent/finisherStateMachine.js";
import { OllamaChatClient } from "./ollama/ollamaChatClient.js";

function printHelp(): void {
  console.log(`
sca (SCA-01 Phase 1)

Commands:
  doctor              Check Ollama connectivity (GET /api/version)
  run [--goal "..."]  Run autonomous agent loop (reads HANDOVER_LOG etc.)
  chat                Interactive mode (single run per prompt)
  diagram             Print Finisher state machine as Mermaid (stateDiagram-v2)
  help

Environment:
  OLLAMA_HOST, OLLAMA_MODEL
  SCA_REPO_ROOT, SCA_ALLOW_WRITE, SCA_ALLOW_EXEC, SCA_MAX_TURNS, SCA_LOG_DIR
`.trim());
}

function parseFlag(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  const val = argv[idx + 1];
  return typeof val === "string" ? val : undefined;
}

async function cmdDoctor(): Promise<void> {
  const cfg = loadConfig();
  const client = new OllamaChatClient(cfg.ollamaHost);
  const version = await client.getVersion();
  console.log(`Ollama OK. version=${version}`);
}

async function cmdRun(argv: string[]): Promise<void> {
  const cfg = loadConfig();
  const goal = parseFlag(argv, "--goal");
  const agent = new FinisherAgent(cfg);
  const out = await agent.run(goal);
  console.log(out);
}

async function cmdChat(argv: string[]): Promise<void> {
  const cfg = loadConfig();
  const goal = parseFlag(argv, "--goal") ?? "Læs docs/HANDOVER_LOG.md og giv en executive plan for den aktive opgave.";
  const agent = new FinisherAgent(cfg);
  const out = await agent.run(goal);
  console.log(out);
}

async function cmdDiagram(): Promise<void> {
  console.log(generateFinisherMermaid());
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0] ?? "help";

  try {
    if (cmd === "help" || cmd === "--help" || cmd === "-h") {
      printHelp();
      return;
    }
    if (cmd === "doctor") {
      await cmdDoctor();
      return;
    }
    if (cmd === "run") {
      await cmdRun(argv);
      return;
    }
    if (cmd === "chat") {
      await cmdChat(argv);
      return;
    }
    if (cmd === "diagram") {
      await cmdDiagram();
      return;
    }

    printHelp();
    process.exitCode = 2;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`ERROR: ${msg}`);
    process.exitCode = 1;
  }
}

void main();


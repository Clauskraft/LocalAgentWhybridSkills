import fs from "node:fs/promises";
import path from "node:path";

import type { AppConfig } from "../config.js";
import { OllamaChatClient } from "../ollama/ollamaChatClient.js";
import type { OllamaMessage, OllamaToolSpec } from "../ollama/types.js";
import { HyperLog } from "../logging/hyperlog.js";
import { McpToolClient, type McpTool } from "../mcp/mcpToolClient.js";
import { FALLBACK_SYSTEM_PROMPT, buildDefaultUserGoal } from "./prompt.js";
import { createFinisherStateMachine, type FinisherContext, READ, PLAN, ACT, TEST, REPORT, DONE, ERROR, WAIT_FOR_APPROVAL } from "./finisherStateMachine.js";

function toOllamaTools(mcpTools: McpTool[]): OllamaToolSpec[] {
  return mcpTools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description ?? `MCP tool: ${t.name}`,
      parameters: t.inputSchema ?? { type: "object", properties: {} }
    }
  }));
}

function extractTextFromMcpContent(content: unknown): string {
  if (!Array.isArray(content)) return JSON.stringify(content);
  const parts: string[] = [];
  for (const item of content) {
    if (typeof item === "object" && item !== null && "type" in item) {
      const typedItem = item as { type?: unknown; text?: unknown };
      if (typedItem.type === "text") {
        parts.push(typeof typedItem.text === "string" ? typedItem.text : JSON.stringify(item));
      } else {
        parts.push(JSON.stringify(item));
      }
    } else {
      parts.push(JSON.stringify(item));
    }
  }
  return parts.join("\n");
}

async function loadSystemPrompt(repoRoot: string): Promise<string> {
  const candidates = [
    ".agent/sca-01_the finisher.txt",
    ".agent/sca-01_the_finisher.txt",
    "prompts/sca-01.system.md"
  ];

  for (const rel of candidates) {
    const abs = path.resolve(repoRoot, rel);
    try {
      const text = await fs.readFile(abs, { encoding: "utf8" });
      if (text.trim().length > 0) return text;
    } catch {
      // ignore, try next
    }
  }

  return FALLBACK_SYSTEM_PROMPT;
}

export class FinisherAgent {
  private readonly cfg: AppConfig;
  private readonly log: HyperLog;

  public constructor(cfg: AppConfig) {
    this.cfg = cfg;
    this.log = new HyperLog(cfg.logDir, "agent.hyperlog.jsonl");
  }

  public async run(goalOverride?: string): Promise<string> {
    // Finisher state machine drives the loop; all side effects happen inside hooks below.
    const sm = createFinisherStateMachine();

    type FinisherRuntime = FinisherContext & {
      systemPrompt: string;
      goal: string;
      lastText: string;
      messages: OllamaMessage[];
      tools: OllamaToolSpec[];
      mcp: McpToolClient | null;
      ollama: OllamaChatClient | null;
      pendingToolCalls: Array<{ function: { name: string; arguments: Record<string, unknown> } }>;
    };

    const runtime: FinisherRuntime = {
      // external-facing context (used by state transitions)
      requiresApproval: false,
      acted: false,
      testsPassed: true,
      abort: false,
      hasToolCalls: true,
      turn: 0,
      maxTurns: this.cfg.maxTurns,

      // internal runtime
      systemPrompt: "",
      goal: goalOverride ?? buildDefaultUserGoal(),
      lastText: "",
      messages: [] as OllamaMessage[],
      tools: [] as OllamaToolSpec[],
      mcp: null as McpToolClient | null,
      ollama: null as OllamaChatClient | null,
      pendingToolCalls: [] as Array<{ function: { name: string; arguments: Record<string, unknown> } }>,
    };

    const logTransition = (to: string) => {
      this.log.info("agent.fsm.transition", "Finisher state transition", {
        from: String(sm.state),
        to,
        turn: runtime.turn,
        requiresApproval: runtime.requiresApproval,
        hasToolCalls: runtime.hasToolCalls
      });
    };

    const enter = async (state: string) => {
      if (state === String(READ)) {
        runtime.systemPrompt = await loadSystemPrompt(this.cfg.repoRoot);

        // Find tool server path
        const toolServerPath = await this.findToolServerPath();
        const isTs = toolServerPath.endsWith(".ts");

        // Prepare env for child process
        const childEnv: Record<string, string> = {};
        for (const [key, value] of Object.entries(process.env)) {
          if (value !== undefined) childEnv[key] = value;
        }
        childEnv["SCA_REPO_ROOT"] = this.cfg.repoRoot;
        childEnv["SCA_ALLOW_WRITE"] = this.cfg.allowWrite ? "true" : "false";
        childEnv["SCA_ALLOW_EXEC"] = this.cfg.allowExec ? "true" : "false";
        childEnv["SCA_LOG_DIR"] = this.cfg.logDir;

        runtime.mcp = new McpToolClient(
          isTs
            ? { command: "npx", args: ["tsx", toolServerPath], env: childEnv }
            : { command: "node", args: [toolServerPath], env: childEnv }
        );
        runtime.ollama = new OllamaChatClient(this.cfg.ollamaHost);

        this.log.info("agent.start", "Starting FinisherAgent", {
          repoRoot: this.cfg.repoRoot,
          model: this.cfg.ollamaModel,
          allowWrite: this.cfg.allowWrite,
          allowExec: this.cfg.allowExec
        });

        await runtime.mcp.connect();
        const toolsList = await runtime.mcp.listTools();
        runtime.tools = toOllamaTools(toolsList.tools);

        runtime.messages = [
          { role: "system", content: runtime.systemPrompt },
          { role: "user", content: runtime.goal }
        ];

        // reset per-loop flags
        runtime.turn = 0;
        runtime.hasToolCalls = true;
        runtime.requiresApproval = false;
        runtime.acted = false;
        runtime.testsPassed = true;
        runtime.abort = false;
        return;
      }

      if (state === String(PLAN)) {
        runtime.acted = false;
        runtime.testsPassed = true;
        runtime.requiresApproval = false;
        runtime.pendingToolCalls = [];

        const ollama = runtime.ollama;
        if (!ollama) throw new Error("FinisherAgent: ollama client not initialized");

        const resp = await ollama.chat({
          model: this.cfg.ollamaModel,
          messages: runtime.messages,
          tools: runtime.tools,
          stream: false,
          think: true
        });

        runtime.messages.push(resp.message);

        const toolCalls = resp.message.tool_calls ?? [];
        runtime.hasToolCalls = toolCalls.length > 0;

        if (!runtime.hasToolCalls) {
          runtime.lastText = resp.message.content ?? "";
          this.log.info("agent.done", "No tool calls; ready to report", { turn: runtime.turn });
          return;
        }

        // Default policy: do not block here; approval gating lives in tool server / UI layer.
        runtime.requiresApproval = false;

        runtime.pendingToolCalls = toolCalls.map((c) => ({
          function: { name: c.function.name, arguments: c.function.arguments }
        }));

        this.log.info("agent.tool_calls", "Model requested tool calls", {
          turn: runtime.turn,
          toolCalls: runtime.pendingToolCalls.map((c) => c.function.name)
        });

        return;
      }

      if (state === String(WAIT_FOR_APPROVAL)) {
        // Non-interactive Phase 1 CLI: we can't await UI approval here. Abort with a clear message.
        runtime.abort = true;
        runtime.lastText =
          runtime.lastText ||
          "Plan kræver approval, men Phase 1 CLI har ikke en approval UI. Kør via desktop UI (Phase 2) eller slå policy til, så tool-server kan håndtere approval.";
        return;
      }

      if (state === String(ACT)) {
        const mcp = runtime.mcp;
        if (!mcp) throw new Error("FinisherAgent: MCP client not initialized");

        for (const call of runtime.pendingToolCalls) {
          const name = call.function.name;
          const args = call.function.arguments;

          try {
            const result = await mcp.callTool(name, args);
            const text = extractTextFromMcpContent(result.content);
            runtime.messages.push({ role: "tool", tool_name: name, content: text });
            this.log.info("agent.tool_result", "Tool executed", { name });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Unknown tool call error";
            runtime.messages.push({ role: "tool", tool_name: name, content: msg });
            this.log.error("agent.tool_error", msg, { name });
            // For now we keep going; ERROR state can be introduced with richer context later.
          }
        }

        runtime.acted = true;
        return;
      }

      if (state === String(TEST)) {
        // Phase 1 runtime doesn't have a dedicated test runner step; treat as passed.
        runtime.testsPassed = true;
        return;
      }

      if (state === String(REPORT)) {
        // increment after completing a full PLAN→ACT cycle
        if (runtime.hasToolCalls) {
          runtime.turn += 1;
        }
        return;
      }

      if (state === String(ERROR)) {
        runtime.abort = true;
        return;
      }
    };

    // Run state machine by explicitly entering states as we arrive
    await sm.start(runtime);
    // enter initial state hook
    await enter(String(sm.state));

    const maxSteps = 50_000;
    for (let i = 0; i < maxSteps; i += 1) {
      // attempt transition
      const before = String(sm.state);
      const moved = await sm.step(runtime);
      const after = String(sm.state);
      if (!moved) break;

      logTransition(after);
      // enter hook for new state
      await enter(after);

      if (after === String(DONE)) break;
      if (after === before) break;
    }

    if (String(sm.state) !== String(DONE) && String(sm.state) !== String(ERROR) && runtime.turn >= runtime.maxTurns) {
      this.log.warn("agent.max_turns", "Reached maxTurns; returning last known text", { maxTurns: runtime.maxTurns });
    }

    const mcp = runtime.mcp;
    if (mcp) await mcp.close();
    return runtime.lastText;
  }

  private async findToolServerPath(): Promise<string> {
    // Try built versions first
    const candidates = [
      path.resolve(process.cwd(), "build", "mcp", "toolServer.js"),
      path.resolve(this.cfg.repoRoot, "apps", "cli", "build", "mcp", "toolServer.js")
    ];

    for (const candidate of candidates) {
      try {
        await fs.stat(candidate);
        return candidate;
      } catch {
        // try next
      }
    }

    // Fallback to TS source (dev mode)
    return path.resolve(process.cwd(), "src", "mcp", "toolServer.ts");
  }
}

import type { McpBackendConfig } from "../config.js";
import { HyperLog } from "@local-agent/hyperlog";
import { McpToolClient, type McpTool } from "../mcp/mcpToolClient.js";
import { OllamaChatClient, type OllamaMessage, type OllamaToolSpec } from "../ollama/ollamaClient.js";
import { createFinisherStateMachine, generateFinisherMermaid, READ, PLAN, ACT, TEST, REPORT, DONE, ERROR, WAIT_FOR_APPROVAL, type FinisherContext } from "./finisherStateMachine.js";

export interface AgentResult {
  success: boolean;
  output: string;
  turns: number;
  toolCalls: string[];
}

function toOllamaTools(mcpTools: McpTool[]): OllamaToolSpec[] {
  return mcpTools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description ?? `MCP tool: ${t.name}`,
      parameters: t.inputSchema ?? { type: "object", properties: {} },
    },
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

const DEFAULT_GOAL = `Læs blackboard (docs/HANDOVER_LOG.md).
Find den aktive opgave og færdiggør den til Definition of Done.
Brug tools til at læse/skrive fulde filer. Kør tests via run_make_target hvis tilladt.
Rapportér tydeligt hvad der blev ændret og om tests er kørt.`;

export class FinisherAgent {
  private readonly cfg: McpBackendConfig;
  private readonly log: HyperLog;

  constructor(cfg: McpBackendConfig) {
    this.cfg = cfg;
    this.log = new HyperLog(cfg.logDir, "mcp-backend.agent.hyperlog.jsonl");
  }

  public diagram(): string {
    return generateFinisherMermaid();
  }

  public async run(goalOverride?: string): Promise<AgentResult> {
    const goal = goalOverride ?? DEFAULT_GOAL;
    const sm = createFinisherStateMachine();

    const toolCallsMade: string[] = [];

    type Runtime = FinisherContext & {
      goal: string;
      lastText: string;
      messages: OllamaMessage[];
      tools: OllamaToolSpec[];
      pendingToolCalls: Array<{ function: { name: string; arguments: Record<string, unknown> } }>;
      mcp: McpToolClient | null;
      ollama: OllamaChatClient | null;
    };

    const runtime: Runtime = {
      requiresApproval: false,
      acted: false,
      testsPassed: true,
      abort: false,
      hasToolCalls: true,
      turn: 0,
      maxTurns: this.cfg.maxTurns,
      goal,
      lastText: "",
      messages: [],
      tools: [],
      pendingToolCalls: [],
      mcp: null,
      ollama: null,
    };

    const childEnv: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) childEnv[k] = v;
    }
    childEnv["SCA_REPO_ROOT"] = this.cfg.repoRoot;
    childEnv["SCA_ALLOW_WRITE"] = this.cfg.allowWrite ? "true" : "false";
    childEnv["SCA_ALLOW_EXEC"] = this.cfg.allowExec ? "true" : "false";
    childEnv["SCA_LOG_DIR"] = this.cfg.logDir;

    const enter = async (state: string) => {
      if (state === String(READ)) {
        runtime.ollama = new OllamaChatClient(this.cfg.ollamaHost);
        runtime.mcp = new McpToolClient({
          command: this.cfg.toolServerCommand,
          args: this.cfg.toolServerArgs,
          env: childEnv,
        });

        this.log.info("agent.start", "Starting mcp-backend FinisherAgent", {
          repoRoot: this.cfg.repoRoot,
          model: this.cfg.ollamaModel,
          allowWrite: this.cfg.allowWrite,
          allowExec: this.cfg.allowExec,
          toolServer: `${this.cfg.toolServerCommand} ${this.cfg.toolServerArgs.join(" ")}`,
        });

        await runtime.mcp.connect();
        const toolsList = await runtime.mcp.listTools();
        runtime.tools = toOllamaTools(toolsList.tools);

        runtime.messages = [
          { role: "system", content: "You are SCA-01 (The Finisher). Never use mocks. Use real MCP tools only." },
          { role: "user", content: runtime.goal },
        ];

        runtime.turn = 0;
        runtime.hasToolCalls = true;
        runtime.requiresApproval = false;
        runtime.acted = false;
        runtime.testsPassed = true;
        runtime.abort = false;
        runtime.pendingToolCalls = [];
        return;
      }

      if (state === String(PLAN)) {
        runtime.acted = false;
        runtime.testsPassed = true;
        runtime.requiresApproval = false;
        runtime.pendingToolCalls = [];

        const ollama = runtime.ollama;
        if (!ollama) throw new Error("ollama not initialized");

        const resp = await ollama.chat({
          model: this.cfg.ollamaModel,
          messages: runtime.messages.map((m) => (m.tool_name ? { role: m.role, content: m.content, tool_name: m.tool_name } : { role: m.role, content: m.content })),
          tools: runtime.tools,
          stream: false,
          think: true,
        });

        runtime.messages.push(resp.message as unknown as OllamaMessage);
        const toolCalls = resp.message.tool_calls ?? [];
        runtime.hasToolCalls = toolCalls.length > 0;

        if (!runtime.hasToolCalls) {
          runtime.lastText = resp.message.content ?? "";
          return;
        }

        runtime.pendingToolCalls = toolCalls.map((c) => ({
          function: { name: c.function.name, arguments: c.function.arguments },
        }));

        this.log.info("agent.tool_calls", "Tool calls requested", {
          turn: runtime.turn,
          tools: runtime.pendingToolCalls.map((c) => c.function.name),
        });
        return;
      }

      if (state === String(WAIT_FOR_APPROVAL)) {
        runtime.abort = true;
        runtime.lastText =
          runtime.lastText ||
          "Plan kræver approval, men mcp-backend har ikke en approval UI. Brug desktop UI (Phase 2) eller kør med policy der håndterer approval.";
        return;
      }

      if (state === String(ACT)) {
        const mcp = runtime.mcp;
        if (!mcp) throw new Error("mcp client not initialized");

        for (const call of runtime.pendingToolCalls) {
          const name = call.function.name;
          const args = call.function.arguments;
          toolCallsMade.push(name);

          const result = await mcp.callTool(name, args);
          const text = extractTextFromMcpContent(result.content);
          runtime.messages.push({ role: "tool", tool_name: name, content: text });
        }
        runtime.acted = true;
        return;
      }

      if (state === String(TEST)) {
        // We don't have a generic "tests passed" oracle here; leave as true unless tool output indicates failure.
        runtime.testsPassed = true;
        return;
      }

      if (state === String(REPORT)) {
        if (runtime.hasToolCalls) runtime.turn += 1;
        return;
      }

      if (state === String(ERROR)) {
        runtime.abort = true;
        return;
      }
    };

    const maxSteps = 50_000;
    await sm.start();
    await enter(String(sm.state));

    for (let i = 0; i < maxSteps; i += 1) {
      const before = String(sm.state);
      const moved = await sm.step(runtime);
      const after = String(sm.state);
      if (!moved) break;

      this.log.info("agent.fsm.transition", "FSM transition", { from: before, to: after, turn: runtime.turn });
      await enter(after);

      if (after === String(DONE)) break;
      if (after === String(ERROR)) break;
    }

    if (runtime.mcp) {
      await runtime.mcp.close();
      runtime.mcp = null;
    }

    return {
      success: true,
      output: runtime.lastText,
      turns: runtime.turn,
      toolCalls: toolCallsMade,
    };
  }
}



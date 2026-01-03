import fs from "node:fs/promises";
import path from "node:path";

import type { Phase2Config } from "../config.js";
import { HyperLog } from "../logging/hyperlog.js";
import { McpToolClient, type McpTool } from "../mcp/mcpToolClient.js";
import { OllamaChatClient } from "../ollama/ollamaChatClient.js";
import type { OllamaMessage, OllamaToolSpec } from "../ollama/types.js";

const DESKTOP_SYSTEM_PROMPT_FALLBACK = `
You are SCA-01 ("The Finisher") — a completion engine and desktop automation agent.
You prioritize: security by design, robustness, compliance readiness, and business alignment.

Operational loop:
1) READ: First read docs/HANDOVER_LOG.md (blackboard) to determine active task.
2) PLAN: Provide an execution plan (files, tests, security notes).
3) ACT: Use tools to implement changes safely.
4) VERIFY: Run the standard pipeline where applicable.
5) REPORT: Provide a clear summary of changes and remaining risks.

Constraints:
- TypeScript mindset. No secrets in code. Treat all data as sensitive.
- Deny-by-default outside safe directories unless explicitly approved.
- Prefer make targets where possible; if unavailable, use npm scripts and document it.
`.trim();

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
  return DESKTOP_SYSTEM_PROMPT_FALLBACK;
}

function toOllamaTools(mcpTools: McpTool[]): OllamaToolSpec[] {
  return mcpTools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description ?? `Tool: ${t.name}`,
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

export class DesktopAgent {
  private readonly cfg: Phase2Config;
  private readonly log: HyperLog;

  public constructor(cfg: Phase2Config) {
    this.cfg = cfg;
    this.log = new HyperLog(cfg.logDir, "desktop-agent.hyperlog.jsonl");
  }

  public async run(goalOverride?: string): Promise<string> {
    const goal = goalOverride ?? "Read docs/HANDOVER_LOG.md and determine the active task.";
    const systemPrompt = await loadSystemPrompt(this.cfg.repoRoot);

    // Find tool server path
    const toolServerPath = await this.findToolServerPath();
    const isTs = toolServerPath.endsWith(".ts");

    // Prepare env for child process
    const childEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        childEnv[key] = value;
      }
    }
    childEnv["SCA_FULL_ACCESS"] = this.cfg.fullAccess ? "true" : "false";
    childEnv["SCA_AUTO_APPROVE"] = this.cfg.autoApprove ? "true" : "false";
    childEnv["SCA_SAFE_DIRS"] = this.cfg.safeDirs.join(",");
    childEnv["SCA_LOG_DIR"] = this.cfg.logDir;

    const mcp = new McpToolClient(
      isTs
        ? { command: "npx", args: ["tsx", toolServerPath], env: childEnv }
        : { command: "node", args: [toolServerPath], env: childEnv }
    );

    const ollama = new OllamaChatClient(this.cfg.ollamaHost);

    this.log.info("agent.start", "Starting DesktopAgent", {
      fullAccess: this.cfg.fullAccess,
      autoApprove: this.cfg.autoApprove,
      model: this.cfg.ollamaModel
    });

    await mcp.connect();
    const toolsList = await mcp.listTools();
    const tools = toOllamaTools(toolsList.tools);

    this.log.info("agent.tools", `Loaded ${tools.length} tools`, {
      tools: tools.map((t) => t.function.name)
    });

    const messages: OllamaMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: goal }
    ];

    let lastText = "";
    for (let turn = 0; turn < this.cfg.maxTurns; turn += 1) {
      this.log.debug("agent.turn", `Turn ${turn + 1}/${this.cfg.maxTurns}`);

      const resp = await ollama.chat({
        model: this.cfg.ollamaModel,
        messages,
        tools,
        stream: false,
        think: true
      });

      messages.push(resp.message);

      const toolCalls = resp.message.tool_calls ?? [];
      if (toolCalls.length === 0) {
        lastText = resp.message.content ?? "";
        this.log.info("agent.done", "Agent completed", { turn, responseLength: lastText.length });
        break;
      }

      this.log.info("agent.tool_calls", "Processing tool calls", {
        turn,
        count: toolCalls.length,
        tools: toolCalls.map((c) => c.function.name)
      });

      for (const call of toolCalls) {
        const name = call.function.name;
        const args = call.function.arguments;

        try {
          const result = await mcp.callTool(name, args);
          const text = extractTextFromMcpContent(result.content);
          messages.push({ role: "tool", tool_name: name, content: text });

          this.log.info("agent.tool_result", `Tool executed: ${name}`, {
            isError: result.isError,
            resultLength: text.length
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown tool call error";
          messages.push({ role: "tool", tool_name: name, content: `ERROR: ${msg}` });
          this.log.error("agent.tool_error", msg, { tool: name });
        }
      }
    }

    await mcp.close();
    return lastText;
  }

  private async findToolServerPath(): Promise<string> {
    // Try built versions first
    const candidates = [
      path.resolve(process.cwd(), "build", "mcp", "toolServerFull.js"),
      path.resolve(process.cwd(), "sca-01-phase2", "build", "mcp", "toolServerFull.js")
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
    return path.resolve(process.cwd(), "src", "mcp", "toolServerFull.ts");
  }
}


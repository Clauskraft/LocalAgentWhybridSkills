import fs from "node:fs/promises";
import path from "node:path";

import type { AppConfig } from "../config.js";
import { OllamaChatClient } from "../ollama/ollamaChatClient.js";
import type { OllamaMessage, OllamaToolSpec } from "../ollama/types.js";
import { HyperLog } from "../logging/hyperlog.js";
import { McpToolClient, type McpTool } from "../mcp/mcpToolClient.js";
import { FALLBACK_SYSTEM_PROMPT, buildDefaultUserGoal } from "./prompt.js";

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
    const systemPrompt = await loadSystemPrompt(this.cfg.repoRoot);
    const goal = goalOverride ?? buildDefaultUserGoal();

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
    childEnv["SCA_REPO_ROOT"] = this.cfg.repoRoot;
    childEnv["SCA_ALLOW_WRITE"] = this.cfg.allowWrite ? "true" : "false";
    childEnv["SCA_ALLOW_EXEC"] = this.cfg.allowExec ? "true" : "false";
    childEnv["SCA_LOG_DIR"] = this.cfg.logDir;

    const mcp = new McpToolClient(
      isTs
        ? { command: "npx", args: ["tsx", toolServerPath], env: childEnv }
        : { command: "node", args: [toolServerPath], env: childEnv }
    );

    const ollama = new OllamaChatClient(this.cfg.ollamaHost);

    this.log.info("agent.start", "Starting FinisherAgent", {
      repoRoot: this.cfg.repoRoot,
      model: this.cfg.ollamaModel,
      allowWrite: this.cfg.allowWrite,
      allowExec: this.cfg.allowExec
    });

    await mcp.connect();
    const toolsList = await mcp.listTools();
    const tools = toOllamaTools(toolsList.tools);

    const messages: OllamaMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: goal }
    ];

    let lastText = "";
    for (let turn = 0; turn < this.cfg.maxTurns; turn += 1) {
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
        this.log.info("agent.done", "No tool calls; returning final response", { turn });
        break;
      }

      this.log.info("agent.tool_calls", "Model requested tool calls", {
        turn,
        toolCalls: toolCalls.map((c) => c.function.name)
      });

      for (const call of toolCalls) {
        const name = call.function.name;
        const args = call.function.arguments;

        try {
          const result = await mcp.callTool(name, args);
          const text = extractTextFromMcpContent(result.content);
          messages.push({ role: "tool", tool_name: name, content: text });

          this.log.info("agent.tool_result", "Tool executed", { name });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown tool call error";
          messages.push({ role: "tool", tool_name: name, content: msg });
          this.log.error("agent.tool_error", msg, { name });
        }
      }
    }

    await mcp.close();
    return lastText;
  }

  private async findToolServerPath(): Promise<string> {
    // Try built versions first
    const candidates = [
      path.resolve(process.cwd(), "build", "mcp", "toolServer.js"),
      path.resolve(this.cfg.repoRoot, "sca-01-phase1", "build", "mcp", "toolServer.js")
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

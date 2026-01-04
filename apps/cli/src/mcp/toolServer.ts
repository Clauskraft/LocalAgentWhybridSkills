import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { HyperLog } from "../logging/hyperlog.js";
import { resolveWithinRepo } from "../security/pathPolicy.js";

interface ToolServerPolicy {
  repoRootAbs: string;
  allowWrite: boolean;
  allowExec: boolean;
  maxFileBytes: number;
  log: HyperLog;
}

function getPolicy(): ToolServerPolicy {
  const repoRootAbs = path.resolve(process.env["SCA_REPO_ROOT"] ?? process.cwd());
  const allowWrite = (process.env["SCA_ALLOW_WRITE"] ?? "false").toLowerCase() === "true";
  const allowExec = (process.env["SCA_ALLOW_EXEC"] ?? "false").toLowerCase() === "true";
  const maxFileBytes = 1_000_000;

  const logDir = process.env["SCA_LOG_DIR"] ?? "./logs";
  const log = new HyperLog(logDir, "toolserver.hyperlog.jsonl");

  return { repoRootAbs, allowWrite, allowExec, maxFileBytes, log };
}

async function readTextFile(policy: ToolServerPolicy, requestedPath: string): Promise<string> {
  const { absPath } = resolveWithinRepo({ repoRootAbs: policy.repoRootAbs }, requestedPath);
  const stat = await fs.stat(absPath);
  if (stat.size > policy.maxFileBytes) {
    throw new Error(`File too large (${stat.size} bytes): ${requestedPath}`);
  }
  return await fs.readFile(absPath, { encoding: "utf8" });
}

async function writeTextFile(policy: ToolServerPolicy, requestedPath: string, content: string): Promise<void> {
  if (!policy.allowWrite) throw new Error("Write is disabled (SCA_ALLOW_WRITE=false)");

  const { absPath } = resolveWithinRepo({ repoRootAbs: policy.repoRootAbs }, requestedPath);
  const dir = path.dirname(absPath);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(absPath, content, { encoding: "utf8" });
}

async function appendTextFile(policy: ToolServerPolicy, requestedPath: string, content: string): Promise<void> {
  if (!policy.allowWrite) throw new Error("Write is disabled (SCA_ALLOW_WRITE=false)");

  const { absPath } = resolveWithinRepo({ repoRootAbs: policy.repoRootAbs }, requestedPath);
  const dir = path.dirname(absPath);
  await fs.mkdir(dir, { recursive: true });

  await fs.appendFile(absPath, content, { encoding: "utf8" });
}

type MakeTarget = "mvp" | "test" | "audit" | "release";

interface MakeResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

async function runMake(policy: ToolServerPolicy, target: MakeTarget): Promise<MakeResult> {
  if (!policy.allowExec) throw new Error("Exec is disabled (SCA_ALLOW_EXEC=false)");

  return await new Promise((resolve, reject) => {
    const child = spawn("make", [target], {
      cwd: policy.repoRootAbs,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeoutMs = 10 * 60 * 1000;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      resolve({ exitCode: code, stdout, stderr, timedOut });
    });
  });
}

export async function main(): Promise<void> {
  const policy = getPolicy();

  const server = new McpServer({ name: "sca-01-tools", version: "0.1.0" });

  server.tool(
    "read_handover_log",
    "Reads docs/HANDOVER_LOG.md from the repo root",
    {},
    async () => {
      try {
        const text = await readTextFile(policy, "docs/HANDOVER_LOG.md");
        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        policy.log.error("tool.read_handover_log", msg);
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    }
  );

  server.tool(
    "read_file",
    "Reads a text file (utf8) relative to repo root. Blocks .env, .git, node_modules.",
    {
      path: z.string().min(1).describe("Path relative to repo root, e.g. docs/README.md")
    },
    async ({ path: requestedPath }) => {
      try {
        const text = await readTextFile(policy, requestedPath);
        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        policy.log.error("tool.read_file", msg, { requestedPath });
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    }
  );

  server.tool(
    "write_file",
    "Writes a full text file relative to repo root (disabled unless SCA_ALLOW_WRITE=true).",
    {
      path: z.string().min(1).describe("Path relative to repo root"),
      content: z.string().describe("Full file content (no snippets)")
    },
    async ({ path: requestedPath, content }) => {
      try {
        await writeTextFile(policy, requestedPath, content);
        return { content: [{ type: "text" as const, text: `Wrote file: ${requestedPath}` }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        policy.log.error("tool.write_file", msg, { requestedPath });
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    }
  );

  server.tool(
    "append_file",
    "Appends text to a file relative to repo root (disabled unless SCA_ALLOW_WRITE=true).",
    {
      path: z.string().min(1).describe("Path relative to repo root"),
      content: z.string().describe("Text to append")
    },
    async ({ path: requestedPath, content }) => {
      try {
        await appendTextFile(policy, requestedPath, content);
        return { content: [{ type: "text" as const, text: `Appended file: ${requestedPath}` }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        policy.log.error("tool.append_file", msg, { requestedPath });
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    }
  );

  server.tool(
    "run_make_target",
    "Runs a safe allowlisted make target (disabled unless SCA_ALLOW_EXEC=true).",
    {
      target: z.enum(["mvp", "test", "audit", "release"]).describe("Make target to run")
    },
    async ({ target }) => {
      try {
        const result = await runMake(policy, target);
        const summary = [
          `make ${target}`,
          `exitCode=${String(result.exitCode)}`,
          `timedOut=${String(result.timedOut)}`,
          "",
          "STDOUT:",
          result.stdout,
          "",
          "STDERR:",
          result.stderr
        ].join("\n");
        return {
          content: [{ type: "text" as const, text: summary }],
          isError: result.exitCode !== 0 || result.timedOut
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        policy.log.error("tool.run_make_target", msg, { target });
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    }
  );

  server.tool(
    "toolserver_info",
    "Returns policy and repoRoot info (no secrets).",
    {},
    async () => {
      const info = {
        repoRootAbs: policy.repoRootAbs,
        allowWrite: policy.allowWrite,
        allowExec: policy.allowExec,
        maxFileBytes: policy.maxFileBytes
      };
      return { content: [{ type: "text" as const, text: JSON.stringify(info, null, 2) }] };
    }
  );

  // Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Run if executed directly
main().catch((err: unknown) => {
  console.error("Tool server failed:", err);
  process.exit(1);
});

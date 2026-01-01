import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { loadConfig } from "../config.js";
import { HyperLog } from "../logging/hyperlog.js";
import type { PolicyContext } from "../security/policy.js";

// Tool implementations
import { executeShell } from "../tools/shellTools.js";
import {
  readFileAnywhere,
  writeFileAnywhere,
  listDirectory,
  getFileInfo,
  searchFiles
} from "../tools/fileTools.js";
import {
  getSystemInfo,
  getNetworkInterfaces,
  getEnvironmentVariables,
  listProcesses,
  killProcess,
  startProcess
} from "../tools/systemTools.js";
import { readClipboard, writeClipboard } from "../tools/clipboardTools.js";
import { openUrl, httpRequest, takeScreenshot } from "../tools/browserTools.js";
import {
  checkPort,
  checkConnectivity,
  getPublicIp,
  getLocalIps,
  scanPorts
} from "../tools/networkTools.js";

function getContext(): { ctx: PolicyContext; log: HyperLog } {
  const cfg = loadConfig();
  const log = new HyperLog(cfg.logDir, "toolserver.hyperlog.jsonl");

  const ctx: PolicyContext = {
    fullAccess: cfg.fullAccess,
    autoApprove: cfg.autoApprove,
    safeDirs: cfg.safeDirs
  };

  return { ctx, log };
}

export async function main(): Promise<void> {
  const { ctx, log } = getContext();
  const cfg = loadConfig();

  log.info("toolserver.start", "Starting Phase 2 MCP Tool Server", {
    fullAccess: ctx.fullAccess,
    autoApprove: ctx.autoApprove,
    safeDirs: ctx.safeDirs
  });

  const server = new McpServer({
    name: "sca-01-tools-full",
    version: "0.2.0"
  });

  // ========== FILE TOOLS ==========

  server.tool(
    "read_file",
    "Read any file on the system (policy enforced)",
    {
      path: z.string().describe("Absolute or relative file path")
    },
    async ({ path: filePath }) => {
      const result = await readFileAnywhere(filePath, ctx, log, cfg.maxFileSize);
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      return { content: [{ type: "text" as const, text: result.content ?? "" }] };
    }
  );

  server.tool(
    "write_file",
    "Write a file anywhere on the system (approval may be required)",
    {
      path: z.string().describe("Absolute or relative file path"),
      content: z.string().describe("Full file content")
    },
    async ({ path: filePath, content }) => {
      const result = await writeFileAnywhere(filePath, content, ctx, log);
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      return { content: [{ type: "text" as const, text: `Wrote file: ${filePath}` }] };
    }
  );

  server.tool(
    "list_directory",
    "List contents of a directory",
    {
      path: z.string().describe("Directory path"),
      recursive: z.boolean().optional().describe("List recursively")
    },
    async ({ path: dirPath, recursive }) => {
      const result = await listDirectory(dirPath, ctx, log, { recursive });
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      const formatted = result.entries?.map((e) =>
        `${e.isDirectory ? "[DIR]" : "[FILE]"} ${e.name} ${e.isFile ? `(${e.size} bytes)` : ""}`
      ).join("\n") ?? "";
      return { content: [{ type: "text" as const, text: formatted }] };
    }
  );

  server.tool(
    "file_info",
    "Get detailed information about a file",
    {
      path: z.string().describe("File path")
    },
    async ({ path: filePath }) => {
      const result = await getFileInfo(filePath, ctx, log);
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(result.info, null, 2) }] };
    }
  );

  server.tool(
    "search_files",
    "Search for files by name pattern",
    {
      directory: z.string().describe("Directory to search in"),
      pattern: z.string().describe("Regex pattern to match file names"),
      maxResults: z.number().optional().describe("Maximum results (default 100)")
    },
    async ({ directory, pattern, maxResults }) => {
      const result = await searchFiles(directory, pattern, ctx, log, maxResults);
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      return { content: [{ type: "text" as const, text: result.files?.join("\n") ?? "" }] };
    }
  );

  // ========== SHELL TOOLS ==========

  server.tool(
    "run_shell",
    "Execute a shell command (auto-selects shell based on OS)",
    {
      command: z.string().describe("Command to execute"),
      cwd: z.string().optional().describe("Working directory"),
      timeout: z.number().optional().describe("Timeout in milliseconds")
    },
    async ({ command, cwd, timeout }) => {
      const result = await executeShell(command, { cwd, timeout, shell: "auto" }, ctx, log);
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      const output = [
        `Exit code: ${result.result?.exitCode}`,
        `Duration: ${result.result?.duration}ms`,
        result.result?.timedOut ? "TIMED OUT" : "",
        "",
        "STDOUT:",
        result.result?.stdout ?? "",
        "",
        "STDERR:",
        result.result?.stderr ?? ""
      ].join("\n");
      return {
        content: [{ type: "text" as const, text: output }],
        isError: result.result?.exitCode !== 0
      };
    }
  );

  server.tool(
    "run_powershell",
    "Execute a PowerShell command (Windows)",
    {
      command: z.string().describe("PowerShell command"),
      cwd: z.string().optional().describe("Working directory")
    },
    async ({ command, cwd }) => {
      const result = await executeShell(command, { cwd, shell: "powershell" }, ctx, log);
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      return {
        content: [{ type: "text" as const, text: result.result?.stdout ?? "" }],
        isError: result.result?.exitCode !== 0
      };
    }
  );

  // ========== SYSTEM TOOLS ==========

  server.tool(
    "system_info",
    "Get system information (CPU, memory, OS, etc.)",
    {},
    async () => {
      const info = getSystemInfo();
      return { content: [{ type: "text" as const, text: JSON.stringify(info, null, 2) }] };
    }
  );

  server.tool(
    "network_interfaces",
    "Get network interface information",
    {},
    async () => {
      const interfaces = getNetworkInterfaces();
      return { content: [{ type: "text" as const, text: JSON.stringify(interfaces, null, 2) }] };
    }
  );

  server.tool(
    "environment_vars",
    "List environment variables (sensitive values redacted)",
    {
      filter: z.string().optional().describe("Regex filter for variable names")
    },
    async ({ filter }) => {
      const vars = getEnvironmentVariables(filter);
      return { content: [{ type: "text" as const, text: JSON.stringify(vars, null, 2) }] };
    }
  );

  server.tool(
    "list_processes",
    "List running processes",
    {},
    async () => {
      const result = await listProcesses(ctx, log);
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      const formatted = result.processes?.slice(0, 50).map((p) =>
        `${p.pid}\t${p.name}\tCPU: ${p.cpu ?? 0}%\tMem: ${p.memory ?? 0}`
      ).join("\n") ?? "";
      return { content: [{ type: "text" as const, text: formatted }] };
    }
  );

  server.tool(
    "kill_process",
    "Terminate a process (approval required)",
    {
      pid: z.number().describe("Process ID"),
      name: z.string().describe("Process name (for logging)")
    },
    async ({ pid, name }) => {
      const result = await killProcess(pid, name, ctx, log);
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      return { content: [{ type: "text" as const, text: `Killed process ${name} (PID: ${pid})` }] };
    }
  );

  // ========== CLIPBOARD TOOLS ==========

  server.tool(
    "clipboard_read",
    "Read current clipboard content",
    {},
    async () => {
      const result = await readClipboard(ctx, log);
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      return { content: [{ type: "text" as const, text: result.content ?? "" }] };
    }
  );

  server.tool(
    "clipboard_write",
    "Write to clipboard (approval may be required)",
    {
      content: z.string().describe("Content to copy to clipboard")
    },
    async ({ content }) => {
      const result = await writeClipboard(content, ctx, log);
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      return { content: [{ type: "text" as const, text: "Content copied to clipboard" }] };
    }
  );

  // ========== BROWSER/NETWORK TOOLS ==========

  server.tool(
    "open_url",
    "Open a URL in the default browser",
    {
      url: z.string().describe("URL to open")
    },
    async ({ url }) => {
      const result = await openUrl(url, ctx, log);
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      return { content: [{ type: "text" as const, text: `Opened: ${url}` }] };
    }
  );

  server.tool(
    "http_request",
    "Make an HTTP request",
    {
      url: z.string().describe("URL to request"),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional().describe("HTTP method"),
      body: z.string().optional().describe("Request body"),
      headers: z.record(z.string()).optional().describe("Request headers")
    },
    async ({ url, method, body, headers }) => {
      const result = await httpRequest(url, method ?? "GET", body, headers, ctx, log);
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      return {
        content: [{ type: "text" as const, text: `Status: ${result.status}\n\n${result.body}` }]
      };
    }
  );

  server.tool(
    "check_port",
    "Check if a port is open on a host",
    {
      host: z.string().describe("Hostname or IP"),
      port: z.number().describe("Port number")
    },
    async ({ host, port }) => {
      const result = await checkPort(host, port, 5000, ctx, log);
      return {
        content: [{
          type: "text" as const,
          text: `${host}:${port} - ${result.open ? "OPEN" : "CLOSED"}${result.latency ? ` (${result.latency}ms)` : ""}`
        }]
      };
    }
  );

  server.tool(
    "check_connectivity",
    "Check internet and DNS connectivity",
    {},
    async () => {
      const result = await checkConnectivity(log);
      return {
        content: [{
          type: "text" as const,
          text: `Internet: ${result.internet ? "OK" : "FAIL"}\nDNS: ${result.dns ? "OK" : "FAIL"}\nLatency: ${result.latency ?? "N/A"}ms`
        }]
      };
    }
  );

  server.tool(
    "get_local_ips",
    "Get local IP addresses",
    {},
    async () => {
      const ips = getLocalIps();
      return { content: [{ type: "text" as const, text: ips.join("\n") }] };
    }
  );

  server.tool(
    "screenshot",
    "Take a screenshot of the screen",
    {
      output: z.string().describe("Output file path")
    },
    async ({ output }) => {
      const result = await takeScreenshot(output, undefined, ctx, log);
      if (result.error) {
        return { content: [{ type: "text" as const, text: result.error }], isError: true };
      }
      return { content: [{ type: "text" as const, text: `Screenshot saved: ${result.path}` }] };
    }
  );

  // ========== APPROVAL TOOLS ==========

  server.tool(
    "approval_status",
    "Get pending approval requests",
    {},
    async () => {
      const { globalApprovalQueue } = await import("../approval/approvalQueue.js");
      const pending = globalApprovalQueue.getPending();
      if (pending.length === 0) {
        return { content: [{ type: "text" as const, text: "No pending approvals" }] };
      }
      const formatted = pending.map((r) =>
        `[${r.id}] ${r.operation}: ${r.description} (${r.riskLevel})`
      ).join("\n");
      return { content: [{ type: "text" as const, text: formatted }] };
    }
  );

  // ========== TOOLSERVER INFO ==========

  server.tool(
    "toolserver_info",
    "Get tool server configuration and status",
    {},
    async () => {
      const info = {
        version: "0.2.0",
        phase: 2,
        fullAccess: ctx.fullAccess,
        autoApprove: ctx.autoApprove,
        safeDirs: ctx.safeDirs,
        platform: process.platform,
        arch: process.arch
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


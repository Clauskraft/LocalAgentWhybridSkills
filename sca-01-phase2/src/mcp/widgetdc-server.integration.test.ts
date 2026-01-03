/**
 * NOTE:
 * If VS Code shows a phantom "Duplicate identifier 'fs'" error here, it is almost always a stale TS server/editor buffer.
 * This file intentionally has exactly ONE `fs` import.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { execa } from "execa";

import { McpToolClient } from "./mcpToolClient.js";

function tsxNodeArgs(): { command: string; argsPrefix: string[] } {
  const cli = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  return {
    command: process.execPath,
    argsPrefix: [cli],
  };
}

function writeDummyMcpServer(filePath: string): void {
  const code = `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "dummy-widgetdc", version: "0.0.0" });

server.tool("widgetdc.ping", "Ping WidgetDC dummy server", { input: z.string().optional() }, async () => {
  return { content: [{ type: "text", text: "pong" }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
`;
  fs.writeFileSync(filePath, code, "utf8");
}

describe("widgetdc-server shim (integration)", () => {
  it("spawns the configured WidgetDC MCP server and proxies MCP over stdio", async () => {
    // Must live under this project so Node can resolve `@modelcontextprotocol/sdk` via parent `node_modules/`.
    fs.mkdirSync(path.join(process.cwd(), "build"), { recursive: true });
    const tmpRoot = fs.mkdtempSync(path.join(process.cwd(), "build", "tmp-widgetdc-"));
    const cfgDir = path.join(tmpRoot, "config");
    fs.mkdirSync(cfgDir, { recursive: true });

    const dummyServerPath = path.join(tmpRoot, "dummy-widgetdc.mjs");
    writeDummyMcpServer(dummyServerPath);

    const integrationsPath = path.join(cfgDir, "integrations.json");
    fs.writeFileSync(
      integrationsPath,
      JSON.stringify(
        {
          widgetdc: {
            cyberstreams: { enabled: true, serverPath: dummyServerPath },
            cockpit: { enabled: false, url: "http://localhost:3456" },
            cloudflare: { enabled: false, workerUrl: "https://example.invalid" },
          },
        },
        null,
        2
      ),
      "utf8"
    );

    const client = new McpToolClient({
      command: tsxNodeArgs().command,
      args: [...tsxNodeArgs().argsPrefix, "src/mcp/widgetdc-server.ts"],
      env: {
        ...process.env,
        SCA_CONFIG_DIR: cfgDir,
      },
    });

    await client.connect();
    const tools = await client.listTools();
    expect(tools.tools.some((t) => t.name === "widgetdc.ping")).toBe(true);

    const res = await client.callTool("widgetdc.ping", {});
    // SDK returns structured content; we just assert it isn't an error and contains "pong".
    expect(res.isError).toBeFalsy();
    expect(JSON.stringify(res.content)).toContain("pong");

    await client.close();
  }, 30_000);

  it("(smoke) fails with a clear error when WidgetDC is not configured", async () => {
    fs.mkdirSync(path.join(process.cwd(), "build"), { recursive: true });
    const tmpRoot = fs.mkdtempSync(path.join(process.cwd(), "build", "tmp-widgetdc-empty-"));
    const cfgDir = path.join(tmpRoot, "config");
    fs.mkdirSync(cfgDir, { recursive: true });

    const { command, argsPrefix } = tsxNodeArgs();
    const result = await execa(command, [...argsPrefix, "src/mcp/widgetdc-server.ts"], {
      env: {
        ...process.env,
        SCA_CONFIG_DIR: cfgDir,
      },
      reject: false,
      timeout: 10_000,
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("not configured");
  });
});



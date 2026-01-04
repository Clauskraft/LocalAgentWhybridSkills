import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getIntegrationManager } from "../config/integrationConfig.js";

function resolveConfigDir(): string {
  // Allows tests / packaged app to control where `integrations.json` is loaded from.
  return process.env.SCA_CONFIG_DIR ?? "./config";
}

function resolveCyberstreamsServerPath(): string | undefined {
  const configDir = resolveConfigDir();
  const manager = getIntegrationManager(configDir);
  const cfg = manager.getConfig();

  const fromEnv = process.env.WIDGETDC_CYBERSTREAMS_SERVER_PATH;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) return fromEnv.trim();

  const fromConfig =
    cfg.widgetdc?.cyberstreams?.enabled === true ? cfg.widgetdc.cyberstreams.serverPath : undefined;
  if (typeof fromConfig === "string" && fromConfig.trim().length > 0) return fromConfig.trim();

  return undefined;
}

function resolveCockpitUrl(): string | undefined {
  const configDir = resolveConfigDir();
  const manager = getIntegrationManager(configDir);
  const cfg = manager.getConfig();

  const fromEnv = process.env.WIDGETDC_COCKPIT_URL;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) return fromEnv.trim();

  const fromConfig = cfg.widgetdc?.cockpit?.enabled === true ? cfg.widgetdc.cockpit.url : undefined;
  if (typeof fromConfig === "string" && fromConfig.trim().length > 0) return fromConfig.trim();

  return undefined;
}

function resolveWorkerUrl(): string | undefined {
  const configDir = resolveConfigDir();
  const manager = getIntegrationManager(configDir);
  const cfg = manager.getConfig();

  const fromEnv = process.env.WIDGETDC_WORKER_URL;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) return fromEnv.trim();

  const fromConfig =
    cfg.widgetdc?.cloudflare?.enabled === true ? cfg.widgetdc.cloudflare.workerUrl : undefined;
  if (typeof fromConfig === "string" && fromConfig.trim().length > 0) return fromConfig.trim();

  return undefined;
}

function buildChildEnv(): NodeJS.ProcessEnv {
  const configDir = resolveConfigDir();
  const manager = getIntegrationManager(configDir);
  const cfg = manager.getConfig();

  const env: NodeJS.ProcessEnv = { ...process.env };

  if (cfg.widgetdc?.cockpit?.enabled && cfg.widgetdc.cockpit.url) {
    env.WIDGETDC_COCKPIT_URL = cfg.widgetdc.cockpit.url;
  }
  if (cfg.widgetdc?.cloudflare?.enabled && cfg.widgetdc.cloudflare.workerUrl) {
    env.WIDGETDC_WORKER_URL = cfg.widgetdc.cloudflare.workerUrl;
  }
  env.SCA_CONFIG_DIR = configDir;

  return env;
}

function assertSafeRelativePath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) throw new Error('path must start with "/"');
  if (trimmed.includes("..")) throw new Error('path must not contain ".."');
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) throw new Error("path must be relative (no scheme)");
  return trimmed;
}

async function httpRequestTool(params: {
  baseUrl: string;
  label: string;
  path: string;
  method?: "GET" | "POST";
  query?: Record<string, string>;
  body?: unknown;
}): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const base = new URL(params.baseUrl);
  const safePath = assertSafeRelativePath(params.path);
  const url = new URL(safePath, base);

  // Enforce same-origin with base URL (no redirects to other origins via crafted paths).
  if (url.origin !== base.origin) {
    throw new Error(`${params.label}: computed URL origin mismatch`);
  }

  if (params.query) {
    for (const [k, v] of Object.entries(params.query)) {
      url.searchParams.set(k, v);
    }
  }

  const method = params.method ?? "GET";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url.toString(), {
      method,
      headers: method === "POST" ? { "content-type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(params.body ?? null) : undefined,
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") ?? "";
    const bodyText =
      contentType.includes("application/json") ? JSON.stringify(await res.json()) : await res.text();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              url: url.toString(),
              status: res.status,
              ok: res.ok,
              contentType,
              body: bodyText,
            },
            null,
            2
          ),
        },
      ],
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runNativeWidgetdcMcpServer(): Promise<void> {
  const cockpitUrl = resolveCockpitUrl();
  const workerUrl = resolveWorkerUrl();

  const server = new McpServer({ name: "sca-widgetdc-native", version: "0.0.0" });

  // Status tool (useful for debugging from the UI).
  server.tool("widgetdc.status", "Get the resolved WidgetDC integration status", {}, async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              mode: "native-http",
              cockpitUrl: cockpitUrl ?? null,
              workerUrl: workerUrl ?? null,
            },
            null,
            2
          ),
        },
      ],
    };
  });
  // Alias for naming consistency with "WidgetTDC" phrasing used in some docs/conversations.
  server.tool("widgettdc.status", "Alias of widgetdc.status", {}, async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              mode: "native-http",
              cockpitUrl: cockpitUrl ?? null,
              workerUrl: workerUrl ?? null,
            },
            null,
            2
          ),
        },
      ],
    };
  });

  if (cockpitUrl) {
    server.tool(
      "widgetdc.cockpit.request",
      "Perform a safe HTTP request against the configured WidgetDC Cockpit base URL",
      {
        path: z.string(),
        method: z.enum(["GET", "POST"]).optional(),
        query: z.record(z.string()).optional(),
        body: z.unknown().optional(),
      },
      async (args) =>
        httpRequestTool({
          baseUrl: cockpitUrl,
          label: "cockpit",
          path: args.path,
          method: args.method,
          query: args.query,
          body: args.body,
        })
    );

    // WidgetTDC alias (native HTTP mode only).
    server.tool(
      "widgettdc.cockpit.request",
      "Alias of widgetdc.cockpit.request",
      {
        path: z.string(),
        method: z.enum(["GET", "POST"]).optional(),
        query: z.record(z.string()).optional(),
        body: z.unknown().optional(),
      },
      async (args) =>
        httpRequestTool({
          baseUrl: cockpitUrl,
          label: "cockpit",
          path: args.path,
          method: args.method,
          query: args.query,
          body: args.body,
        })
    );
  }

  if (workerUrl) {
    server.tool(
      "widgetdc.worker.request",
      "Perform a safe HTTP request against the configured WidgetDC Cloudflare Worker base URL",
      {
        path: z.string(),
        method: z.enum(["GET", "POST"]).optional(),
        query: z.record(z.string()).optional(),
        body: z.unknown().optional(),
      },
      async (args) =>
        httpRequestTool({
          baseUrl: workerUrl,
          label: "worker",
          path: args.path,
          method: args.method,
          query: args.query,
          body: args.body,
        })
    );

    // WidgetTDC alias (native HTTP mode only).
    server.tool(
      "widgettdc.worker.request",
      "Alias of widgetdc.worker.request",
      {
        path: z.string(),
        method: z.enum(["GET", "POST"]).optional(),
        query: z.record(z.string()).optional(),
        body: z.unknown().optional(),
      },
      async (args) =>
        httpRequestTool({
          baseUrl: workerUrl,
          label: "worker",
          path: args.path,
          method: args.method,
          query: args.query,
          body: args.body,
        })
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function main(): Promise<void> {
  const serverPath = resolveCyberstreamsServerPath();
  if (!serverPath) {
    const cockpitUrl = resolveCockpitUrl();
    const workerUrl = resolveWorkerUrl();

    if (cockpitUrl || workerUrl) {
      // Native mode: expose minimal HTTP-backed tools when no external MCP server is configured.
      await runNativeWidgetdcMcpServer();
      return;
    }

    // Important: keep this error message concise—it's surfaced in the desktop UI.
    console.error(
      [
        "WidgetDC core server is not configured.",
        "Set WIDGETDC_CYBERSTREAMS_SERVER_PATH or configure config/integrations.json:",
        '  { "widgetdc": { "cyberstreams": { "enabled": true, "serverPath": "C:/path/to/mcp-server.js" } } }',
      ].join("\n")
    );
    process.exit(1);
  }

  const resolved = path.resolve(serverPath);
  if (!fs.existsSync(resolved)) {
    console.error(`WidgetDC core serverPath does not exist: ${resolved}`);
    process.exit(1);
  }

  // Spawn the real WidgetDC MCP server and fully forward stdio (MCP speaks over stdio).
  const child = spawn(process.execPath, [resolved], {
    stdio: "inherit",
    env: buildChildEnv(),
  });

  child.on("exit", (code) => process.exit(code ?? 1));
  child.on("error", (err) => {
    console.error(`Failed to start WidgetDC MCP server: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}

// Entrypoint wrapper: this file is meant to be executed, not imported.
// (We intentionally run unconditionally so `tsx src/mcp/widgetdc-server.ts` works in dev/tests.)
main().catch((err) => {
  console.error(err);
  process.exit(1);
});



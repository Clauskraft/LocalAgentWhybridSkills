import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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

async function main(): Promise<void> {
  const serverPath = resolveCyberstreamsServerPath();
  if (!serverPath) {
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



import { McpHttpClient } from "./client/httpClient.js";

function printHelp(): void {
  console.log(`
sca (SCA-01 Phase 3 - Cloud Mode)

Commands:
  server              Start the cloud server
  client              Connect to cloud server and run commands
  health <url>        Check server health
  tools <url>         List available tools

Environment:
  SCA_SERVER_URL      Cloud server URL (default: http://localhost:8787)
  SCA_CLIENT_ID       Client ID for authentication
  SCA_CLIENT_SECRET   Client secret for authentication
  SCA_PORT            Server port (default: 8787)
  SCA_HOST            Server host (default: 0.0.0.0)
`.trim());
}

async function cmdHealth(url: string): Promise<void> {
  try {
    const response = await fetch(`${url}/health`);
    const data = await response.json();
    console.log("✅ Server healthy:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("❌ Server unreachable:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
}

async function cmdTools(): Promise<void> {
  const url = process.env.SCA_SERVER_URL ?? "http://localhost:8787";
  const clientId = process.env.SCA_CLIENT_ID ?? "test-client";
  const clientSecret = process.env.SCA_CLIENT_SECRET ?? "test-secret-12345";

  const client = new McpHttpClient({
    baseUrl: url,
    clientId,
    clientSecret
  });

  try {
    await client.connect();
    const { tools } = await client.listTools();
    
    console.log("\n🔧 Available Tools:\n");
    for (const tool of tools) {
      console.log(`  ${tool.name}`);
      console.log(`    ${tool.description ?? "No description"}`);
      if (tool.inputSchema) {
        const props = (tool.inputSchema as { properties?: Record<string, unknown> }).properties;
        if (props) {
          console.log(`    Parameters: ${Object.keys(props).join(", ")}`);
        }
      }
      console.log();
    }
  } catch (e) {
    console.error("❌ Error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
}

async function cmdCall(toolName: string, argsJson: string): Promise<void> {
  const url = process.env.SCA_SERVER_URL ?? "http://localhost:8787";
  const clientId = process.env.SCA_CLIENT_ID ?? "test-client";
  const clientSecret = process.env.SCA_CLIENT_SECRET ?? "test-secret-12345";

  const client = new McpHttpClient({
    baseUrl: url,
    clientId,
    clientSecret
  });

  try {
    await client.connect();
    const args = JSON.parse(argsJson);
    const result = await client.callTool(toolName, args);
    
    console.log("\n📤 Result:\n");
    for (const item of result.content) {
      console.log(item.text);
    }
    
    if (result.isError) {
      process.exitCode = 1;
    }
  } catch (e) {
    console.error("❌ Error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0] ?? "help";

  try {
    if (cmd === "help" || cmd === "--help" || cmd === "-h") {
      printHelp();
      return;
    }

    if (cmd === "server") {
      // Start server - this is handled by httpServer.ts
      const { createServer } = await import("./server/httpServer.js");
      const port = parseInt(process.env.SCA_PORT ?? "8787", 10);
      const host = process.env.SCA_HOST ?? "0.0.0.0";
      
      const server = await createServer({ port, host });
      await server.listen({ port, host });
      
      console.log(`🚀 SCA-01 Cloud Server running at http://${host}:${port}`);
      return;
    }

    if (cmd === "health") {
      const url = argv[1] ?? process.env.SCA_SERVER_URL ?? "http://localhost:8787";
      await cmdHealth(url);
      return;
    }

    if (cmd === "tools") {
      await cmdTools();
      return;
    }

    if (cmd === "call") {
      const toolName = argv[1];
      const argsJson = argv[2] ?? "{}";
      
      if (!toolName) {
        console.error("Usage: sca call <tool_name> [args_json]");
        process.exitCode = 1;
        return;
      }
      
      await cmdCall(toolName, argsJson);
      return;
    }

    printHelp();
    process.exitCode = 2;
  } catch (e) {
    console.error("ERROR:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
}

main().catch(console.error);


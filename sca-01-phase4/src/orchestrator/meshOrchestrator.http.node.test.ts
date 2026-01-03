import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import { AgentRegistry } from "../registry/agentRegistry.js";
import { MeshOrchestrator } from "./meshOrchestrator.js";

type ServerState = {
  currentAccessToken: string;
  refreshToken: string;
  nextAccessToken: number;
};

function startMockPhase3Server(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const state: ServerState = { currentAccessToken: "access-0", refreshToken: "refresh-0", nextAccessToken: 1 };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/auth/token") {
      let body = "";
      req.on("data", (c) => (body += String(c)));
      req.on("end", () => {
        const parsed = body ? JSON.parse(body) : {};

        if (parsed.grant_type === "client_credentials") {
          state.currentAccessToken = `access-${state.nextAccessToken++}`;
          state.refreshToken = `refresh-${state.nextAccessToken++}`;
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ access_token: state.currentAccessToken, refresh_token: state.refreshToken, token_type: "Bearer", expires_in: 60 }));
          return;
        }

        if (parsed.grant_type === "refresh_token") {
          state.currentAccessToken = `access-${state.nextAccessToken++}`;
          state.refreshToken = `refresh-${state.nextAccessToken++}`;
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ access_token: state.currentAccessToken, refresh_token: state.refreshToken, token_type: "Bearer", expires_in: 60 }));
          return;
        }

        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "unsupported_grant_type" }));
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/mcp/tools") {
      const auth = String(req.headers.authorization ?? "");
      if (!auth.startsWith("Bearer ")) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "missing_token" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ tools: [{ name: "echo", description: "echo tool" }] }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/mcp/tools/call") {
      const auth = String(req.headers.authorization ?? "");
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

      // Require the latest token (forces 401 -> refresh -> retry path).
      if (token !== state.currentAccessToken) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_token" }));
        return;
      }

      let body = "";
      req.on("data", (c) => (body += String(c)));
      req.on("end", () => {
        const parsed = body ? JSON.parse(body) : {};
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ content: [{ type: "text", text: JSON.stringify({ ok: true, tool: parsed.name }) }], isError: false }));
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") throw new Error("no server address");
      const baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve({
        baseUrl,
        close: async () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}

test("MeshOrchestrator http transport: list tools + call tool with 401 refresh retry", async () => {
  const srv = await startMockPhase3Server();
  try {
    process.env.SCA_PHASE3_CLIENT_ID = "test-client";
    process.env.SCA_PHASE3_CLIENT_SECRET = "test-secret-1234";

    const reg = new AgentRegistry(process.cwd());
    reg.register({
      id: "cloud",
      name: "Cloud Agent",
      version: "0.0.0-test",
      description: "mock phase3",
      transport: "http",
      endpoint: `${srv.baseUrl}/mcp`,
      trustLevel: "local",
      capabilities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const orch = new MeshOrchestrator({ defaultTimeout: 5_000, retryAttempts: 0 }, reg);
    await orch.start();

    const tools = await orch.listAllTools();
    const cloudTools = tools.find((t) => t.agentId === "cloud");
    assert.ok(cloudTools);
    assert.ok(cloudTools.tools.some((x) => x.name === "echo"));

    const resp = await orch.callTool({
      requestId: "req-1",
      sourceAgentId: "test",
      targetAgentId: "cloud",
      toolName: "echo",
      arguments: { x: 1 },
      timeout: 5_000,
    });
    assert.equal(resp.success, true);

    await orch.stop();
  } finally {
    await srv.close();
  }
});



import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "./server.js";

void test("mcp-backend (node smoke): /health", async () => {
  const { app } = await createServer();
  await app.ready();
  const res = await app.inject({ method: "GET", url: "/health" });
  assert.equal(res.statusCode, 200);
  const body = res.json() as { status: string };
  assert.equal(body.status, "ok");
  await app.close();
});

void test("mcp-backend (node smoke): /api/agents/diagram", async () => {
  const { app } = await createServer();
  await app.ready();
  const res = await app.inject({ method: "GET", url: "/api/agents/diagram" });
  assert.equal(res.statusCode, 200);
  const body = res.json() as { mermaid: string };
  assert.ok(typeof body.mermaid === "string");
  assert.ok(body.mermaid.includes("stateDiagram-v2"));
  await app.close();
});



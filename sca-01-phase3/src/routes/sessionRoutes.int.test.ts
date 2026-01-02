import { beforeAll, afterAll, describe, expect, test } from "vitest";
import { HyperLog } from "../logging/hyperlog.js";
import { migrate } from "../db/migrate.js";
import { createServer } from "../server/httpServer.js";
import { registerAuthRoutes } from "./authRoutes.js";
import { registerSessionRoutes } from "./sessionRoutes.js";

function isDbConfigured(): boolean {
  return typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim().length > 0;
}

describe("sessionRoutes (integration)", () => {
  const run = isDbConfigured() ? test : test.skip;

  const log = new HyperLog("./logs", "tests.sessionRoutes.int.jsonl");
  let server: Awaited<ReturnType<typeof createServer>> | null = null;
  let token = "";
  let sessionId = "";

  beforeAll(async () => {
    await migrate();
    server = await createServer({ port: 0 });
    registerAuthRoutes(server, log);
    registerSessionRoutes(server, log);
    await server.ready();

    const email = `int+${crypto.randomUUID()}@example.com`;
    const password = "Password123!";
    const reg = await server.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password },
    });
    expect(reg.statusCode).toBe(200);
    token = (reg.json() as { access_token: string }).access_token;
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  run("POST /api/sessions creates a session", async () => {
    const s = server;
    if (!s) throw new Error("server not initialized");

    const res = await s.inject({
      method: "POST",
      url: "/api/sessions",
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Demo", model: "qwen3", systemPrompt: "You are helpful" },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { session: { id: string; title: string } };
    expect(json.session.title).toBe("Demo");
    sessionId = json.session.id;
  });

  run("POST /api/sessions/:id/messages creates a message", async () => {
    const s = server;
    if (!s) throw new Error("server not initialized");

    const res = await s.inject({
      method: "POST",
      url: `/api/sessions/${sessionId}/messages`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role: "user", content: "Hello" },
    });
    expect(res.statusCode).toBe(200);
  });

  run("GET /api/sessions/:id/messages lists messages", async () => {
    const s = server;
    if (!s) throw new Error("server not initialized");

    const res = await s.inject({
      method: "GET",
      url: `/api/sessions/${sessionId}/messages`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { messages: unknown[] };
    expect(Array.isArray(json.messages)).toBe(true);
    expect(json.messages.length).toBeGreaterThan(0);
  });

  run("DELETE /api/sessions/:id deletes the session", async () => {
    const s = server;
    if (!s) throw new Error("server not initialized");

    const res = await s.inject({
      method: "DELETE",
      url: `/api/sessions/${sessionId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });
});



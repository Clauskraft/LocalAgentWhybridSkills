import { beforeAll, afterAll, describe, expect, test } from "vitest";
import { HyperLog } from "../logging/hyperlog.js";
import { migrate } from "../db/migrate.js";
import { createServer } from "../server/httpServer.js";
import { registerAuthRoutes } from "./authRoutes.js";
import { registerRepoRoutes } from "./repoRoutes.js";

function isDbConfigured(): boolean {
  return typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim().length > 0;
}

describe("repoRoutes (smoke)", () => {
  const run = isDbConfigured() ? test : test.skip;

  const log = new HyperLog("./logs", "tests.repoRoutes.smoke.jsonl");
  let server: Awaited<ReturnType<typeof createServer>> | null = null;

  beforeAll(async () => {
    await migrate();
    server = await createServer({ port: 0 });
    registerAuthRoutes(server, log);
    registerRepoRoutes(server, log);
    await server.ready();
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  run("GET /api/repos returns 200 with auth token", async () => {
    const s = server;
    if (!s) throw new Error("server not initialized");

    const email = `smoke+${crypto.randomUUID()}@example.com`;
    const password = "Password123!";

    const reg = await s.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password },
    });
    expect(reg.statusCode).toBe(200);
    const regJson = reg.json() as { access_token: string };
    expect(typeof regJson.access_token).toBe("string");

    const res = await s.inject({
      method: "GET",
      url: "/api/repos",
      headers: { authorization: `Bearer ${regJson.access_token}` },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json() as { repos: unknown[] };
    expect(Array.isArray(json.repos)).toBe(true);
  });
});



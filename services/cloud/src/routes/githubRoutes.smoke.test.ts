import { beforeAll, afterAll, describe, expect, test } from "vitest";
import { HyperLog } from "../logging/hyperlog.js";
import { createServer } from "../server/httpServer.js";
import { registerGitHubRoutes } from "./githubRoutes.js";

describe("githubRoutes (smoke)", () => {
  const log = new HyperLog("./logs", "tests.githubRoutes.smoke.jsonl");
  let server: Awaited<ReturnType<typeof createServer>> | null = null;
  let token = "";

  beforeAll(async () => {
    server = await createServer({ port: 0 });
    await registerGitHubRoutes(server, log);
    await server.ready();

    const tok = await server.inject({
      method: "POST",
      url: "/auth/token",
      payload: {
        grant_type: "client_credentials",
        client_id: "test-client",
        client_secret: "supersecret123",
      },
    });
    expect(tok.statusCode).toBe(200);
    token = (tok.json() as { access_token: string }).access_token;
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  test("GET /api/github/status returns 200 with auth", async () => {
    const s = server;
    if (!s) throw new Error("server not initialized");

    const res = await s.inject({
      method: "GET",
      url: "/api/github/status",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { connected: boolean };
    expect(typeof json.connected).toBe("boolean");
  });
});



import { beforeAll, afterAll, describe, expect, test } from "vitest";
import { HyperLog } from "../logging/hyperlog.js";
import { migrate } from "../db/migrate.js";
import { createServer } from "../server/httpServer.js";
import { registerAuthRoutes } from "./authRoutes.js";
import { registerRepoRoutes } from "./repoRoutes.js";

function isDbConfigured(): boolean {
  return typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim().length > 0;
}

describe("repoRoutes (integration)", () => {
  const run = isDbConfigured() ? test : test.skip;

  const log = new HyperLog("./logs", "tests.repoRoutes.int.jsonl");
  let server: Awaited<ReturnType<typeof createServer>> | null = null;
  let token = "";
  let createdRepoId = "";

  beforeAll(async () => {
    await migrate();
    server = await createServer({ port: 0 });
    registerAuthRoutes(server, log);
    registerRepoRoutes(server, log);
    await server.ready();

    const email = `int+${crypto.randomUUID()}@example.com`;
    const password = "Password123!";

    const reg = await server.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password },
    });
    expect(reg.statusCode).toBe(200);
    const regJson = reg.json() as { access_token: string };
    token = regJson.access_token;
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  run("POST /api/repos creates repo", async () => {
    const s = server;
    if (!s) throw new Error("server not initialized");

    const res = await s.inject({
      method: "POST",
      url: "/api/repos",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "demo-repo",
        remoteUrl: "https://github.com/example/demo-repo",
        defaultBranch: "main",
        policy: { allowRead: true, allowWrite: false, allowExec: false },
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json() as { repo: { id: string; name: string } };
    expect(json.repo.name).toBe("demo-repo");
    createdRepoId = json.repo.id;
  });

  run("GET /api/repos lists created repo", async () => {
    const s = server;
    if (!s) throw new Error("server not initialized");

    const res = await s.inject({
      method: "GET",
      url: "/api/repos",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { repos: Array<{ id: string }> };
    expect(json.repos.some((r) => r.id === createdRepoId)).toBe(true);
  });

  run("PATCH /api/repos/:id updates policy", async () => {
    const s = server;
    if (!s) throw new Error("server not initialized");

    const res = await s.inject({
      method: "PATCH",
      url: `/api/repos/${createdRepoId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { policy: { allowRead: true, allowWrite: true } },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { repo: { policy: { allowWrite?: boolean } } };
    expect(json.repo.policy.allowWrite).toBe(true);
  });

  run("DELETE /api/repos/:id archives repo", async () => {
    const s = server;
    if (!s) throw new Error("server not initialized");

    const res = await s.inject({
      method: "DELETE",
      url: `/api/repos/${createdRepoId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);

    const listed = await s.inject({
      method: "GET",
      url: "/api/repos",
      headers: { authorization: `Bearer ${token}` },
    });
    const json = listed.json() as { repos: Array<{ id: string }> };
    expect(json.repos.some((r) => r.id === createdRepoId)).toBe(false);
  });
});



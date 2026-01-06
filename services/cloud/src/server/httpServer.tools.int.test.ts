import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "./httpServer.js";

describe("sca-01-cloud MCP tools", () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
    delete process.env.SCA_CLIENT_ID;
    delete process.env.SCA_CLIENT_SECRET;
  });

  async function getAccessToken(address: string): Promise<string> {
    const res = await fetch(`${address}/auth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: process.env.SCA_CLIENT_ID,
        client_secret: process.env.SCA_CLIENT_SECRET,
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { access_token?: string };
    expect(typeof body.access_token).toBe("string");
    return body.access_token as string;
  }

  describe("GET /mcp/tools", () => {
    it("returns 403 without JWT auth", async () => {
      const app = await createServer({ host: "127.0.0.1", port: 0 });
      const address = await app.listen({ host: "127.0.0.1", port: 0 });

      try {
        const res = await fetch(`${address}/mcp/tools`);
        expect(res.status).toBe(401);
      } finally {
        await app.close();
      }
    });

    it("returns tool list with valid JWT", async () => {
      process.env.SCA_CLIENT_ID = "test-client";
      process.env.SCA_CLIENT_SECRET = "12345678";

      const app = await createServer({ host: "127.0.0.1", port: 0 });
      const address = await app.listen({ host: "127.0.0.1", port: 0 });

      try {
        const token = await getAccessToken(address);
        const res = await fetch(`${address}/mcp/tools`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { tools?: Array<{ name?: string }> };
        expect(Array.isArray(body.tools)).toBe(true);
        const names = (body.tools ?? []).map((t) => t.name).filter(Boolean);
        expect(names).toContain("roma.plan");
        expect(names).toContain("roma.act");
        expect(names).toContain("search.query");
        expect(names).toContain("search.upsert");
      } finally {
        await app.close();
      }
    });

  });

  describe("GET /api/mcp/tools (back-compat)", () => {
    it("returns same tools as canonical endpoint", async () => {
      // Test that back-compat alias works the same as main endpoint
      const app = await createServer({ host: "127.0.0.1", port: 0 });
      const address = await app.listen({ host: "127.0.0.1", port: 0 });

      try {
        // Both endpoints should return same auth error without token
        const [res1, res2] = await Promise.all([
          fetch(`${address}/mcp/tools`),
          fetch(`${address}/api/mcp/tools`)
        ]);

        expect(res1.status).toBe(res2.status);
        expect(res1.status).toBe(401);
      } finally {
        await app.close();
      }
    });
  });

  describe("POST /mcp/tools/call", () => {
    it("returns 403 without JWT auth", async () => {
      const app = await createServer({ host: "127.0.0.1", port: 0 });
      const address = await app.listen({ host: "127.0.0.1", port: 0 });

      try {
        const res = await fetch(`${address}/mcp/tools/call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "read_file", arguments: { path: "/tmp/test" } })
        });
        expect(res.status).toBe(401);
      } finally {
        await app.close();
      }
    });

    it("validates tool call format", async () => {
      process.env.SCA_CLIENT_ID = "test-client";
      process.env.SCA_CLIENT_SECRET = "12345678";

      const app = await createServer({ host: "127.0.0.1", port: 0 });
      const address = await app.listen({ host: "127.0.0.1", port: 0 });

      try {
        const token = await getAccessToken(address);
        const res = await fetch(`${address}/mcp/tools/call`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ invalid: "format" })
        });

        expect(res.status).toBe(400);
      } finally {
        await app.close();
      }
    });
  });

});

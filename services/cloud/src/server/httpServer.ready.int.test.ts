import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "./httpServer.js";

describe("sca-01-cloud readiness", () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it("GET /ready returns 503 in production when DATABASE_URL is missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.DATABASE_URL;

    const app = await createServer({ host: "127.0.0.1", port: 0 });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const res = await fetch(`${address}/ready`);
      expect(res.status).toBe(503);
      const body = (await res.json()) as { status?: string; error?: string };
      expect(body.status).toBe("degraded");
      expect(body.error).toMatch(/DATABASE_URL/i);
    } finally {
      await app.close();
    }
  });

  it("GET /ready returns 200 when DATABASE_URL is present", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

    const app = await createServer({ host: "127.0.0.1", port: 0 });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const res = await fetch(`${address}/ready`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status?: string; db?: boolean };
      expect(body.status).toBe("ready");
      expect(body.db).toBe(true);
    } finally {
      await app.close();
    }
  });

  it("GET /health returns 200 with service info", async () => {
    const app = await createServer({ host: "127.0.0.1", port: 0 });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const res = await fetch(`${address}/health`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status?: string; service?: string; version?: string };
      expect(body.status).toBe("ok");
      expect(body.service).toBe("sca-01-cloud");
      expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    } finally {
      await app.close();
    }
  });

  it("GET /mcp/info returns MCP server info", async () => {
    const app = await createServer({ host: "127.0.0.1", port: 0 });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const res = await fetch(`${address}/mcp/info`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { name?: string; version?: string; protocolVersion?: string };
      expect(body.name).toBe("sca-01-cloud");
      expect(body.protocolVersion).toBe("2024-11-05");
    } finally {
      await app.close();
    }
  });
});



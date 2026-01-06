import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "./httpServer.js";

describe("sca-01-cloud root (integration)", () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it("GET / returns service info and key endpoints", async () => {
    const app = await createServer({ host: "127.0.0.1", port: 0 });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const res = await fetch(`${address}/`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        service?: string;
        version?: string;
        endpoints?: { ready?: string; mcpInfo?: string };
      };

      expect(body.service).toBe("sca-01-cloud");
      expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(body.endpoints?.ready).toBe("/ready");
      expect(body.endpoints?.mcpInfo).toBe("/mcp/info");
    } finally {
      await app.close();
    }
  });

  it("GET /favicon.ico returns 204", async () => {
    const app = await createServer({ host: "127.0.0.1", port: 0 });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const res = await fetch(`${address}/favicon.ico`);
      expect(res.status).toBe(204);
    } finally {
      await app.close();
    }
  });
});


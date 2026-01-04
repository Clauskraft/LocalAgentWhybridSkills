import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "./httpServer.js";

describe("sca-01-phase3 readiness", () => {
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
});



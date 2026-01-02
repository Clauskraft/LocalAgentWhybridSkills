import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "./httpServer.js";

describe("sca-01-phase3 smoke", () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it("GET /health returns 200", async () => {
    const app = await createServer({ host: "127.0.0.1", port: 0 });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const res = await fetch(`${address}/health`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status?: string };
      expect(body.status).toBe("ok");
    } finally {
      await app.close();
    }
  });
});



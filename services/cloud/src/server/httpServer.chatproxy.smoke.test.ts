import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "./httpServer.js";

describe("sca-01-phase3 chat proxy (smoke)", () => {
  afterEach(() => {
    delete process.env.OLLAMA_HOST;
  });

  it("GET /api/models returns 503 when OLLAMA_HOST is not configured", async () => {
    delete process.env.OLLAMA_HOST;

    const app = await createServer({ host: "127.0.0.1", port: 0 });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const res = await fetch(`${address}/api/models`);
      expect(res.status).toBe(503);
      const body = (await res.json()) as { error?: string };
      expect(body.error).toBe("ollama_not_configured");
    } finally {
      await app.close();
    }
  });
});



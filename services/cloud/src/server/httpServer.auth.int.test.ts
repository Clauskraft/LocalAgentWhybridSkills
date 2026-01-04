import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "./httpServer.js";

describe("sca-01-cloud auth (integration)", () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it("POST /auth/token refresh_token returns 200 with new tokens", async () => {
    const app = await createServer({ host: "127.0.0.1", port: 0 });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const issueRes = await fetch(`${address}/auth/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credentials", client_id: "test-client", client_secret: "12345678" }),
      });
      expect(issueRes.status).toBe(200);
      const issued = (await issueRes.json()) as { access_token: string; refresh_token: string };

      const refreshRes = await fetch(`${address}/auth/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ grant_type: "refresh_token", refresh_token: issued.refresh_token }),
      });
      expect(refreshRes.status).toBe(200);
      const refreshed = (await refreshRes.json()) as { access_token?: string; refresh_token?: string };
      expect(typeof refreshed.access_token).toBe("string");
      expect(typeof refreshed.refresh_token).toBe("string");
      expect(refreshed.access_token).not.toBe(issued.access_token);
    } finally {
      await app.close();
    }
  });
});



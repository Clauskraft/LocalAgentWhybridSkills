import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "./httpServer.js";

describe("sca-01-cloud auth (smoke)", () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
    delete process.env.SCA_CLIENT_ID;
    delete process.env.SCA_CLIENT_SECRET;
  });

  it("POST /auth/token client_credentials returns 200 with tokens", async () => {
    process.env.SCA_CLIENT_ID = "test-client";
    process.env.SCA_CLIENT_SECRET = "12345678";
    const app = await createServer({ host: "127.0.0.1", port: 0 });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const res = await fetch(`${address}/auth/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credentials", client_id: "test-client", client_secret: "12345678" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { access_token?: string; refresh_token?: string };
      expect(typeof body.access_token).toBe("string");
      expect(typeof body.refresh_token).toBe("string");
    } finally {
      await app.close();
    }
  });

  it("POST /auth/token rejects too-short client_secret", async () => {
    process.env.SCA_CLIENT_ID = "test-client";
    process.env.SCA_CLIENT_SECRET = "12345678";
    const app = await createServer({ host: "127.0.0.1", port: 0 });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const res = await fetch(`${address}/auth/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credentials", client_id: "test-client", client_secret: "short" }),
      });
      expect(res.status).toBe(401);
    } finally {
      await app.close();
    }
  });
});



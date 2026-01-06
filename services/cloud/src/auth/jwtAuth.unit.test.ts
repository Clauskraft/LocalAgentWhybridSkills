import { describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { JwtAuthService } from "./jwtAuth.js";

describe("JwtAuthService", () => {
  it("signs and verifies ES256 access tokens", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sca01-jwt-"));
    const auth = new JwtAuthService(dir);

    const pair = await auth.generateTokenPair("user-123", ["read", "write"], "user@example.com");
    expect(typeof pair.accessToken).toBe("string");
    expect(typeof pair.refreshToken).toBe("string");

    const payload = await auth.verifyToken(pair.accessToken);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("user-123");
    expect(payload?.agentId).toBe("user@example.com");
    expect(payload?.scopes).toEqual(["read", "write"]);
  });
});


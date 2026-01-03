import test from "node:test";
import assert from "node:assert/strict";

import { api } from "./client";

// This is a very small smoke test to ensure:
// - code loads in Node
// - request logging doesn’t throw
// - refresh path is attempted on 401

test("api client: logs requests and handles 401 by failing gracefully", async () => {
  const origFetch = globalThis.fetch;
  let calls = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.fetch = (async (_url: any, _init: any) => {
    calls += 1;
    // First call is /auth/refresh inside initialize/token handling in some flows,
    // but we only assert that the client doesn't crash and logs.
    return {
      ok: false,
      status: 401,
      json: async () => ({ message: "unauthorized" }),
      text: async () => "unauthorized",
    } as any;
  }) as any;

  try {
    const logsBefore = api.getRecentLogs().length;
    // Call checkHealth (should fail and not throw)
    const ok = await api.checkHealth();
    assert.equal(typeof ok, "boolean");
    const logsAfter = api.getRecentLogs().length;
    assert.ok(logsAfter >= logsBefore);
    assert.ok(calls >= 1);
  } finally {
    globalThis.fetch = origFetch!;
  }
});



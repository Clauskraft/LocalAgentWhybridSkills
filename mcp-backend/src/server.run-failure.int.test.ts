import { describe, expect, test } from "vitest";
import { createServer } from "./server.js";

describe("mcp-backend server (integration, failure modes)", () => {
  test("POST /api/agents/run returns 500 when dependencies are unavailable (no mocks)", async () => {
    // Force an unreachable Ollama host so the agent fails early without hanging the request.
    const prev = process.env.OLLAMA_HOST;
    process.env.OLLAMA_HOST = "http://127.0.0.1:1";

    const { app } = await createServer();
    await app.ready();

    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/agents/run",
        payload: { goal: "Returnér en kort status uden tool calls." },
      });

      expect(res.statusCode).toBe(500);
      const body = res.json() as { error?: string; message?: string };
      expect(body.error).toBe("agent_run_failed");
      expect(typeof body.message).toBe("string");
    } finally {
      await app.close();
      if (prev === undefined) delete process.env.OLLAMA_HOST;
      else process.env.OLLAMA_HOST = prev;
    }
  });
});



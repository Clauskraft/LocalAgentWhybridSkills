import { describe, expect, test } from "vitest";
import { createServer } from "./server.js";

function isOllamaReachable(): boolean {
  return typeof process.env.OLLAMA_HOST === "string" && process.env.OLLAMA_HOST.trim().length > 0;
}

describe("mcp-backend server (integration)", () => {
  if (!isOllamaReachable()) {
    test.skip("OLLAMA_HOST not set; skipping integration test (no mocks).", async () => {});
    return;
  }

  test("POST /api/agents/run returns a result object (real MCP + real Ollama)", async () => {
    const { app } = await createServer();
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/agents/run",
      payload: { goal: "Returnér en kort status uden tool calls." }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; output: string; turns: number; toolCalls: string[] };
    expect(typeof body.success).toBe("boolean");
    expect(typeof body.output).toBe("string");
    expect(Array.isArray(body.toolCalls)).toBe(true);

    await app.close();
  });
});



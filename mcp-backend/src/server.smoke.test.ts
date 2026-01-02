import { describe, expect, test } from "vitest";
import { createServer } from "./server.js";

describe("mcp-backend server (smoke)", () => {
  test("GET /health returns ok", async () => {
    const { app } = await createServer();
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string };
    expect(body.status).toBe("ok");
    await app.close();
  });

  test("GET /api/agents/diagram returns mermaid", async () => {
    const { app } = await createServer();
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/agents/diagram" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { mermaid: string };
    expect(typeof body.mermaid).toBe("string");
    expect(body.mermaid).toContain("stateDiagram-v2");
    await app.close();
  });
});



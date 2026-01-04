import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "./httpServer.js";
import http from "node:http";

function startOllamaStub(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.statusCode = 404;
        res.end();
        return;
      }

      if (req.method === "GET" && req.url === "/api/tags") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ models: [{ name: "qwen3:latest", size: 12345 }] }));
        return;
      }

      if (req.method === "POST" && req.url === "/api/chat") {
        let body = "";
        req.on("data", (chunk) => (body += String(chunk)));
        req.on("end", () => {
          // Basic sanity: ensure it's JSON
          try {
            JSON.parse(body);
          } catch {
            res.statusCode = 400;
            res.end("invalid json");
            return;
          }
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ message: { content: "pong", tool_calls: [] } }));
        });
        return;
      }

      res.statusCode = 404;
      res.end();
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}

describe("sca-01-cloud chat proxy (integration)", () => {
  afterEach(() => {
    delete process.env.OLLAMA_HOST;
  });

  it("proxies /api/models and /api/chat to the configured Ollama upstream", async () => {
    const stub = await startOllamaStub();
    process.env.OLLAMA_HOST = stub.baseUrl;

    const app = await createServer({ host: "127.0.0.1", port: 0 });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const modelsRes = await fetch(`${address}/api/models`);
      expect(modelsRes.status).toBe(200);
      const modelsBody = (await modelsRes.json()) as { models?: Array<{ name: string }> };
      expect(modelsBody.models?.[0]?.name).toBe("qwen3:latest");

      const chatRes = await fetch(`${address}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: "qwen3", messages: [{ role: "user", content: "ping" }], stream: false }),
      });
      expect(chatRes.status).toBe(200);
      const chatBody = (await chatRes.json()) as { message?: { content?: string } };
      expect(chatBody.message?.content).toBe("pong");
    } finally {
      await app.close();
      await stub.close();
    }
  });
});



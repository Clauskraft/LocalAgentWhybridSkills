import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { HyperLog } from "@local-agent/hyperlog";
import { FinisherAgent } from "./agent/FinisherAgent.js";
import { createHealthResponse } from "@local-agent/health";

const RunSchema = z.object({
  goal: z.string().optional(),
});

export async function createServer() {
  const cfg = loadConfig();
  const log = new HyperLog(cfg.logDir, "mcp-backend.server.hyperlog.jsonl");
  const agent = new FinisherAgent(cfg);

  const app = Fastify({ logger: false });

  if (cfg.corsOrigins.length > 0) {
    await app.register(cors, { origin: cfg.corsOrigins, credentials: true });
  }

  await app.register(rateLimit, { max: cfg.rateLimitMax, timeWindow: cfg.rateLimitWindow });

  app.get("/health", async () => {
    return createHealthResponse("mcp-backend");
  });

  app.get("/api/agents/diagram", async () => ({
    mermaid: agent.diagram(),
  }));

  app.post("/api/agents/run", async (request, reply) => {
    const parsed = RunSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "invalid_request" });

    log.info("api.agents.run", "Starting agent run", { hasGoal: typeof parsed.data.goal === "string" });
    try {
      const result = await agent.run(parsed.data.goal);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error("api.agents.run", "Agent run failed", { error: message });
      return reply.status(500).send({ error: "agent_run_failed", message });
    }
  });

  return { app, cfg };
}

async function main(): Promise<void> {
  const { app, cfg } = await createServer();
  await app.listen({ port: cfg.port, host: cfg.host });
  console.log(`mcp-backend listening on http://${cfg.host}:${cfg.port}`);
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}


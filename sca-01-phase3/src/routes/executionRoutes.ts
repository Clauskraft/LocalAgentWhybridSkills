/**
 * Execution Routes
 * API endpoints for code execution across multiple backends
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { executionRouter, ExecutionRequest, ExecutionBackend } from "../execution/executionRouter.js";
import { randomUUID } from "node:crypto";

interface ExecuteBody {
  language: string;
  code: string;
  type?: "eval" | "function" | "build";
  files?: Array<{ name: string; content: string }>;
  dependencies?: string[];
  testCode?: string;
  artifacts?: string[];
  timeout?: number;
  input?: unknown;
  backend?: ExecutionBackend;
  projectId?: string;
}

export async function executionRoutes(fastify: FastifyInstance): Promise<void> {
  // Execute code (auto-route to best backend)
  fastify.post(
    "/execute",
    { preHandler: [fastify.verifyJwt] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as ExecuteBody;

      if (!body.language || !body.code) {
        return reply.status(400).send({
          error: "Missing required fields: language, code",
        });
      }

      const execRequest: ExecutionRequest = {
        id: randomUUID(),
        projectId: body.projectId ?? "default",
        type: body.type ?? "eval",
        language: body.language,
        code: body.code,
        files: body.files,
        dependencies: body.dependencies,
        testCode: body.testCode,
        artifacts: body.artifacts,
        timeout: body.timeout,
        input: body.input,
      };

      let result;
      if (body.backend) {
        // Force specific backend
        result = await executionRouter.executeOn(body.backend, execRequest);
      } else {
        // Auto-route
        result = await executionRouter.execute(execRequest);
      }

      return reply.send(result);
    }
  );

  // Execute on specific backend
  fastify.post(
    "/execute/:backend",
    { preHandler: [fastify.verifyJwt] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { backend } = request.params as { backend: string };
      const body = request.body as ExecuteBody;

      if (!["piston", "edge", "github"].includes(backend)) {
        return reply.status(400).send({
          error: "Invalid backend. Must be: piston, edge, or github",
        });
      }

      if (!body.language || !body.code) {
        return reply.status(400).send({
          error: "Missing required fields: language, code",
        });
      }

      const execRequest: ExecutionRequest = {
        id: randomUUID(),
        projectId: body.projectId ?? "default",
        type: body.type ?? "eval",
        language: body.language,
        code: body.code,
        files: body.files,
        dependencies: body.dependencies,
        testCode: body.testCode,
        artifacts: body.artifacts,
        timeout: body.timeout,
        input: body.input,
      };

      const result = await executionRouter.executeOn(backend as ExecutionBackend, execRequest);
      return reply.send(result);
    }
  );

  // Get supported languages
  fastify.get("/execute/languages", async (_request: FastifyRequest, reply: FastifyReply) => {
    const languages = executionRouter.getSupportedLanguages();
    return reply.send({ languages });
  });

  // Get execution history
  fastify.get(
    "/execute/history",
    { preHandler: [fastify.verifyJwt] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { limit?: string };
      const limit = parseInt(query.limit ?? "100", 10);
      const history = executionRouter.getHistory(limit);
      return reply.send({ executions: history, count: history.length });
    }
  );

  // Get execution metrics
  fastify.get(
    "/execute/metrics",
    { preHandler: [fastify.verifyJwt] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const metrics = executionRouter.getMetrics();
      return reply.send(metrics);
    }
  );

  // Quick eval endpoints for common languages
  fastify.post(
    "/eval/typescript",
    { preHandler: [fastify.verifyJwt] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { code: string; input?: unknown };

      if (!body.code) {
        return reply.status(400).send({ error: "Missing code" });
      }

      const result = await executionRouter.execute({
        id: randomUUID(),
        projectId: "quickeval",
        type: "eval",
        language: "typescript",
        code: body.code,
        input: body.input,
      });

      return reply.send(result);
    }
  );

  fastify.post(
    "/eval/python",
    { preHandler: [fastify.verifyJwt] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { code: string; input?: unknown };

      if (!body.code) {
        return reply.status(400).send({ error: "Missing code" });
      }

      const result = await executionRouter.execute({
        id: randomUUID(),
        projectId: "quickeval",
        type: "eval",
        language: "python",
        code: body.code,
        input: body.input,
      });

      return reply.send(result);
    }
  );

  fastify.post(
    "/eval/javascript",
    { preHandler: [fastify.verifyJwt] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { code: string; input?: unknown };

      if (!body.code) {
        return reply.status(400).send({ error: "Missing code" });
      }

      const result = await executionRouter.execute({
        id: randomUUID(),
        projectId: "quickeval",
        type: "eval",
        language: "javascript",
        code: body.code,
        input: body.input,
      });

      return reply.send(result);
    }
  );
}


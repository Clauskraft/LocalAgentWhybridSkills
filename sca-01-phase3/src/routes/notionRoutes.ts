/**
 * Notion Integration Routes
 * API endpoints for Notion sync
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getNotionClient } from "../notion/notionClient.js";
import type { TokenPayload } from "../auth/jwtAuth.js";

interface SyncSessionBody {
  sessionId: string;
  title: string;
  model: string;
  createdAt: string;
  messageCount: number;
  notionPageId?: string;
}

interface AppendMessageBody {
  notionPageId: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface SyncBlackboardBody {
  content: string;
}

export async function notionRoutes(fastify: FastifyInstance): Promise<void> {
  // Verify Notion connection
  fastify.get(
    "/notion/status",
    { preHandler: [fastify.verifyJwt] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const client = getNotionClient();
      
      if (!client) {
        return reply.status(503).send({
          connected: false,
          error: "Notion integration not configured. Set NOTION_API_KEY and NOTION_DATABASE_ID.",
        });
      }

      const result = await client.verifyConnection();
      
      if (result.ok) {
        return reply.send({
          connected: true,
          user: result.user,
          features: {
            sessions: true,
            blackboard: !!process.env.NOTION_BLACKBOARD_PAGE_ID,
          },
        });
      }

      return reply.status(503).send({
        connected: false,
        error: result.error,
      });
    }
  );

  // Sync session to Notion
  fastify.post(
    "/notion/sync/session",
    { preHandler: [fastify.verifyJwt] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as SyncSessionBody;
      const client = getNotionClient();
      
      if (!client) {
        return reply.status(503).send({
          success: false,
          error: "Notion integration not configured",
        });
      }

      const { sessionId, title, model, createdAt, messageCount, notionPageId } = body;

      const session = {
        id: sessionId,
        title,
        model,
        createdAt,
        messageCount,
      };

      let result;
      if (notionPageId) {
        // Update existing
        result = await client.updateSessionPage(notionPageId, session);
      } else {
        // Create new
        result = await client.createSessionPage(session);
      }

      if (result.success) {
        return reply.send({
          success: true,
          notionPageId: result.notionPageId,
        });
      }

      return reply.status(500).send({
        success: false,
        error: result.error,
      });
    }
  );

  // Append message to Notion session page
  fastify.post(
    "/notion/sync/message",
    { preHandler: [fastify.verifyJwt] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as AppendMessageBody;
      const client = getNotionClient();
      
      if (!client) {
        return reply.status(503).send({
          success: false,
          error: "Notion integration not configured",
        });
      }

      const { notionPageId, role, content } = body;
      const result = await client.appendMessage(notionPageId, role, content);

      if (result.success) {
        return reply.send({ success: true });
      }

      return reply.status(500).send({
        success: false,
        error: result.error,
      });
    }
  );

  // Sync blackboard (HANDOVER_LOG) to Notion
  fastify.post(
    "/notion/sync/blackboard",
    { preHandler: [fastify.verifyJwt] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as SyncBlackboardBody;
      const client = getNotionClient();
      
      if (!client) {
        return reply.status(503).send({
          success: false,
          error: "Notion integration not configured",
        });
      }

      const { content } = body;
      const result = await client.syncBlackboard(content);

      if (result.success) {
        return reply.send({
          success: true,
          notionPageId: result.notionPageId,
        });
      }

      return reply.status(500).send({
        success: false,
        error: result.error,
      });
    }
  );

  // List sessions from Notion
  fastify.get(
    "/notion/sessions",
    { preHandler: [fastify.verifyJwt] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const client = getNotionClient();
      
      if (!client) {
        return reply.status(503).send({
          sessions: [],
          error: "Notion integration not configured",
        });
      }

      const sessions = await client.listSessions();
      return reply.send({ sessions });
    }
  );
}


import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { 
  createSession, 
  findSessionById, 
  findSessionsByUserId, 
  updateSession, 
  deleteSession,
  createMessage,
  findMessagesBySessionId
} from "../db/sessionRepository.js";
import { HyperLog } from "@local-agent/hyperlog";
import type { TokenPayload } from "../auth/jwtAuth.js";

// ============================================================================
// SESSION & MESSAGE ROUTES
// ============================================================================

const CreateSessionSchema = z.object({
  title: z.string().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional()
});

const UpdateSessionSchema = z.object({
  title: z.string().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  isArchived: z.boolean().optional()
});

const CreateMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string().nullable(),
  toolCalls: z.unknown().optional(),
  toolName: z.string().optional()
});

function requireUser(request: FastifyRequest, reply: FastifyReply): TokenPayload | null {
  const user = (request as unknown as { user: TokenPayload | null }).user;
  if (!user) {
    reply.status(401).send({ error: "unauthorized" });
    return null;
  }
  return user;
}

export function registerSessionRoutes(app: FastifyInstance, log: HyperLog): void {

  // ========== SESSIONS ==========

  // List sessions
  app.get("/api/sessions", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    
    const q = request.query as { archived?: string };
    const includeArchived = q.archived === "true";

    const sessions = await findSessionsByUserId(user.sub, includeArchived);
    
    log.info("sessions.list", "Sessions listed", { userId: user.sub, count: sessions.length, requestId: request.requestId });

    return { sessions };
  });

  // Get session
  app.get("/api/sessions/:id", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    
    const { id } = request.params as { id: string };
    const session = await findSessionById(id);
    
    if (!session) return reply.status(404).send({ error: "session_not_found" });
    if (session.userId !== user.sub) return reply.status(403).send({ error: "forbidden" });

    return { session };
  });

  // Create session
  app.post("/api/sessions", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    
    const parseResult = CreateSessionSchema.safeParse(request.body);
    if (!parseResult.success) return reply.status(400).send({ error: "Invalid request body" });

    const { title, model, systemPrompt } = parseResult.data;
    const session = await createSession(user.sub, title, model, systemPrompt);
    
    log.info("sessions.create", "Session created", { userId: user.sub, sessionId: session.id, requestId: request.requestId });

    return { session };
  });

  // Update session
  app.patch("/api/sessions/:id", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    
    const { id } = request.params as { id: string };
    const existing = await findSessionById(id);
    
    if (!existing) return reply.status(404).send({ error: "session_not_found" });
    if (existing.userId !== user.sub) return reply.status(403).send({ error: "forbidden" });

    const parseResult = UpdateSessionSchema.safeParse(request.body);
    if (!parseResult.success) return reply.status(400).send({ error: "Invalid request body" });

    const session = await updateSession(id, parseResult.data);
    log.info("sessions.update", "Session updated", { sessionId: id, requestId: request.requestId });

    return { session };
  });

  // Delete session
  app.delete("/api/sessions/:id", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    
    const { id } = request.params as { id: string };
    const existing = await findSessionById(id);
    
    if (!existing) return reply.status(404).send({ error: "session_not_found" });
    if (existing.userId !== user.sub) return reply.status(403).send({ error: "forbidden" });

    await deleteSession(id);
    log.info("sessions.delete", "Session deleted", { sessionId: id, requestId: request.requestId });

    return { success: true };
  });

  // ========== MESSAGES ==========

  // Get messages for session
  app.get("/api/sessions/:id/messages", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    
    const { id } = request.params as { id: string };
    const session = await findSessionById(id);
    
    if (!session) return reply.status(404).send({ error: "session_not_found" });
    if (session.userId !== user.sub) return reply.status(403).send({ error: "forbidden" });

    const messages = await findMessagesBySessionId(id);
    return { messages };
  });

  // Add message to session
  app.post("/api/sessions/:id/messages", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    
    const { id } = request.params as { id: string };
    const session = await findSessionById(id);
    
    if (!session) return reply.status(404).send({ error: "session_not_found" });
    if (session.userId !== user.sub) return reply.status(403).send({ error: "forbidden" });

    const parseResult = CreateMessageSchema.safeParse(request.body);
    if (!parseResult.success) return reply.status(400).send({ error: "Invalid request body" });

    const { role, content, toolCalls, toolName } = parseResult.data;
    const message = await createMessage(id, role, content, toolCalls, toolName);
    
    log.info("messages.create", "Message created", { sessionId: id, role, requestId: request.requestId });
    return { message };
  });

  // ========== SYNC ==========

  // Get changes since timestamp (for sync)
  app.get("/api/sync", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    
    const q = request.query as { since?: string };
    const since = q.since ? new Date(q.since) : new Date(0);
    
    const sessions = await findSessionsByUserId(user.sub, true);
    const changedSessions = sessions.filter(s => new Date(s.updatedAt) > since);

    const sessionMessages: Record<string, unknown[]> = {};
    for (const session of changedSessions) {
      sessionMessages[session.id] = await findMessagesBySessionId(session.id);
    }

    return {
      sessions: changedSessions,
      messages: sessionMessages,
      syncedAt: new Date().toISOString()
    };
  });
}


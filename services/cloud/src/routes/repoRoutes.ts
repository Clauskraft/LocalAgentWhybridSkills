import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { HyperLog } from "../logging/hyperlog.js";
import { TokenPayload } from "../auth/jwtAuth.js";
import { archiveRepo, createRepo, findRepoById, listReposByUserId, updateRepo } from "../db/repoRepository.js";

const RepoPolicySchema = z.object({
  allowRead: z.boolean().optional(),
  allowWrite: z.boolean().optional(),
  allowExec: z.boolean().optional(),
  allowNetwork: z.boolean().optional(),
  allowBrowser: z.boolean().optional(),
  allowClipboard: z.boolean().optional(),
  allowedPaths: z.array(z.string()).optional(),
  blockedPaths: z.array(z.string()).optional(),
}).strict();

const CreateRepoSchema = z.object({
  name: z.string().min(1).max(200),
  localPath: z.string().min(1).max(4096).optional(),
  remoteUrl: z.string().min(1).max(4096).optional(),
  defaultBranch: z.string().min(1).max(200).optional(),
  policy: RepoPolicySchema.optional(),
}).strict();

const UpdateRepoSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  localPath: z.string().min(1).max(4096).nullable().optional(),
  remoteUrl: z.string().min(1).max(4096).nullable().optional(),
  defaultBranch: z.string().min(1).max(200).nullable().optional(),
  policy: RepoPolicySchema.optional(),
  isArchived: z.boolean().optional(),
}).strict();

function requireUser(request: FastifyRequest, reply: FastifyReply): TokenPayload | null {
  const user = (request as unknown as { user: TokenPayload | null }).user;
  if (!user) {
    reply.status(401).send({ error: "unauthorized" });
    return null;
  }
  return user;
}

export function registerRepoRoutes(app: FastifyInstance, log: HyperLog): void {
  // List repos
  app.get("/api/repos", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;

    const q = request.query as { archived?: string };
    const includeArchived = q.archived === "true";

    const repos = await listReposByUserId(user.sub, includeArchived);
    log.info("repos.list", "Repos listed", { userId: user.sub, count: repos.length, requestId: request.requestId });
    return { repos };
  });

  // Create repo
  app.post("/api/repos", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;

    const parsed = CreateRepoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "validation_error", details: parsed.error.errors });
    }

    const repo = await createRepo(user.sub, {
      name: parsed.data.name,
      localPath: parsed.data.localPath ?? null,
      remoteUrl: parsed.data.remoteUrl ?? null,
      defaultBranch: parsed.data.defaultBranch ?? null,
      policy: parsed.data.policy ?? {},
    });

    log.security("repos.create", "Repo created", { userId: user.sub, repoId: repo.id, requestId: request.requestId });
    return { repo };
  });

  // Get repo
  app.get("/api/repos/:id", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;

    const { id } = request.params as { id: string };
    const repo = await findRepoById(id);
    if (!repo) return reply.status(404).send({ error: "repo_not_found" });
    if (repo.userId !== user.sub) return reply.status(403).send({ error: "forbidden" });
    return { repo };
  });

  // Update repo
  app.patch("/api/repos/:id", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;

    const { id } = request.params as { id: string };
    const existing = await findRepoById(id);
    if (!existing) return reply.status(404).send({ error: "repo_not_found" });
    if (existing.userId !== user.sub) return reply.status(403).send({ error: "forbidden" });

    const parsed = UpdateRepoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "validation_error", details: parsed.error.errors });
    }

    const updated = await updateRepo(id, user.sub, parsed.data);
    if (!updated) return reply.status(404).send({ error: "repo_not_found" });

    log.security("repos.update", "Repo updated", { userId: user.sub, repoId: id, requestId: request.requestId });
    return { repo: updated };
  });

  // Archive repo
  app.delete("/api/repos/:id", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;

    const { id } = request.params as { id: string };
    const ok = await archiveRepo(id, user.sub);
    if (!ok) return reply.status(404).send({ error: "repo_not_found" });

    log.security("repos.archive", "Repo archived", { userId: user.sub, repoId: id, requestId: request.requestId });
    return { success: true };
  });
}



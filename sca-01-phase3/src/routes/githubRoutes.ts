import { FastifyInstance } from "fastify";
import { GitHubService } from "../github/githubService.js";
import { HyperLog } from "../logging/hyperlog.js";

export async function registerGitHubRoutes(app: FastifyInstance, log: HyperLog): Promise<void> {
  app.get("/api/github/status", { preHandler: [app.verifyJwt] }, async (_request, reply) => {
    try {
      // We only validate that a token is present server-side. Actual API call is on /repos.
      const hasToken = typeof process.env.GITHUB_TOKEN === "string" && process.env.GITHUB_TOKEN.trim().length > 0;
      return { connected: hasToken };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      reply.code(500);
      return { error: msg };
    }
  });

  app.get("/api/github/repos", { preHandler: [app.verifyJwt] }, async (_request, reply) => {
    try {
      const svc = new GitHubService(log);
      const repos = await svc.listRepos();
      return {
        repos: repos.map((r) => ({
          id: r.id,
          name: r.name,
          full_name: r.full_name,
          private: r.private,
          html_url: r.html_url,
          description: r.description,
          default_branch: r.default_branch,
          pushed_at: r.pushed_at,
          updated_at: r.updated_at,
        }))
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      reply.code(500);
      return { error: msg };
    }
  });
}


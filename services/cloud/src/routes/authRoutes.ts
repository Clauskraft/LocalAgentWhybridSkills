import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createUser, findUserByEmail, verifyPassword } from "../db/userRepository.js";
import { getAuthService } from "../auth/jwtAuth.js";
import { HyperLog } from "../logging/hyperlog.js";

// ============================================================================
// AUTH ROUTES (User Registration & Login)
// ============================================================================

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional()
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export function registerAuthRoutes(app: FastifyInstance, log: HyperLog): void {
  const auth = getAuthService();

  // Register new user
  app.post("/auth/register", async (request, reply) => {
    const parseResult = RegisterSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "validation_error",
        details: parseResult.error.issues
      });
    }

    const { email, password, displayName } = parseResult.data;

    try {
      // Check if user exists
      const existing = await findUserByEmail(email);
      if (existing) {
        return reply.status(409).send({ error: "email_exists" });
      }

      // Create user
      const user = await createUser(email, password, displayName);
      
      // Generate tokens
      const tokens = await auth.generateTokenPair(
        user.id, 
        ["read", "write", "tools:read", "tools:call"],
        user.email
      );

      log.info("auth.register", "User registered", { userId: user.id, email });

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName
        },
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: tokens.tokenType,
        expires_in: tokens.expiresIn
      };
    } catch (e) {
      log.error("auth.register.error", e instanceof Error ? e.message : "Unknown error");
      return reply.status(500).send({ error: "registration_failed" });
    }
  });

  // Login
  app.post("/auth/login", async (request, reply) => {
    const parseResult = LoginSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "validation_error",
        details: parseResult.error.issues
      });
    }

    const { email, password } = parseResult.data;

    try {
      const user = await findUserByEmail(email);
      
      if (!user) {
        return reply.status(401).send({ error: "invalid_credentials" });
      }

      const valid = await verifyPassword(password, user.passwordHash);
      
      if (!valid) {
        log.warn("auth.login.failed", "Invalid password", { email });
        return reply.status(401).send({ error: "invalid_credentials" });
      }

      // Generate tokens
      const tokens = await auth.generateTokenPair(
        user.id,
        ["read", "write", "tools:read", "tools:call"],
        user.email
      );

      log.info("auth.login", "User logged in", { userId: user.id, email });

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName
        },
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: tokens.tokenType,
        expires_in: tokens.expiresIn
      };
    } catch (e) {
      log.error("auth.login.error", e instanceof Error ? e.message : "Unknown error");
      return reply.status(500).send({ error: "login_failed" });
    }
  });

  // Refresh token
  app.post("/auth/refresh", async (request, reply) => {
    const body = request.body as { refresh_token?: string };
    
    if (!body.refresh_token) {
      return reply.status(400).send({ error: "missing_refresh_token" });
    }

    try {
      const tokens = await auth.refreshTokenPair(body.refresh_token);
      
      if (!tokens) {
        return reply.status(401).send({ error: "invalid_refresh_token" });
      }

      log.info("auth.refresh", "Token refreshed");

      return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: tokens.tokenType,
        expires_in: tokens.expiresIn
      };
    } catch (e) {
      log.error("auth.refresh.error", e instanceof Error ? e.message : "Unknown error");
      return reply.status(401).send({ error: "refresh_failed" });
    }
  });

  // Get current user (protected)
  app.get("/auth/me", { preHandler: [app.verifyJwt] }, async (request, reply) => {
    const payload = request.user;
    if (!payload) return reply.status(401).send({ error: "unauthorized" });

    return {
      id: payload.sub,
      email: payload.agentId
    };
  });
}


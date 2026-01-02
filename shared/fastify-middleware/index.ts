/**
 * Shared Fastify middleware plugin
 * Provides CORS and rate limiting configuration for Local Agent services
 * 
 * Note: Services must install @fastify/cors and @fastify/rate-limit dependencies
 */

import type { FastifyPluginOptions } from "fastify";

// Support both Fastify v4 and v5 - use any to avoid version conflicts
type AnyFastifyInstance = any;

export interface MiddlewareConfig {
  cors?: {
    enabled: boolean;
    origins?: string[];
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
  };
  rateLimit?: {
    enabled: boolean;
    max?: number;
    timeWindow?: string;
    keyGenerator?: (req: { headers: Record<string, unknown>; ip?: string }) => string;
    allowList?: (req: { headers: Record<string, unknown> }) => boolean;
  };
}

/**
 * Register CORS and rate limiting middleware
 * Services must import @fastify/cors and @fastify/rate-limit
 */
export async function registerMiddleware(
  app: AnyFastifyInstance,
  config: MiddlewareConfig
): Promise<void> {
  // CORS
  if (config.cors?.enabled && config.cors.origins && config.cors.origins.length > 0) {
    // Dynamic import to avoid requiring dependencies in shared package
    const cors = (await import("@fastify/cors")).default;
    await app.register(cors, {
      origin: config.cors.origins,
      methods: config.cors.methods ?? ["GET", "POST", "OPTIONS"],
      allowedHeaders: config.cors.allowedHeaders ?? ["Content-Type", "Authorization"],
      credentials: config.cors.credentials ?? true,
    });
  }

  // Rate limiting
  if (config.rateLimit?.enabled) {
    // Dynamic import to avoid requiring dependencies in shared package
    const rateLimit = (await import("@fastify/rate-limit")).default;
    await app.register(rateLimit, {
      max: config.rateLimit.max ?? 60,
      timeWindow: config.rateLimit.timeWindow ?? "1 minute",
      ...(config.rateLimit.keyGenerator && { keyGenerator: config.rateLimit.keyGenerator }),
      ...(config.rateLimit.allowList && { allowList: config.rateLimit.allowList }),
    });
  }
}

/**
 * Fastify plugin wrapper for middleware
 */
export default async function middlewarePlugin(
  app: AnyFastifyInstance,
  options: FastifyPluginOptions & MiddlewareConfig
): Promise<void> {
  await registerMiddleware(app, options);
}


/**
 * Rate Limiter for Agent-Mesh
 * Implements sliding window rate limiting for API calls and tool execution
 */

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Strategy: 'sliding' for sliding window, 'fixed' for fixed window */
  strategy?: "sliding" | "fixed";
  /** Whether to skip rate limiting (for development) */
  skip?: boolean;
  /** Custom key generator function */
  keyGenerator?: (context: RateLimitContext) => string;
}

export interface RateLimitContext {
  /** Agent ID making the request */
  agentId: string;
  /** Tool being called (if applicable) */
  toolName?: string;
  /** IP address (for HTTP-based requests) */
  ip?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current count of requests in window */
  current: number;
  /** Maximum allowed requests */
  limit: number;
  /** Milliseconds until window resets */
  resetMs: number;
  /** Remaining requests in current window */
  remaining: number;
}

interface WindowEntry {
  /** Timestamps of requests in current window */
  timestamps: number[];
  /** First request timestamp (for fixed window) */
  windowStart: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  strategy: "sliding",
  skip: false,
};

export class RateLimiter {
  private config: RateLimitConfig;
  private windows: Map<string, WindowEntry> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Start cleanup timer to prevent memory leaks
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.windowMs);
  }

  /**
   * Check if a request should be allowed
   */
  check(context: RateLimitContext): RateLimitResult {
    if (this.config.skip) {
      return {
        allowed: true,
        current: 0,
        limit: this.config.maxRequests,
        resetMs: 0,
        remaining: this.config.maxRequests,
      };
    }

    const key = this.getKey(context);
    const now = Date.now();

    if (this.config.strategy === "fixed") {
      return this.checkFixedWindow(key, now);
    }

    return this.checkSlidingWindow(key, now);
  }

  /**
   * Record a request (call after check passes)
   */
  record(context: RateLimitContext): void {
    if (this.config.skip) return;

    const key = this.getKey(context);
    const now = Date.now();

    let entry = this.windows.get(key);
    if (!entry) {
      entry = { timestamps: [], windowStart: now };
      this.windows.set(key, entry);
    }

    entry.timestamps.push(now);
  }

  /**
   * Combined check and record (convenience method)
   */
  consume(context: RateLimitContext): RateLimitResult {
    const result = this.check(context);
    if (result.allowed) {
      this.record(context);
      // Update remaining after recording
      result.remaining = Math.max(0, result.remaining - 1);
      result.current += 1;
    }
    return result;
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(context: RateLimitContext): void {
    const key = this.getKey(context);
    this.windows.delete(key);
  }

  /**
   * Get current status for a context without consuming
   */
  status(context: RateLimitContext): RateLimitResult {
    return this.check(context);
  }

  /**
   * Stop the cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.windows.clear();
  }

  private getKey(context: RateLimitContext): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(context);
    }

    // Default key: agentId + toolName
    const parts = [context.agentId];
    if (context.toolName) {
      parts.push(context.toolName);
    }
    if (context.ip) {
      parts.push(context.ip);
    }
    return parts.join(":");
  }

  private checkSlidingWindow(key: string, now: number): RateLimitResult {
    const entry = this.windows.get(key);
    const windowStart = now - this.config.windowMs;

    if (!entry) {
      return {
        allowed: true,
        current: 0,
        limit: this.config.maxRequests,
        resetMs: this.config.windowMs,
        remaining: this.config.maxRequests,
      };
    }

    // Filter timestamps within current window
    const validTimestamps = entry.timestamps.filter(ts => ts > windowStart);
    entry.timestamps = validTimestamps;

    const current = validTimestamps.length;
    const allowed = current < this.config.maxRequests;

    // Calculate reset time (when oldest request expires)
    let resetMs = this.config.windowMs;
    if (validTimestamps.length > 0) {
      const oldestInWindow = Math.min(...validTimestamps);
      resetMs = Math.max(0, (oldestInWindow + this.config.windowMs) - now);
    }

    return {
      allowed,
      current,
      limit: this.config.maxRequests,
      resetMs,
      remaining: Math.max(0, this.config.maxRequests - current),
    };
  }

  private checkFixedWindow(key: string, now: number): RateLimitResult {
    let entry = this.windows.get(key);

    // Check if window has expired
    if (entry && (now - entry.windowStart) >= this.config.windowMs) {
      entry = undefined;
      this.windows.delete(key);
    }

    if (!entry) {
      return {
        allowed: true,
        current: 0,
        limit: this.config.maxRequests,
        resetMs: this.config.windowMs,
        remaining: this.config.maxRequests,
      };
    }

    const current = entry.timestamps.length;
    const allowed = current < this.config.maxRequests;
    const resetMs = Math.max(0, (entry.windowStart + this.config.windowMs) - now);

    return {
      allowed,
      current,
      limit: this.config.maxRequests,
      resetMs,
      remaining: Math.max(0, this.config.maxRequests - current),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    for (const [key, entry] of this.windows.entries()) {
      if (this.config.strategy === "sliding") {
        // Remove timestamps outside window
        entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
        if (entry.timestamps.length === 0) {
          this.windows.delete(key);
        }
      } else {
        // Fixed window: remove entire entry if expired
        if ((now - entry.windowStart) >= this.config.windowMs) {
          this.windows.delete(key);
        }
      }
    }
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimitPresets = {
  /** Standard API rate limit: 100 req/min */
  standard: (): RateLimiter => new RateLimiter({
    maxRequests: 100,
    windowMs: 60000,
    strategy: "sliding",
  }),

  /** Strict rate limit: 20 req/min (for sensitive operations) */
  strict: (): RateLimiter => new RateLimiter({
    maxRequests: 20,
    windowMs: 60000,
    strategy: "sliding",
  }),

  /** Burst rate limit: 500 req/min (for high-throughput scenarios) */
  burst: (): RateLimiter => new RateLimiter({
    maxRequests: 500,
    windowMs: 60000,
    strategy: "sliding",
  }),

  /** Tool execution limit: 50 calls/min per agent */
  toolExecution: (): RateLimiter => new RateLimiter({
    maxRequests: 50,
    windowMs: 60000,
    strategy: "sliding",
    keyGenerator: (ctx) => `tool:${ctx.agentId}:${ctx.toolName ?? "default"}`,
  }),

  /** Agent registration limit: 10 registrations/hour */
  agentRegistration: (): RateLimiter => new RateLimiter({
    maxRequests: 10,
    windowMs: 3600000,
    strategy: "fixed",
  }),

  /** Broadcast limit: 5 broadcasts/min (expensive operation) */
  broadcast: (): RateLimiter => new RateLimiter({
    maxRequests: 5,
    windowMs: 60000,
    strategy: "sliding",
  }),
};

/**
 * Middleware factory for rate limiting
 */
export function createRateLimitMiddleware(
  limiter: RateLimiter,
  contextExtractor: (req: unknown) => RateLimitContext
): (req: unknown, next: () => Promise<unknown>) => Promise<unknown> {
  return async (req: unknown, next: () => Promise<unknown>): Promise<unknown> => {
    const context = contextExtractor(req);
    const result = limiter.consume(context);

    if (!result.allowed) {
      const error = new RateLimitExceededError(
        `Rate limit exceeded. Try again in ${Math.ceil(result.resetMs / 1000)}s`,
        result
      );
      throw error;
    }

    return next();
  };
}

/**
 * Custom error for rate limit exceeded
 */
export class RateLimitExceededError extends Error {
  public readonly result: RateLimitResult;
  public readonly retryAfterMs: number;

  constructor(message: string, result: RateLimitResult) {
    super(message);
    this.name = "RateLimitExceededError";
    this.result = result;
    this.retryAfterMs = result.resetMs;
  }
}

// Default singleton instances
export const standardLimiter = RateLimitPresets.standard();
export const toolLimiter = RateLimitPresets.toolExecution();

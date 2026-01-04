import { EventEmitter } from "node:events";
import { HyperLog } from "../logging/hyperlog.js";

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface ErrorEvent {
  id: string;
  timestamp: string;
  source: string;
  operation: string;
  error: Error | string;
  severity: ErrorSeverity;
  context: Record<string, unknown>;
  retryCount: number;
  resolved: boolean;
  resolution?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2
};

export class SelfHealingAdapter extends EventEmitter {
  private readonly log: HyperLog;
  private readonly errors: Map<string, ErrorEvent> = new Map();
  private readonly retryConfig: RetryConfig;
  private errorCounter = 0;

  public constructor(log: HyperLog, retryConfig?: Partial<RetryConfig>) {
    super();
    this.log = log;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Wrap an async operation with automatic retry and error capture
   */
  public async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      source: string;
      operationName: string;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
      onRetry?: (attempt: number, error: Error) => void;
    }
  ): Promise<T> {
    const { source, operationName, severity = "medium", context = {} } = options;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();

        // If we succeeded after retries, log the recovery
        if (attempt > 0) {
          this.log.info("selfhealing.recovered", `Operation recovered after ${attempt} retries`, {
            source,
            operation: operationName,
            attempts: attempt
          });
        }

        return result;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));

        // Log the error
        this.captureError(source, operationName, lastError, severity, {
          ...context,
          attempt,
          maxRetries: this.retryConfig.maxRetries
        });

        // Call retry callback if provided
        if (options.onRetry) {
          options.onRetry(attempt, lastError);
        }

        // If this was the last attempt, throw
        if (attempt >= this.retryConfig.maxRetries) {
          this.log.error("selfhealing.exhausted", `Retries exhausted for ${operationName}`, {
            source,
            operation: operationName,
            error: lastError.message
          });
          throw lastError;
        }

        // Calculate backoff delay
        const delay = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
          this.retryConfig.maxDelayMs
        );

        this.log.warn("selfhealing.retry", `Retrying ${operationName} in ${delay}ms`, {
          source,
          operation: operationName,
          attempt: attempt + 1,
          delay
        });

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError ?? new Error("Unknown error");
  }

  /**
   * Capture an error without automatic retry
   */
  public captureError(
    source: string,
    operation: string,
    error: Error | string,
    severity: ErrorSeverity = "medium",
    context: Record<string, unknown> = {}
  ): ErrorEvent {
    this.errorCounter += 1;
    const errorEvent: ErrorEvent = {
      id: `error-${Date.now()}-${this.errorCounter}`,
      timestamp: new Date().toISOString(),
      source,
      operation,
      error,
      severity,
      context,
      retryCount: 0,
      resolved: false
    };

    this.errors.set(errorEvent.id, errorEvent);
    this.emit("error", errorEvent);

    const errorMessage = error instanceof Error ? error.message : String(error);
    this.log.error("selfhealing.captured", errorMessage, {
      errorId: errorEvent.id,
      source,
      operation,
      severity,
      context
    });

    return errorEvent;
  }

  /**
   * Mark an error as resolved
   */
  public resolveError(errorId: string, resolution: string): boolean {
    const errorEvent = this.errors.get(errorId);
    if (!errorEvent) return false;

    errorEvent.resolved = true;
    errorEvent.resolution = resolution;

    this.log.info("selfhealing.resolved", `Error resolved: ${resolution}`, {
      errorId,
      source: errorEvent.source,
      operation: errorEvent.operation
    });

    this.emit("resolved", errorEvent);
    return true;
  }

  /**
   * Get all unresolved errors
   */
  public getUnresolvedErrors(): ErrorEvent[] {
    return Array.from(this.errors.values()).filter((e) => !e.resolved);
  }

  /**
   * Get error statistics
   */
  public getStats(): {
    total: number;
    resolved: number;
    unresolved: number;
    bySeverity: Record<ErrorSeverity, number>;
    bySource: Record<string, number>;
  } {
    const errors = Array.from(this.errors.values());
    const bySeverity: Record<ErrorSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const bySource: Record<string, number> = {};

    for (const error of errors) {
      bySeverity[error.severity] += 1;
      bySource[error.source] = (bySource[error.source] ?? 0) + 1;
    }

    return {
      total: errors.length,
      resolved: errors.filter((e) => e.resolved).length,
      unresolved: errors.filter((e) => !e.resolved).length,
      bySeverity,
      bySource
    };
  }

  /**
   * Clear resolved errors older than specified age
   */
  public cleanup(maxAgeMs = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, error] of this.errors.entries()) {
      if (error.resolved) {
        const age = now - new Date(error.timestamp).getTime();
        if (age > maxAgeMs) {
          this.errors.delete(id);
          cleaned += 1;
        }
      }
    }

    if (cleaned > 0) {
      this.log.info("selfhealing.cleanup", `Cleaned ${cleaned} resolved errors`);
    }

    return cleaned;
  }
}

// Singleton instance
let globalAdapter: SelfHealingAdapter | null = null;

export function getGlobalAdapter(log?: HyperLog): SelfHealingAdapter {
  if (!globalAdapter) {
    if (!log) {
      throw new Error("SelfHealingAdapter requires HyperLog on first initialization");
    }
    globalAdapter = new SelfHealingAdapter(log);
  }
  return globalAdapter;
}


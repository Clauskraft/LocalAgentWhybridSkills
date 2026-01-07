/**
 * Audit Logging System for Agent-Mesh
 * Structured security audit logging with rotation and export capabilities
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";

export type AuditEventType =
  | "agent.register"
  | "agent.unregister"
  | "agent.connect"
  | "agent.disconnect"
  | "agent.status_change"
  | "tool.call"
  | "tool.result"
  | "tool.error"
  | "auth.token_issued"
  | "auth.token_refreshed"
  | "auth.token_revoked"
  | "auth.failed"
  | "rate_limit.exceeded"
  | "rate_limit.warning"
  | "security.policy_violation"
  | "security.blocked_operation"
  | "mesh.start"
  | "mesh.stop"
  | "mesh.broadcast"
  | "config.change"
  | "system.error";

export type AuditSeverity = "debug" | "info" | "warn" | "error" | "critical";

export interface AuditEvent {
  /** ISO timestamp */
  timestamp: string;
  /** Event type */
  type: AuditEventType;
  /** Severity level */
  severity: AuditSeverity;
  /** Agent ID (if applicable) */
  agentId?: string;
  /** Tool name (if applicable) */
  toolName?: string;
  /** Source IP address (if applicable) */
  sourceIp?: string;
  /** User or client ID (if applicable) */
  userId?: string;
  /** Request ID for correlation */
  requestId?: string;
  /** Event-specific payload */
  payload?: Record<string, unknown>;
  /** Duration in milliseconds (for timed events) */
  durationMs?: number;
  /** Success indicator */
  success?: boolean;
  /** Error message (if applicable) */
  error?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

export interface AuditLogConfig {
  /** Log file path */
  logPath: string;
  /** Enable file logging */
  fileEnabled: boolean;
  /** Enable console logging */
  consoleEnabled: boolean;
  /** Minimum severity to log */
  minSeverity: AuditSeverity;
  /** Maximum file size before rotation (bytes) */
  maxFileSize: number;
  /** Maximum number of rotated files to keep */
  maxFiles: number;
  /** Pretty print JSON (for development) */
  prettyPrint: boolean;
  /** Include stack traces for errors */
  includeStackTraces: boolean;
  /** Custom event handler */
  onEvent?: (event: AuditEvent) => void | Promise<void>;
}

const SEVERITY_LEVELS: Record<AuditSeverity, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

const SEVERITY_COLORS: Record<AuditSeverity, string> = {
  debug: "\x1b[90m",   // Gray
  info: "\x1b[36m",    // Cyan
  warn: "\x1b[33m",    // Yellow
  error: "\x1b[31m",   // Red
  critical: "\x1b[35m", // Magenta
};

const RESET_COLOR = "\x1b[0m";

const DEFAULT_CONFIG: AuditLogConfig = {
  logPath: "./logs/audit.jsonl",
  fileEnabled: true,
  consoleEnabled: true,
  minSeverity: "info",
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  prettyPrint: false,
  includeStackTraces: true,
};

export class AuditLogger {
  private config: AuditLogConfig;
  private buffer: AuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(config: Partial<AuditLogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Ensure log directory exists
    if (this.config.fileEnabled) {
      const dir = dirname(this.config.logPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    // Setup periodic flush
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, 5000);
  }

  /**
   * Log an audit event
   */
  async log(event: Omit<AuditEvent, "timestamp">): Promise<void> {
    const fullEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Check severity threshold
    if (SEVERITY_LEVELS[fullEvent.severity] < SEVERITY_LEVELS[this.config.minSeverity]) {
      return;
    }

    // Console output
    if (this.config.consoleEnabled) {
      this.logToConsole(fullEvent);
    }

    // Buffer for file output
    if (this.config.fileEnabled) {
      this.buffer.push(fullEvent);
    }

    // Custom handler
    if (this.config.onEvent) {
      try {
        await this.config.onEvent(fullEvent);
      } catch (e) {
        console.error("Audit log custom handler error:", e);
      }
    }
  }

  /**
   * Convenience methods for common event types
   */
  async agentConnected(agentId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      type: "agent.connect",
      severity: "info",
      agentId,
      ...(metadata ? { payload: metadata } : {}),
      success: true,
    });
  }

  async agentDisconnected(agentId: string, reason?: string): Promise<void> {
    await this.log({
      type: "agent.disconnect",
      severity: "info",
      agentId,
      payload: { reason },
    });
  }

  async toolCalled(
    agentId: string,
    toolName: string,
    requestId: string,
    args?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      type: "tool.call",
      severity: "info",
      agentId,
      toolName,
      requestId,
      payload: { arguments: args },
    });
  }

  async toolResult(
    agentId: string,
    toolName: string,
    requestId: string,
    success: boolean,
    durationMs: number,
    error?: string
  ): Promise<void> {
    await this.log({
      type: success ? "tool.result" : "tool.error",
      severity: success ? "info" : "error",
      agentId,
      toolName,
      requestId,
      success,
      durationMs,
      ...(error ? { error } : {}),
    });
  }

  async authEvent(
    type: "auth.token_issued" | "auth.token_refreshed" | "auth.token_revoked" | "auth.failed",
    userId?: string,
    sourceIp?: string,
    error?: string
  ): Promise<void> {
    await this.log({
      type,
      severity: type === "auth.failed" ? "warn" : "info",
      ...(userId ? { userId } : {}),
      ...(sourceIp ? { sourceIp } : {}),
      success: type !== "auth.failed",
      ...(error ? { error } : {}),
    });
  }

  async rateLimitExceeded(agentId: string, limit: number, current: number): Promise<void> {
    await this.log({
      type: "rate_limit.exceeded",
      severity: "warn",
      agentId,
      payload: { limit, current },
    });
  }

  async securityViolation(
    agentId: string,
    violation: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      type: "security.policy_violation",
      severity: "error",
      agentId,
      payload: { violation, ...details },
    });
  }

  async systemError(error: Error, context?: Record<string, unknown>): Promise<void> {
    await this.log({
      type: "system.error",
      severity: "error",
      error: error.message,
      context: {
        ...context,
        ...(this.config.includeStackTraces ? { stack: error.stack } : {}),
      },
    });
  }

  /**
   * Flush buffered events to file
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = this.buffer.splice(0);

    try {
      // Check file rotation
      await this.rotateIfNeeded();

      // Write events
      const lines = events.map(e =>
        this.config.prettyPrint
          ? JSON.stringify(e, null, 2)
          : JSON.stringify(e)
      ).join("\n") + "\n";

      appendFileSync(this.config.logPath, lines, "utf8");
    } catch (e) {
      // Re-add events on failure
      this.buffer.unshift(...events);
      console.error("Failed to flush audit log:", e);
    }
  }

  /**
   * Rotate log files if needed
   */
  private async rotateIfNeeded(): Promise<void> {
    if (!existsSync(this.config.logPath)) return;

    const stats = statSync(this.config.logPath);
    if (stats.size < this.config.maxFileSize) return;

    // Rotate existing files
    const dir = dirname(this.config.logPath);
    const base = this.config.logPath.split("/").pop()!.replace(".jsonl", "");

    // Find existing rotated files
    const files = readdirSync(dir)
      .filter(f => f.startsWith(base) && f.endsWith(".jsonl"))
      .sort()
      .reverse();

    // Delete oldest if at max
    while (files.length >= this.config.maxFiles) {
      const oldest = files.pop()!;
      unlinkSync(join(dir, oldest));
    }

    // Rename current to timestamped
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const rotatedName = `${base}.${timestamp}.jsonl`;
    renameSync(this.config.logPath, join(dir, rotatedName));

    // Create new file
    writeFileSync(this.config.logPath, "", "utf8");
  }

  /**
   * Query recent events (from current log file)
   */
  async query(options: {
    type?: AuditEventType;
    agentId?: string;
    severity?: AuditSeverity;
    since?: Date;
    limit?: number;
  }): Promise<AuditEvent[]> {
    if (!existsSync(this.config.logPath)) return [];

    const { readFileSync } = await import("node:fs");
    const content = readFileSync(this.config.logPath, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);

    let events: AuditEvent[] = lines.map(line => {
      try {
        return JSON.parse(line) as AuditEvent;
      } catch {
        return null;
      }
    }).filter((e): e is AuditEvent => e !== null);

    // Apply filters
    if (options.type) {
      events = events.filter(e => e.type === options.type);
    }
    if (options.agentId) {
      events = events.filter(e => e.agentId === options.agentId);
    }
    if (options.severity) {
      const minLevel = SEVERITY_LEVELS[options.severity];
      events = events.filter(e => SEVERITY_LEVELS[e.severity] >= minLevel);
    }
    if (options.since) {
      const sinceDate = options.since;
      events = events.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    // Apply limit (from most recent)
    if (options.limit && events.length > options.limit) {
      events = events.slice(-options.limit);
    }

    return events;
  }

  /**
   * Export events to different formats
   */
  async export(format: "json" | "csv" | "jsonl", events?: AuditEvent[]): Promise<string> {
    const data = events || await this.query({});

    switch (format) {
      case "json":
        return JSON.stringify(data, null, 2);

      case "csv": {
        if (data.length === 0) return "";
        const headers = ["timestamp", "type", "severity", "agentId", "toolName", "success", "error"];
        const rows = data.map(e => headers.map(h => {
          const val = e[h as keyof AuditEvent];
          return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val ?? "";
        }).join(","));
        return [headers.join(","), ...rows].join("\n");
      }

      case "jsonl":
        return data.map(e => JSON.stringify(e)).join("\n");

      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush();
  }

  private logToConsole(event: AuditEvent): void {
    const color = SEVERITY_COLORS[event.severity];
    const prefix = `${color}[AUDIT:${event.severity.toUpperCase()}]${RESET_COLOR}`;
    const agentInfo = event.agentId ? ` [${event.agentId}]` : "";
    const toolInfo = event.toolName ? ` tool:${event.toolName}` : "";
    const successInfo = event.success !== undefined
      ? event.success ? " ✓" : " ✗"
      : "";
    const durationInfo = event.durationMs !== undefined ? ` (${event.durationMs}ms)` : "";

    console.log(
      `${prefix} ${event.timestamp} ${event.type}${agentInfo}${toolInfo}${successInfo}${durationInfo}`
    );

    if (event.error) {
      console.log(`  ${color}Error: ${event.error}${RESET_COLOR}`);
    }

    if (event.payload && Object.keys(event.payload).length > 0) {
      console.log(`  ${JSON.stringify(event.payload)}`);
    }
  }
}

/**
 * Audit log statistics
 */
export interface AuditStats {
  totalEvents: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byAgent: Record<string, number>;
  errorRate: number;
  avgDurationMs: number;
}

export async function computeAuditStats(logger: AuditLogger, since?: Date): Promise<AuditStats> {
  const queryOpts: Parameters<AuditLogger["query"]>[0] = {};
  if (since) {
    queryOpts.since = since;
  }
  const events = await logger.query(queryOpts);

  const stats: AuditStats = {
    totalEvents: events.length,
    byType: {},
    bySeverity: {},
    byAgent: {},
    errorRate: 0,
    avgDurationMs: 0,
  };

  let errorCount = 0;
  let totalDuration = 0;
  let durationCount = 0;

  for (const event of events) {
    // By type
    stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;

    // By severity
    stats.bySeverity[event.severity] = (stats.bySeverity[event.severity] || 0) + 1;

    // By agent
    if (event.agentId) {
      stats.byAgent[event.agentId] = (stats.byAgent[event.agentId] || 0) + 1;
    }

    // Error rate
    if (event.success === false || event.severity === "error" || event.severity === "critical") {
      errorCount++;
    }

    // Average duration
    if (event.durationMs !== undefined) {
      totalDuration += event.durationMs;
      durationCount++;
    }
  }

  stats.errorRate = events.length > 0 ? errorCount / events.length : 0;
  stats.avgDurationMs = durationCount > 0 ? totalDuration / durationCount : 0;

  return stats;
}

// Default singleton instance
export const auditLogger = new AuditLogger();

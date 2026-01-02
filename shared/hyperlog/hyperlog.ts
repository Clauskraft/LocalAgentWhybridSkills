import fs from "node:fs";
import path from "node:path";

export type HyperLogLevel = "debug" | "info" | "warn" | "error" | "security";

export interface HyperLogEvent {
  ts: string;
  level: HyperLogLevel;
  event: string;
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
  // Backward compatibility: support 'code' field (maps to 'event')
  code?: string;
}

export class HyperLog {
  private readonly logFilePath: string;
  private readonly securityLogPath: string;

  public constructor(logDir: string, fileName = "hyperlog.jsonl") {
    const dir = path.resolve(logDir);
    fs.mkdirSync(dir, { recursive: true });
    this.logFilePath = path.join(dir, fileName);
    this.securityLogPath = path.join(dir, "security.jsonl");
  }

  public write(evt: HyperLogEvent): void {
    // Avoid mutating caller's object; enrich on a copy
    // Support backward compatibility: if 'code' is provided but 'event' is not, use 'code' as 'event'
    const eventValue = evt.event ?? evt.code ?? "unknown";
    const requestIdValue = evt.requestId ?? (typeof evt.context?.requestId === "string" ? (evt.context.requestId as string) : undefined);

    // Remove 'code' from output if 'event' is present (normalize to 'event')
    const normalized: {
      ts: string;
      level: HyperLogLevel;
      event: string;
      message: string;
      context?: Record<string, unknown>;
      requestId?: string;
    } = {
      ts: evt.ts,
      level: evt.level,
      event: eventValue,
      message: evt.message,
    };
    
    if (evt.context !== undefined) {
      normalized.context = evt.context;
    }
    
    if (requestIdValue !== undefined) {
      normalized.requestId = requestIdValue;
    }

    const line = JSON.stringify(normalized);
    process.stderr.write(line + "\n");
    fs.appendFileSync(this.logFilePath, line + "\n", { encoding: "utf8" });
    
    // Security events go to separate file for compliance
    if (normalized.level === "security") {
      fs.appendFileSync(this.securityLogPath, line + "\n", { encoding: "utf8" });
    }
  }

  /**
   * Log an info event.
   * @param eventOrCode - Event code/identifier (backward compatible: accepts 'code' name)
   * @param message - Human-readable message
   * @param context - Optional context object
   */
  public info(eventOrCode: string, message: string, context?: Record<string, unknown>): void {
    const evt: HyperLogEvent = { ts: new Date().toISOString(), level: "info", event: eventOrCode, message };
    if (context !== undefined) {
      evt.context = context;
    }
    this.write(evt);
  }

  /**
   * Log a warning event.
   * @param eventOrCode - Event code/identifier (backward compatible: accepts 'code' name)
   * @param message - Human-readable message
   * @param context - Optional context object
   */
  public warn(eventOrCode: string, message: string, context?: Record<string, unknown>): void {
    const evt: HyperLogEvent = { ts: new Date().toISOString(), level: "warn", event: eventOrCode, message };
    if (context !== undefined) {
      evt.context = context;
    }
    this.write(evt);
  }

  /**
   * Log an error event.
   * @param eventOrCode - Event code/identifier (backward compatible: accepts 'code' name)
   * @param message - Human-readable message
   * @param context - Optional context object
   */
  public error(eventOrCode: string, message: string, context?: Record<string, unknown>): void {
    const evt: HyperLogEvent = { ts: new Date().toISOString(), level: "error", event: eventOrCode, message };
    if (context !== undefined) {
      evt.context = context;
    }
    this.write(evt);
  }

  /**
   * Log a security event.
   * @param eventOrCode - Event code/identifier (backward compatible: accepts 'code' name)
   * @param message - Human-readable message
   * @param context - Optional context object
   */
  public security(eventOrCode: string, message: string, context?: Record<string, unknown>): void {
    const evt: HyperLogEvent = { ts: new Date().toISOString(), level: "security", event: eventOrCode, message };
    if (context !== undefined) {
      evt.context = context;
    }
    this.write(evt);
  }

  /**
   * Log a debug event (only available in consolidated version).
   * @param eventOrCode - Event code/identifier
   * @param message - Human-readable message
   * @param context - Optional context object
   */
  public debug(eventOrCode: string, message: string, context?: Record<string, unknown>): void {
    const evt: HyperLogEvent = { ts: new Date().toISOString(), level: "debug", event: eventOrCode, message };
    if (context !== undefined) {
      evt.context = context;
    }
    this.write(evt);
  }
}


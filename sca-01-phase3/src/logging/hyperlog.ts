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
    // Promote requestId from context if not set
    if (!evt.requestId && evt.context && typeof evt.context.requestId === "string") {
      evt.requestId = evt.context.requestId as string;
    }
    const line = JSON.stringify(evt);
    process.stderr.write(line + "\n");
    fs.appendFileSync(this.logFilePath, line + "\n", { encoding: "utf8" });
    
    // Security events go to separate file for compliance
    if (evt.level === "security") {
      fs.appendFileSync(this.securityLogPath, line + "\n", { encoding: "utf8" });
    }
  }

  public info(event: string, message: string, context?: Record<string, unknown>): void {
    this.write({ ts: new Date().toISOString(), level: "info", event, message, context });
  }

  public warn(event: string, message: string, context?: Record<string, unknown>): void {
    this.write({ ts: new Date().toISOString(), level: "warn", event, message, context });
  }

  public error(event: string, message: string, context?: Record<string, unknown>): void {
    this.write({ ts: new Date().toISOString(), level: "error", event, message, context });
  }

  public security(event: string, message: string, context?: Record<string, unknown>): void {
    this.write({ ts: new Date().toISOString(), level: "security", event, message, context });
  }
}


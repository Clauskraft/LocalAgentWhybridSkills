import fs from "node:fs";
import path from "node:path";

export type HyperLogLevel = "debug" | "info" | "warn" | "error";

export interface HyperLogEvent {
  ts: string;
  level: HyperLogLevel;
  event: string;
  message: string;
  context?: Record<string, unknown> | undefined;
}

export class HyperLog {
  private readonly logFilePath: string;

  public constructor(logDir: string, fileName = "hyperlog.jsonl") {
    const dir = path.resolve(logDir);
    fs.mkdirSync(dir, { recursive: true });
    this.logFilePath = path.join(dir, fileName);
  }

  public write(evt: HyperLogEvent): void {
    const line = JSON.stringify(evt);
    // stderr for runtime observability
    process.stderr.write(line + "\n");
    // append for audit trail
    fs.appendFileSync(this.logFilePath, line + "\n", { encoding: "utf8" });
  }

  public info(event: string, message: string, context?: Record<string, unknown>): void {
    const evt: HyperLogEvent = { ts: new Date().toISOString(), level: "info", event, message };
    if (context !== undefined) {
      evt.context = context;
    }
    this.write(evt);
  }

  public warn(event: string, message: string, context?: Record<string, unknown>): void {
    const evt: HyperLogEvent = { ts: new Date().toISOString(), level: "warn", event, message };
    if (context !== undefined) {
      evt.context = context;
    }
    this.write(evt);
  }

  public error(event: string, message: string, context?: Record<string, unknown>): void {
    const evt: HyperLogEvent = { ts: new Date().toISOString(), level: "error", event, message };
    if (context !== undefined) {
      evt.context = context;
    }
    this.write(evt);
  }

  public debug(event: string, message: string, context?: Record<string, unknown>): void {
    const evt: HyperLogEvent = { ts: new Date().toISOString(), level: "debug", event, message };
    if (context !== undefined) {
      evt.context = context;
    }
    this.write(evt);
  }
}

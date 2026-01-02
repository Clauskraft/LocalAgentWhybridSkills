import fs from "node:fs";
import path from "node:path";

export type HyperLogLevel = "info" | "warn" | "error" | "security";

export interface HyperLogEvent {
  ts: string;
  level: HyperLogLevel;
  code: string;
  message: string;
  context?: Record<string, unknown> | undefined;
}

export class HyperLog {
  private readonly logFilePath: string;
  private readonly securityLogPath: string;

  constructor(logDir: string, fileName: string) {
    fs.mkdirSync(logDir, { recursive: true });
    this.logFilePath = path.join(logDir, fileName);
    this.securityLogPath = path.join(logDir, "security.hyperlog.jsonl");
  }

  public info(code: string, message: string, context?: Record<string, unknown>): void {
    this.write({
      ts: new Date().toISOString(),
      level: "info",
      code,
      message,
      ...(context ? { context } : {})
    });
  }

  public warn(code: string, message: string, context?: Record<string, unknown>): void {
    this.write({
      ts: new Date().toISOString(),
      level: "warn",
      code,
      message,
      ...(context ? { context } : {})
    });
  }

  public error(code: string, message: string, context?: Record<string, unknown>): void {
    this.write({
      ts: new Date().toISOString(),
      level: "error",
      code,
      message,
      ...(context ? { context } : {})
    });
  }

  public security(code: string, message: string, context?: Record<string, unknown>): void {
    this.write({
      ts: new Date().toISOString(),
      level: "security",
      code,
      message,
      ...(context ? { context } : {})
    });
  }

  private write(evt: HyperLogEvent): void {
    const line = JSON.stringify(evt);
    fs.appendFileSync(this.logFilePath, line + "\n", { encoding: "utf8" });
    if (evt.level === "security") {
      fs.appendFileSync(this.securityLogPath, line + "\n", { encoding: "utf8" });
    }
  }
}



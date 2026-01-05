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
  private readonly offlineBufferPath: string;
  private isOnline: boolean = true;
  private offlineBuffer: HyperLogEvent[] = [];
  private flushCallback?: (events: HyperLogEvent[]) => Promise<void>;

  public constructor(logDir: string, fileName = "hyperlog.jsonl") {
    const dir = path.resolve(logDir);
    fs.mkdirSync(dir, { recursive: true });
    this.logFilePath = path.join(dir, fileName);
    this.securityLogPath = path.join(dir, "security.jsonl");
    this.offlineBufferPath = path.join(dir, "offline-buffer.jsonl");

    // Load any existing offline buffer
    this.loadOfflineBuffer();
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

    if (this.isOnline) {
      // Write directly to file when online
      fs.appendFileSync(this.logFilePath, line + "\n", { encoding: "utf8" });

      // Security events go to separate file for compliance
      if (normalized.level === "security") {
        fs.appendFileSync(this.securityLogPath, line + "\n", { encoding: "utf8" });
      }
    } else {
      // Buffer when offline
      this.offlineBuffer.push(normalized);
      this.saveOfflineBuffer();
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

  /**
   * Set online/offline status and optionally flush buffered logs
   * @param online - Whether the system is online
   * @param flushNow - Whether to flush buffered logs immediately (only when coming online)
   */
  public setOnlineStatus(online: boolean, flushNow = true): void {
    const wasOffline = !this.isOnline;
    this.isOnline = online;

    if (online && wasOffline && flushNow) {
      this.flushOfflineBuffer();
    }
  }

  /**
   * Set callback for flushing logs to remote storage (e.g., cloud)
   * @param callback - Function that receives batched events and sends them remotely
   */
  public setFlushCallback(callback: (events: HyperLogEvent[]) => Promise<void>): void {
    this.flushCallback = callback;
  }

  /**
   * Flush buffered offline logs
   */
  public async flushOfflineBuffer(): Promise<void> {
    if (this.offlineBuffer.length === 0) {
      return;
    }

    try {
      if (this.flushCallback) {
        // Send to remote storage
        await this.flushCallback([...this.offlineBuffer]);
      }

      // Write to local files
      for (const evt of this.offlineBuffer) {
        const line = JSON.stringify(evt);
        fs.appendFileSync(this.logFilePath, line + "\n", { encoding: "utf8" });

        if (evt.level === "security") {
          fs.appendFileSync(this.securityLogPath, line + "\n", { encoding: "utf8" });
        }
      }

      // Clear buffer and remove buffer file
      this.offlineBuffer = [];
      try {
        fs.unlinkSync(this.offlineBufferPath);
      } catch {
        // Buffer file might not exist
      }
    } catch (error) {
      // If flush fails, keep buffer for next attempt
      console.warn("Failed to flush offline buffer:", error);
    }
  }

  /**
   * Get current offline buffer size
   */
  public getOfflineBufferSize(): number {
    return this.offlineBuffer.length;
  }

  /**
   * Force immediate flush regardless of online status
   */
  public async forceFlush(): Promise<void> {
    await this.flushOfflineBuffer();
  }

  private loadOfflineBuffer(): void {
    try {
      const content = fs.readFileSync(this.offlineBufferPath, 'utf8');
      const lines = content.trim().split('\n');
      this.offlineBuffer = lines
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .filter((evt): evt is HyperLogEvent => evt && typeof evt.ts === 'string');
    } catch {
      // No existing buffer file
      this.offlineBuffer = [];
    }
  }

  private saveOfflineBuffer(): void {
    try {
      const content = this.offlineBuffer.map(evt => JSON.stringify(evt)).join('\n') + '\n';
      fs.writeFileSync(this.offlineBufferPath, content, { encoding: 'utf8' });
    } catch (error) {
      console.warn("Failed to save offline buffer:", error);
    }
  }
}


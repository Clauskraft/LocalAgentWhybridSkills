import { EventEmitter } from "node:events";
import type { RiskLevel, PolicyDecision } from "../security/policy.js";

export interface ApprovalRequest {
  id: string;
  timestamp: string;
  operation: string;
  description: string;
  riskLevel: RiskLevel;
  policyDecision: PolicyDecision;
  context: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "timeout";
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ApprovalQueueEvents {
  request: (request: ApprovalRequest) => void;
  resolved: (request: ApprovalRequest) => void;
}

export class ApprovalQueue extends EventEmitter {
  private readonly pending: Map<string, ApprovalRequest> = new Map();
  private readonly history: ApprovalRequest[] = [];
  private counter = 0;
  private readonly defaultTimeout: number;

  public constructor(defaultTimeoutMs = 300_000) {
    super();
    this.defaultTimeout = defaultTimeoutMs;
  }

  public createRequest(
    operation: string,
    description: string,
    riskLevel: RiskLevel,
    policyDecision: PolicyDecision,
    context: Record<string, unknown> = {}
  ): ApprovalRequest {
    this.counter += 1;
    const request: ApprovalRequest = {
      id: `approval-${Date.now()}-${this.counter}`,
      timestamp: new Date().toISOString(),
      operation,
      description,
      riskLevel,
      policyDecision,
      context,
      status: "pending"
    };

    this.pending.set(request.id, request);
    this.emit("request", request);

    return request;
  }

  public async waitForApproval(
    request: ApprovalRequest,
    timeoutMs?: number
  ): Promise<boolean> {
    const timeout = timeoutMs ?? this.defaultTimeout;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        request.status = "timeout";
        request.resolvedAt = new Date().toISOString();
        this.pending.delete(request.id);
        this.history.push(request);
        this.emit("resolved", request);
        resolve(false);
      }, timeout);

      const checkResolved = () => {
        const current = this.pending.get(request.id);
        if (!current || current.status !== "pending") {
          clearTimeout(timer);
          resolve(current?.status === "approved");
        }
      };

      // Check every 100ms
      const interval = setInterval(() => {
        checkResolved();
        if (!this.pending.has(request.id)) {
          clearInterval(interval);
        }
      }, 100);
    });
  }

  public approve(requestId: string, approvedBy = "user"): boolean {
    const request = this.pending.get(requestId);
    if (!request) return false;

    request.status = "approved";
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = approvedBy;

    this.pending.delete(requestId);
    this.history.push(request);
    this.emit("resolved", request);

    return true;
  }

  public reject(requestId: string, rejectedBy = "user"): boolean {
    const request = this.pending.get(requestId);
    if (!request) return false;

    request.status = "rejected";
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = rejectedBy;

    this.pending.delete(requestId);
    this.history.push(request);
    this.emit("resolved", request);

    return true;
  }

  public getPending(): ApprovalRequest[] {
    return Array.from(this.pending.values());
  }

  public getHistory(limit = 100): ApprovalRequest[] {
    return this.history.slice(-limit);
  }

  public approveAll(approvedBy = "user"): number {
    let count = 0;
    for (const id of this.pending.keys()) {
      if (this.approve(id, approvedBy)) {
        count += 1;
      }
    }
    return count;
  }

  public rejectAll(rejectedBy = "user"): number {
    let count = 0;
    for (const id of this.pending.keys()) {
      if (this.reject(id, rejectedBy)) {
        count += 1;
      }
    }
    return count;
  }
}

// Singleton instance for CLI/UI sharing
export const globalApprovalQueue = new ApprovalQueue();


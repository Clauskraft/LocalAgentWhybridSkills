import { randomUUID } from "node:crypto";
import path from "node:path";
import type { HyperLog } from "../logging/hyperlog.js";
import {
  evaluateFileReadPolicy,
  evaluateFileWritePolicy,
  evaluateShellPolicy,
  evaluateNetworkPolicy,
  type PolicyContext,
  type PolicyDecision
} from "./policy.js";
import { globalApprovalQueue } from "../approval/approvalQueue.js";
import { executeShellRaw, type ShellOptions, type ShellResult } from "../tools/shellTools.js";
import { readFileRaw, writeFileRaw } from "../tools/fileTools.js";

type ExecResult<T> = { ok: true; value: T; operationId: string } | { ok: false; error: string; operationId: string };

function newOperationId(): string {
  try {
    return `op-${randomUUID()}`;
  } catch {
    return `op-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export class EnforcedExecutor {
  private readonly ctx: PolicyContext;
  private readonly log: HyperLog;

  public constructor(ctx: PolicyContext, log: HyperLog) {
    this.ctx = ctx;
    this.log = log;
  }

  private audit(stage: string, operationId: string, payload: Record<string, unknown>): void {
    this.log.security(`audit.${stage}`, `audit.${stage}`, { operationId, ...payload });
  }

  private async requireApprovalIfNeeded(
    operationId: string,
    operation: string,
    description: string,
    policy: PolicyDecision,
    context: Record<string, unknown>
  ): Promise<{ approved: boolean; approvalId?: string }> {
    if (policy.allowed) return { approved: true };
    if (!policy.requiresApproval) return { approved: false };

    const request = globalApprovalQueue.createRequest(
      operation,
      description,
      policy.riskLevel,
      policy,
      { operationId, ...context }
    );

    this.audit("approval_requested", operationId, { approvalId: request.id, operation, riskLevel: policy.riskLevel });

    const approved = await globalApprovalQueue.waitForApproval(request);
    this.audit("approval_resolved", operationId, { approvalId: request.id, approved, operation });

    return { approved, approvalId: request.id };
  }

  public async readFile(filePath: string, maxSize = 10_000_000): Promise<ExecResult<string>> {
    const operationId = newOperationId();
    const absPath = path.resolve(filePath);

    const policy = evaluateFileReadPolicy(absPath, this.ctx);
    this.audit("policy_decision", operationId, { operation: "file_read", target: absPath, policy });

    const approval = await this.requireApprovalIfNeeded(operationId, "file_read", `Read file: ${absPath}`, policy, { path: absPath });
    if (!approval.approved) return { ok: false, error: policy.reason, operationId };

    const result = await readFileRaw(absPath, this.log, maxSize);
    if (result.error) {
      this.audit("execution_failed", operationId, { operation: "file_read", target: absPath, error: result.error });
      return { ok: false, error: result.error, operationId };
    }
    this.audit("execution_ok", operationId, { operation: "file_read", target: absPath, bytes: (result.content ?? "").length });
    return { ok: true, value: result.content ?? "", operationId };
  }

  public async writeFile(filePath: string, content: string): Promise<ExecResult<true>> {
    const operationId = newOperationId();
    const absPath = path.resolve(filePath);

    const policy = evaluateFileWritePolicy(absPath, this.ctx);
    this.audit("policy_decision", operationId, { operation: "file_write", target: absPath, policy, bytes: content.length });

    const approval = await this.requireApprovalIfNeeded(operationId, "file_write", `Write file: ${absPath}`, policy, { path: absPath, contentLength: content.length });
    if (!approval.approved) return { ok: false, error: policy.reason, operationId };

    const result = await writeFileRaw(absPath, content, this.log);
    if (result.error) {
      this.audit("execution_failed", operationId, { operation: "file_write", target: absPath, error: result.error });
      return { ok: false, error: result.error, operationId };
    }
    this.audit("execution_ok", operationId, { operation: "file_write", target: absPath, bytes: content.length });
    return { ok: true, value: true, operationId };
  }

  public async runShell(command: string, options: ShellOptions = {}): Promise<ExecResult<ShellResult>> {
    const operationId = newOperationId();

    const policy = evaluateShellPolicy(command, this.ctx);
    this.audit("policy_decision", operationId, { operation: "shell", target: command.substring(0, 200), policy });

    const approval = await this.requireApprovalIfNeeded(operationId, "shell", `Execute command: ${command}`, policy, { command, cwd: options.cwd });
    if (!approval.approved) return { ok: false, error: policy.reason, operationId };

    const result = await executeShellRaw(command, options, this.log);
    if (result.error) {
      this.audit("execution_failed", operationId, { operation: "shell", error: result.error });
      return { ok: false, error: result.error, operationId };
    }
    this.audit("execution_ok", operationId, {
      operation: "shell",
      exitCode: result.result?.exitCode,
      timedOut: result.result?.timedOut,
      durationMs: result.result?.duration
    });
    return { ok: true, value: result.result as ShellResult, operationId };
  }

  public async httpRequest(
    url: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: string,
    headers?: Record<string, string>
  ): Promise<ExecResult<{ status: number; body: string }>> {
    const operationId = newOperationId();

    const policy = evaluateNetworkPolicy(url, this.ctx);
    this.audit("policy_decision", operationId, { operation: "http", target: url, policy, method });

    const approval = await this.requireApprovalIfNeeded(operationId, "http", `HTTP ${method} ${url}`, policy, { url, method });
    if (!approval.approved) return { ok: false, error: policy.reason, operationId };

    try {
      const opts: RequestInit = { method, headers: headers as HeadersInit };
      if (body && (method === "POST" || method === "PUT")) opts.body = body;
      const res = await fetch(url, opts);
      const txt = await res.text();
      this.audit("execution_ok", operationId, { operation: "http", target: url, status: res.status, bodyLength: txt.length });
      return { ok: true, value: { status: res.status, body: txt }, operationId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      this.audit("execution_failed", operationId, { operation: "http", target: url, error: msg });
      return { ok: false, error: msg, operationId };
    }
  }
}



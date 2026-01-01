import { spawn } from "node:child_process";
import os from "node:os";
import type { HyperLog } from "../logging/hyperlog.js";
import { evaluateShellPolicy, type PolicyContext } from "../security/policy.js";
import { globalApprovalQueue } from "../approval/approvalQueue.js";

export interface ShellResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  duration: number;
}

export interface ShellOptions {
  cwd?: string;
  timeout?: number;
  shell?: "powershell" | "bash" | "cmd" | "auto";
}

function getDefaultShell(): string {
  const platform = os.platform();
  if (platform === "win32") {
    return "powershell.exe";
  }
  return "/bin/bash";
}

function getShellCommand(shell: "powershell" | "bash" | "cmd" | "auto"): { cmd: string; args: string[] } {
  switch (shell) {
    case "powershell":
      return { cmd: "powershell.exe", args: ["-NoProfile", "-NonInteractive", "-Command"] };
    case "bash":
      return { cmd: "/bin/bash", args: ["-c"] };
    case "cmd":
      return { cmd: "cmd.exe", args: ["/c"] };
    case "auto":
    default:
      if (os.platform() === "win32") {
        return { cmd: "powershell.exe", args: ["-NoProfile", "-NonInteractive", "-Command"] };
      }
      return { cmd: "/bin/bash", args: ["-c"] };
  }
}

export async function executeShell(
  command: string,
  options: ShellOptions,
  ctx: PolicyContext,
  log: HyperLog
): Promise<{ result?: ShellResult; error?: string; requiresApproval?: boolean; approvalId?: string }> {
  // Evaluate policy
  const policy = evaluateShellPolicy(command, ctx);

  log.security("shell.policy", `Shell policy evaluated: ${policy.reason}`, {
    command: command.substring(0, 100),
    riskLevel: policy.riskLevel,
    allowed: policy.allowed
  });

  if (!policy.allowed) {
    if (policy.requiresApproval) {
      const request = globalApprovalQueue.createRequest(
        "shell",
        `Execute command: ${command}`,
        policy.riskLevel,
        policy,
        { command, cwd: options.cwd }
      );

      log.info("shell.approval_required", "Waiting for approval", { approvalId: request.id });

      const approved = await globalApprovalQueue.waitForApproval(request);
      if (!approved) {
        return { error: `Shell command rejected or timed out: ${command}` };
      }

      log.security("shell.approved", "Command approved", { approvalId: request.id, command });
    } else {
      return { error: policy.reason };
    }
  }

  // Execute command
  const { cmd, args } = getShellCommand(options.shell ?? "auto");
  const timeout = options.timeout ?? 300_000;
  const cwd = options.cwd ?? process.cwd();

  const startTime = Date.now();

  return new Promise((resolve) => {
    const child = spawn(cmd, [...args, command], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeout);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (err: Error) => {
      clearTimeout(timer);
      log.error("shell.error", err.message, { command });
      resolve({ error: err.message });
    });

    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;

      const result: ShellResult = {
        exitCode: code,
        stdout,
        stderr,
        timedOut,
        duration
      };

      log.info("shell.completed", `Command completed`, {
        command: command.substring(0, 50),
        exitCode: code,
        duration,
        timedOut
      });

      resolve({ result });
    });
  });
}


import os from "node:os";
import type { HyperLog } from "../logging/hyperlog.js";
import { evaluateProcessKillPolicy, type PolicyContext } from "../security/policy.js";
import { globalApprovalQueue } from "../approval/approvalQueue.js";
import { executeShell } from "./shellTools.js";

export interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  release: string;
  uptime: number;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  homeDir: string;
  tempDir: string;
  username: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu?: number;
  memory?: number;
  user?: string;
}

export interface NetworkInterface {
  name: string;
  addresses: Array<{
    address: string;
    family: string;
    internal: boolean;
  }>;
}

export function getSystemInfo(): SystemInfo {
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    release: os.release(),
    uptime: os.uptime(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    homeDir: os.homedir(),
    tempDir: os.tmpdir(),
    username: os.userInfo().username
  };
}

export function getNetworkInterfaces(): NetworkInterface[] {
  const interfaces = os.networkInterfaces();
  const result: NetworkInterface[] = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;

    result.push({
      name,
      addresses: addrs.map((a) => ({
        address: a.address,
        family: a.family,
        internal: a.internal
      }))
    });
  }

  return result;
}

export function getEnvironmentVariables(filter?: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const regex = filter ? new RegExp(filter, "i") : null;

  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;

    // Never expose sensitive vars
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("secret") ||
      lowerKey.includes("password") ||
      lowerKey.includes("token") ||
      lowerKey.includes("key") ||
      lowerKey.includes("credential")
    ) {
      vars[key] = "[REDACTED]";
      continue;
    }

    if (!regex || regex.test(key)) {
      vars[key] = value;
    }
  }

  return vars;
}

export async function listProcesses(
  ctx: PolicyContext,
  log: HyperLog
): Promise<{ processes?: ProcessInfo[]; error?: string }> {
  const platform = os.platform();
  let command: string;

  if (platform === "win32") {
    command = "Get-Process | Select-Object Id, ProcessName, CPU, WorkingSet64 | ConvertTo-Json";
  } else {
    command = "ps aux --no-headers | awk '{print $2,$11,$3,$4}'";
  }

  const result = await executeShell(command, { shell: platform === "win32" ? "powershell" : "bash" }, ctx, log);

  if (result.error) {
    return { error: result.error };
  }

  if (!result.result) {
    return { error: "No result from process listing" };
  }

  try {
    const processes: ProcessInfo[] = [];

    if (platform === "win32") {
      const data = JSON.parse(result.result.stdout);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        processes.push({
          pid: item.Id,
          name: item.ProcessName,
          cpu: item.CPU,
          memory: item.WorkingSet64
        });
      }
    } else {
      const lines = result.result.stdout.trim().split("\n");
      for (const line of lines) {
        const [pid, name, cpu, mem] = line.trim().split(/\s+/);
        if (pid && name) {
          processes.push({
            pid: parseInt(pid, 10),
            name,
            cpu: parseFloat(cpu ?? "0"),
            memory: parseFloat(mem ?? "0")
          });
        }
      }
    }

    return { processes };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Parse error";
    return { error: msg };
  }
}

export async function killProcess(
  pid: number,
  processName: string,
  ctx: PolicyContext,
  log: HyperLog
): Promise<{ success?: boolean; error?: string }> {
  const policy = evaluateProcessKillPolicy(processName, ctx);

  log.security("process.kill.policy", `Process kill policy: ${policy.reason}`, {
    pid,
    processName,
    riskLevel: policy.riskLevel,
    allowed: policy.allowed
  });

  if (!policy.allowed) {
    if (policy.requiresApproval) {
      const request = globalApprovalQueue.createRequest(
        "process_kill",
        `Kill process: ${processName} (PID: ${pid})`,
        policy.riskLevel,
        policy,
        { pid, processName }
      );

      const approved = await globalApprovalQueue.waitForApproval(request);
      if (!approved) {
        return { error: `Process kill rejected: ${processName}` };
      }

      log.security("process.kill.approved", "Kill approved", { pid, processName });
    } else {
      return { error: policy.reason };
    }
  }

  const platform = os.platform();
  let command: string;

  if (platform === "win32") {
    command = `Stop-Process -Id ${pid} -Force`;
  } else {
    command = `kill -9 ${pid}`;
  }

  const result = await executeShell(command, { shell: platform === "win32" ? "powershell" : "bash" }, ctx, log);

  if (result.error) {
    return { error: result.error };
  }

  log.info("process.killed", `Killed process`, { pid, processName });
  return { success: true };
}

export async function startProcess(
  command: string,
  args: string[],
  ctx: PolicyContext,
  log: HyperLog
): Promise<{ pid?: number; error?: string }> {
  const fullCommand = `${command} ${args.join(" ")}`;

  const result = await executeShell(fullCommand, { shell: "auto" }, ctx, log);

  if (result.error) {
    return { error: result.error };
  }

  log.info("process.started", `Started process: ${command}`, { args });

  // Can't easily get PID from shell execution, return 0
  return { pid: 0 };
}


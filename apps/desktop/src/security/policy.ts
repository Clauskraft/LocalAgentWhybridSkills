import path from "node:path";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface PolicyDecision {
  allowed: boolean;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  reason: string;
}

export interface PolicyContext {
  fullAccess: boolean;
  autoApprove: boolean;
  safeDirs: string[];
}

// Paths that are always blocked (even in full access mode)
const BLOCKED_PATHS = [
  // Windows critical
  "C:\\Windows\\System32\\config",
  "C:\\Windows\\System32\\drivers",
  // Linux critical
  "/etc/shadow",
  "/etc/sudoers",
  "/boot",
  // Secrets
  ".ssh/id_rsa",
  ".ssh/id_ed25519",
  ".gnupg",
  ".aws/credentials",
  ".azure",
  // Browser data
  "AppData\\Local\\Google\\Chrome\\User Data",
  "AppData\\Local\\Microsoft\\Edge\\User Data",
  ".config/google-chrome",
  ".mozilla/firefox"
];

// Commands that are always blocked
const BLOCKED_COMMANDS = [
  "rm -rf /",
  "rm -rf /*",
  "del /f /s /q c:\\*",
  "format c:",
  ":(){:|:&};:",
  "mkfs",
  "dd if=/dev/zero",
  "chmod -R 777 /",
  "takeown /f c:\\"
];

// Commands that require approval
const HIGH_RISK_COMMANDS = [
  "rm -rf",
  "rmdir /s",
  "del /f /s",
  "shutdown",
  "reboot",
  "taskkill",
  "kill -9",
  "pkill",
  "net user",
  "netsh",
  "reg add",
  "reg delete",
  "chmod",
  "chown",
  "sudo",
  "runas"
];

export function isPathBlocked(filePath: string): boolean {
  const normalized = path.normalize(filePath).toLowerCase();
  return BLOCKED_PATHS.some((blocked) => normalized.includes(blocked.toLowerCase()));
}

export function isPathInSafeDir(filePath: string, safeDirs: string[]): boolean {
  const absPath = path.resolve(filePath);
  return safeDirs.some((safeDir) => {
    const absSafe = path.resolve(safeDir);
    const relative = path.relative(absSafe, absPath);
    return !relative.startsWith("..") && !path.isAbsolute(relative);
  });
}

export function evaluateFileReadPolicy(filePath: string, ctx: PolicyContext): PolicyDecision {
  // Always block critical system files
  if (isPathBlocked(filePath)) {
    return {
      allowed: false,
      riskLevel: "critical",
      requiresApproval: false,
      reason: `Access blocked: ${filePath} is a protected system path`
    };
  }

  // In safe dir = low risk
  if (isPathInSafeDir(filePath, ctx.safeDirs)) {
    return {
      allowed: true,
      riskLevel: "low",
      requiresApproval: false,
      reason: "Path is in safe directory"
    };
  }

  // Full access mode = medium risk, auto-approved
  if (ctx.fullAccess) {
    return {
      allowed: true,
      riskLevel: "medium",
      requiresApproval: false,
      reason: "Full access mode enabled"
    };
  }

  // Not in safe dir and no full access = blocked
  return {
    allowed: false,
    riskLevel: "high",
    requiresApproval: true,
    reason: `Path ${filePath} is outside safe directories. Enable SCA_FULL_ACCESS=true or add to SCA_SAFE_DIRS.`
  };
}

export function evaluateFileWritePolicy(filePath: string, ctx: PolicyContext): PolicyDecision {
  // Always block critical system files
  if (isPathBlocked(filePath)) {
    return {
      allowed: false,
      riskLevel: "critical",
      requiresApproval: false,
      reason: `Write blocked: ${filePath} is a protected system path`
    };
  }

  // In safe dir = medium risk (still mutating)
  if (isPathInSafeDir(filePath, ctx.safeDirs)) {
    return {
      allowed: true,
      riskLevel: "medium",
      requiresApproval: false,
      reason: "Path is in safe directory"
    };
  }

  // Full access + auto-approve = allowed
  if (ctx.fullAccess && ctx.autoApprove) {
    return {
      allowed: true,
      riskLevel: "high",
      requiresApproval: false,
      reason: "Full access + auto-approve enabled"
    };
  }

  // Full access without auto-approve = requires approval
  if (ctx.fullAccess) {
    return {
      allowed: false,
      riskLevel: "high",
      requiresApproval: true,
      reason: `Write to ${filePath} requires manual approval`
    };
  }

  // No full access = blocked
  return {
    allowed: false,
    riskLevel: "high",
    requiresApproval: true,
    reason: `Write blocked: ${filePath} is outside safe directories`
  };
}

export function evaluateShellPolicy(command: string, ctx: PolicyContext): PolicyDecision {
  const cmdLower = command.toLowerCase();

  // Always block destructive commands
  for (const blocked of BLOCKED_COMMANDS) {
    if (cmdLower.includes(blocked.toLowerCase())) {
      return {
        allowed: false,
        riskLevel: "critical",
        requiresApproval: false,
        reason: `Command blocked: contains destructive pattern "${blocked}"`
      };
    }
  }

  // Check for high-risk commands
  const isHighRisk = HIGH_RISK_COMMANDS.some((pattern) =>
    cmdLower.includes(pattern.toLowerCase())
  );

  if (isHighRisk) {
    if (ctx.autoApprove) {
      return {
        allowed: true,
        riskLevel: "high",
        requiresApproval: false,
        reason: "High-risk command auto-approved"
      };
    }
    return {
      allowed: false,
      riskLevel: "high",
      requiresApproval: true,
      reason: `High-risk command requires approval: ${command}`
    };
  }

  // Read-only commands = medium risk, auto-approved
  const readOnlyPatterns = ["ls", "dir", "cat", "type", "get-", "echo", "pwd", "cd", "where", "which", "find", "grep"];
  const isReadOnly = readOnlyPatterns.some((p) => cmdLower.startsWith(p) || cmdLower.includes(" " + p));

  if (isReadOnly) {
    return {
      allowed: true,
      riskLevel: "low",
      requiresApproval: false,
      reason: "Read-only command"
    };
  }

  // Default: medium risk, allowed if full access
  if (ctx.fullAccess) {
    return {
      allowed: true,
      riskLevel: "medium",
      requiresApproval: false,
      reason: "Full access mode enabled"
    };
  }

  return {
    allowed: false,
    riskLevel: "medium",
    requiresApproval: true,
    reason: "Shell execution requires SCA_FULL_ACCESS=true"
  };
}

export function evaluateProcessKillPolicy(processName: string, ctx: PolicyContext): PolicyDecision {
  // Critical system processes
  const criticalProcesses = ["system", "csrss", "smss", "lsass", "services", "winlogon", "init", "systemd"];

  if (criticalProcesses.some((p) => processName.toLowerCase().includes(p))) {
    return {
      allowed: false,
      riskLevel: "critical",
      requiresApproval: false,
      reason: `Cannot kill critical system process: ${processName}`
    };
  }

  if (ctx.autoApprove) {
    return {
      allowed: true,
      riskLevel: "high",
      requiresApproval: false,
      reason: "Process kill auto-approved"
    };
  }

  return {
    allowed: false,
    riskLevel: "high",
    requiresApproval: true,
    reason: `Killing process ${processName} requires manual approval`
  };
}

export function evaluateNetworkPolicy(url: string, ctx: PolicyContext): PolicyDecision {
  try {
    const parsed = new URL(url);

    // Localhost = low risk
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1") {
      return {
        allowed: true,
        riskLevel: "low",
        requiresApproval: false,
        reason: "Localhost connection"
      };
    }

    // Internal network = medium risk
    const internalPatterns = ["192.168.", "10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.2", "172.30.", "172.31."];
    if (internalPatterns.some((p) => parsed.hostname.startsWith(p))) {
      return {
        allowed: true,
        riskLevel: "medium",
        requiresApproval: false,
        reason: "Internal network connection"
      };
    }

    // External = medium risk, allowed with full access
    if (ctx.fullAccess) {
      return {
        allowed: true,
        riskLevel: "medium",
        requiresApproval: false,
        reason: "External connection allowed with full access"
      };
    }

    return {
      allowed: false,
      riskLevel: "medium",
      requiresApproval: true,
      reason: `External connection to ${parsed.hostname} requires approval`
    };
  } catch {
    return {
      allowed: false,
      riskLevel: "high",
      requiresApproval: true,
      reason: `Invalid URL: ${url}`
    };
  }
}


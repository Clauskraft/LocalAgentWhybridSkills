import os from "node:os";
import type { HyperLog } from "../logging/hyperlog.js";
import type { PolicyContext } from "../security/policy.js";
import { globalApprovalQueue } from "../approval/approvalQueue.js";
import { executeShell } from "./shellTools.js";

export async function readClipboard(
  ctx: PolicyContext,
  log: HyperLog
): Promise<{ content?: string; error?: string }> {
  const platform = os.platform();
  let command: string;

  if (platform === "win32") {
    command = "Get-Clipboard";
  } else if (platform === "darwin") {
    command = "pbpaste";
  } else {
    // Linux - try xclip or xsel
    command = "xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null";
  }

  const result = await executeShell(
    command,
    { shell: platform === "win32" ? "powershell" : "bash" },
    ctx,
    log
  );

  if (result.error) {
    return { error: result.error };
  }

  if (!result.result) {
    return { error: "No result from clipboard read" };
  }

  log.info("clipboard.read", "Read clipboard", {
    length: result.result.stdout.length
  });

  return { content: result.result.stdout };
}

export async function writeClipboard(
  content: string,
  ctx: PolicyContext,
  log: HyperLog
): Promise<{ success?: boolean; error?: string }> {
  // Clipboard write always requires approval unless auto-approve
  if (!ctx.autoApprove) {
    const request = globalApprovalQueue.createRequest(
      "clipboard_write",
      `Write to clipboard: ${content.substring(0, 50)}...`,
      "medium",
      {
        allowed: false,
        riskLevel: "medium",
        requiresApproval: true,
        reason: "Clipboard modification requires approval"
      },
      { contentLength: content.length, preview: content.substring(0, 100) }
    );

    const approved = await globalApprovalQueue.waitForApproval(request);
    if (!approved) {
      return { error: "Clipboard write rejected" };
    }

    log.security("clipboard.write.approved", "Clipboard write approved", {
      contentLength: content.length
    });
  }

  const platform = os.platform();
  let command: string;

  // Escape content for shell
  const escaped = content.replace(/'/g, "'\"'\"'");

  if (platform === "win32") {
    // PowerShell needs different escaping
    const psEscaped = content.replace(/`/g, "``").replace(/"/g, '`"');
    command = `Set-Clipboard -Value "${psEscaped}"`;
  } else if (platform === "darwin") {
    command = `echo '${escaped}' | pbcopy`;
  } else {
    command = `echo '${escaped}' | xclip -selection clipboard 2>/dev/null || echo '${escaped}' | xsel --clipboard --input 2>/dev/null`;
  }

  const result = await executeShell(
    command,
    { shell: platform === "win32" ? "powershell" : "bash" },
    ctx,
    log
  );

  if (result.error) {
    return { error: result.error };
  }

  log.info("clipboard.write", "Wrote to clipboard", { contentLength: content.length });

  return { success: true };
}


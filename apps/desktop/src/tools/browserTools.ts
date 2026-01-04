import os from "node:os";
import path from "node:path";
import type { HyperLog } from "../logging/hyperlog.js";
import { evaluateNetworkPolicy, type PolicyContext } from "../security/policy.js";
import { executeShell } from "./shellTools.js";

export interface BrowserResult {
  success: boolean;
  error?: string;
}

// Find Chrome/Edge executable
function findBrowserExecutable(): string | null {
  const platform = os.platform();

  if (platform === "win32") {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    ];

    for (const candidate of candidates) {
      try {
        require("node:fs").accessSync(candidate);
        return candidate;
      } catch {
        // try next
      }
    }
  } else if (platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  } else {
    // Linux
    const candidates = [
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium"
    ];

    for (const candidate of candidates) {
      try {
        require("node:fs").accessSync(candidate);
        return candidate;
      } catch {
        // try next
      }
    }
  }

  return null;
}

export async function openUrl(
  url: string,
  ctx: PolicyContext,
  log: HyperLog
): Promise<BrowserResult> {
  // Evaluate network policy
  const policy = evaluateNetworkPolicy(url, ctx);

  log.security("browser.policy", `Browser navigation policy: ${policy.reason}`, {
    url,
    riskLevel: policy.riskLevel,
    allowed: policy.allowed
  });

  if (!policy.allowed) {
    return { success: false, error: policy.reason };
  }

  const platform = os.platform();
  let command: string;

  if (platform === "win32") {
    command = `Start-Process "${url}"`;
  } else if (platform === "darwin") {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}" || sensible-browser "${url}"`;
  }

  const result = await executeShell(
    command,
    { shell: platform === "win32" ? "powershell" : "bash" },
    ctx,
    log
  );

  if (result.error) {
    return { success: false, error: result.error };
  }

  log.info("browser.open", `Opened URL: ${url}`);

  return { success: true };
}

export async function httpRequest(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: string,
  headers?: Record<string, string>,
  ctx?: PolicyContext,
  log?: HyperLog
): Promise<{ status?: number; body?: string; error?: string }> {
  // Evaluate network policy if context provided
  if (ctx && log) {
    const policy = evaluateNetworkPolicy(url, ctx);
    if (!policy.allowed) {
      return { error: policy.reason };
    }
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: headers as HeadersInit
    };

    if (body && (method === "POST" || method === "PUT")) {
      fetchOptions.body = body;
    }

    const response = await fetch(url, fetchOptions);
    const responseBody = await response.text();

    if (log) {
      log.info("http.request", `HTTP ${method} ${url}`, {
        status: response.status,
        bodyLength: responseBody.length
      });
    }

    return {
      status: response.status,
      body: responseBody
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (log) {
      log.error("http.error", msg, { url, method });
    }
    return { error: msg };
  }
}

export async function takeScreenshot(
  outputPath: string,
  url?: string,
  ctx?: PolicyContext,
  log?: HyperLog
): Promise<{ path?: string; error?: string }> {
  const platform = os.platform();
  const absPath = path.resolve(outputPath);

  // Simple screenshot using system tools (without Puppeteer for now)
  let command: string;

  if (platform === "win32") {
    // PowerShell screenshot
    command = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object {
        $bitmap = New-Object System.Drawing.Bitmap($_.Bounds.Width, $_.Bounds.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($_.Bounds.Location, [System.Drawing.Point]::Empty, $_.Bounds.Size)
        $bitmap.Save("${absPath.replace(/\\/g, "\\\\")}")
      }
    `;
  } else if (platform === "darwin") {
    command = `screencapture -x "${absPath}"`;
  } else {
    command = `import -window root "${absPath}" || scrot "${absPath}"`;
  }

  const result = await executeShell(
    command,
    { shell: platform === "win32" ? "powershell" : "bash" },
    ctx ?? { fullAccess: true, autoApprove: true, safeDirs: [] },
    log ?? new (await import("../logging/hyperlog.js")).HyperLog("./logs")
  );

  if (result.error) {
    return { error: result.error };
  }

  if (log) {
    log.info("browser.screenshot", `Took screenshot: ${absPath}`);
  }

  return { path: absPath };
}


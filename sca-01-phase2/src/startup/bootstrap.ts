/**
 * SCA-01 Bootstrap & Startup Checks
 * Ensures all prerequisites are met before starting the agent
 */
import { spawn, exec } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";

const execAsync = promisify(exec);

// ============================================================================
// TYPES
// ============================================================================

export interface BootstrapResult {
  success: boolean;
  checks: CheckResult[];
  ollamaStarted: boolean;
  errors: string[];
  warnings: string[];
}

export interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  details?: string;
}

export interface OllamaConfig {
  host: string;
  port: number;
  model: string;
  autoStart: boolean;
  startTimeout: number;
}

const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  host: "localhost",
  port: 11434,
  model: "qwen3",
  autoStart: true,
  startTimeout: 30000,
};

// ============================================================================
// OLLAMA MANAGEMENT
// ============================================================================

async function isOllamaInstalled(): Promise<boolean> {
  try {
    if (process.platform === "win32") {
      // Check common Windows paths
      const paths = [
        path.join(os.homedir(), "AppData", "Local", "Programs", "Ollama", "ollama.exe"),
        "C:\\Program Files\\Ollama\\ollama.exe",
        "ollama", // In PATH
      ];
      
      for (const p of paths) {
        try {
          await execAsync(`"${p}" --version`);
          return true;
        } catch {
          // Try next path
        }
      }
      
      // Try without quotes (for PATH)
      try {
        await execAsync("ollama --version");
        return true;
      } catch {
        return false;
      }
    } else {
      // macOS / Linux
      await execAsync("which ollama");
      return true;
    }
  } catch {
    return false;
  }
}

async function isOllamaRunning(config: OllamaConfig): Promise<boolean> {
  try {
    const url = `http://${config.host}:${config.port}/api/version`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    return res.ok;
  } catch {
    return false;
  }
}

async function getOllamaVersion(config: OllamaConfig): Promise<string | null> {
  try {
    const url = `http://${config.host}:${config.port}/api/version`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.version ?? null;
    }
  } catch {
    // Ignore
  }
  return null;
}

async function startOllama(config: OllamaConfig): Promise<boolean> {
  console.log("🚀 Starting Ollama...");
  
  try {
    // Start Ollama in background
    const ollamaPath = process.platform === "win32" 
      ? "ollama"
      : "/usr/local/bin/ollama";
    
    const child = spawn(ollamaPath, ["serve"], {
      detached: true,
      stdio: "ignore",
      shell: false,
    });
    
    child.unref();
    
    // Wait for Ollama to be ready
    const startTime = Date.now();
    while (Date.now() - startTime < config.startTimeout) {
      await sleep(1000);
      
      if (await isOllamaRunning(config)) {
        console.log("✅ Ollama started successfully");
        return true;
      }
    }
    
    console.error("❌ Ollama failed to start within timeout");
    return false;
  } catch (e) {
    console.error("❌ Failed to start Ollama:", e);
    return false;
  }
}

async function ensureModelAvailable(config: OllamaConfig): Promise<{ available: boolean; downloading: boolean }> {
  try {
    const url = `http://${config.host}:${config.port}/api/tags`;
    const res = await fetch(url);
    
    if (!res.ok) {
      return { available: false, downloading: false };
    }
    
    const data = await res.json();
    const models = data.models ?? [];
    
    const hasModel = models.some((m: { name: string }) => 
      m.name.startsWith(config.model) || m.name === config.model
    );
    
    return { available: hasModel, downloading: false };
  } catch {
    return { available: false, downloading: false };
  }
}

async function pullModel(config: OllamaConfig): Promise<void> {
  console.log(`📥 Downloading model: ${config.model}...`);
  
  try {
    const url = `http://${config.host}:${config.port}/api/pull`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: config.model, stream: false }),
    });
    
    if (res.ok) {
      console.log(`✅ Model ${config.model} downloaded`);
    } else {
      console.warn(`⚠️ Could not download model: ${res.status}`);
    }
  } catch (e) {
    console.warn("⚠️ Model download failed:", e);
  }
}

// ============================================================================
// SYSTEM CHECKS
// ============================================================================

async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.version;
  const major = parseInt(version.slice(1).split(".")[0] ?? "0", 10);
  
  if (major >= 18) {
    return {
      name: "Node.js Version",
      status: "pass",
      message: `Node.js ${version}`,
    };
  } else if (major >= 16) {
    return {
      name: "Node.js Version",
      status: "warn",
      message: `Node.js ${version} (18+ recommended)`,
    };
  } else {
    return {
      name: "Node.js Version",
      status: "fail",
      message: `Node.js ${version} is too old (18+ required)`,
    };
  }
}

async function checkDiskSpace(): Promise<CheckResult> {
  try {
    const homeDir = os.homedir();
    
    if (process.platform === "win32") {
      const { stdout } = await execAsync(`wmic logicaldisk where "DeviceID='${homeDir.charAt(0)}:'" get FreeSpace`);
      const freeBytes = parseInt(stdout.split("\n")[1]?.trim() ?? "0", 10);
      const freeGB = freeBytes / (1024 * 1024 * 1024);
      
      if (freeGB >= 10) {
        return { name: "Disk Space", status: "pass", message: `${freeGB.toFixed(1)} GB free` };
      } else if (freeGB >= 5) {
        return { name: "Disk Space", status: "warn", message: `${freeGB.toFixed(1)} GB free (low)` };
      } else {
        return { name: "Disk Space", status: "fail", message: `${freeGB.toFixed(1)} GB free (critical)` };
      }
    } else {
      const { stdout } = await execAsync(`df -BG ${homeDir} | tail -1 | awk '{print $4}'`);
      const freeGB = parseInt(stdout.replace("G", ""), 10);
      
      if (freeGB >= 10) {
        return { name: "Disk Space", status: "pass", message: `${freeGB} GB free` };
      } else if (freeGB >= 5) {
        return { name: "Disk Space", status: "warn", message: `${freeGB} GB free (low)` };
      } else {
        return { name: "Disk Space", status: "fail", message: `${freeGB} GB free (critical)` };
      }
    }
  } catch {
    return { name: "Disk Space", status: "warn", message: "Could not check disk space" };
  }
}

async function checkMemory(): Promise<CheckResult> {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const totalGB = totalMem / (1024 * 1024 * 1024);
  const freeGB = freeMem / (1024 * 1024 * 1024);
  
  if (freeGB >= 4) {
    return {
      name: "Memory",
      status: "pass",
      message: `${freeGB.toFixed(1)} GB free of ${totalGB.toFixed(1)} GB`,
    };
  } else if (freeGB >= 2) {
    return {
      name: "Memory",
      status: "warn",
      message: `${freeGB.toFixed(1)} GB free (low)`,
    };
  } else {
    return {
      name: "Memory",
      status: "fail",
      message: `${freeGB.toFixed(1)} GB free (critical)`,
    };
  }
}

async function checkNetwork(): Promise<CheckResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    await fetch("https://sca-01-phase3-production.up.railway.app/health", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    return {
      name: "Network",
      status: "pass",
      message: "Cloud API reachable",
    };
  } catch {
    return {
      name: "Network",
      status: "warn",
      message: "Cloud API not reachable (offline mode)",
    };
  }
}

async function checkOllamaInstalled(): Promise<CheckResult> {
  const installed = await isOllamaInstalled();
  
  if (installed) {
    return {
      name: "Ollama Installed",
      status: "pass",
      message: "Ollama is installed",
    };
  } else {
    return {
      name: "Ollama Installed",
      status: "fail",
      message: "Ollama not found. Install from https://ollama.ai",
    };
  }
}

async function checkOllamaRunning(config: OllamaConfig): Promise<CheckResult> {
  const running = await isOllamaRunning(config);
  
  if (running) {
    const version = await getOllamaVersion(config);
    return {
      name: "Ollama Running",
      status: "pass",
      message: `Ollama running${version ? ` (v${version})` : ""} on port ${config.port}`,
    };
  } else {
    return {
      name: "Ollama Running",
      status: "fail",
      message: `Ollama not running on ${config.host}:${config.port}`,
    };
  }
}

async function checkModel(config: OllamaConfig): Promise<CheckResult> {
  const { available } = await ensureModelAvailable(config);
  
  if (available) {
    return {
      name: "Model Available",
      status: "pass",
      message: `Model ${config.model} is available`,
    };
  } else {
    return {
      name: "Model Available",
      status: "warn",
      message: `Model ${config.model} not downloaded`,
    };
  }
}

// ============================================================================
// MAIN BOOTSTRAP
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function bootstrap(config: Partial<OllamaConfig> = {}): Promise<BootstrapResult> {
  const cfg: OllamaConfig = { ...DEFAULT_OLLAMA_CONFIG, ...config };
  const checks: CheckResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let ollamaStarted = false;
  
  console.log("🔍 Running startup checks...\n");
  
  // System checks
  checks.push(await checkNodeVersion());
  checks.push(await checkMemory());
  checks.push(await checkDiskSpace());
  checks.push(await checkNetwork());
  
  // Ollama checks
  const ollamaInstalled = await checkOllamaInstalled();
  checks.push(ollamaInstalled);
  
  if (ollamaInstalled.status === "fail") {
    errors.push("Ollama is not installed. Please install from https://ollama.ai");
    return { success: false, checks, ollamaStarted, errors, warnings };
  }
  
  // Check if Ollama is running
  let ollamaRunning = await checkOllamaRunning(cfg);
  
  // Auto-start Ollama if not running
  if (ollamaRunning.status === "fail" && cfg.autoStart) {
    console.log("⏳ Ollama not running, attempting to start...");
    
    const started = await startOllama(cfg);
    ollamaStarted = started;
    
    if (started) {
      ollamaRunning = await checkOllamaRunning(cfg);
    }
  }
  
  checks.push(ollamaRunning);
  
  if (ollamaRunning.status === "fail") {
    errors.push(`Ollama is not running. Start with: ollama serve`);
    return { success: false, checks, ollamaStarted, errors, warnings };
  }
  
  // Check model
  const modelCheck = await checkModel(cfg);
  checks.push(modelCheck);
  
  // Auto-download model if not available
  if (modelCheck.status === "warn") {
    warnings.push(`Model ${cfg.model} will be downloaded on first use`);
  }
  
  // Collect errors and warnings
  for (const check of checks) {
    if (check.status === "fail") {
      errors.push(`${check.name}: ${check.message}`);
    } else if (check.status === "warn") {
      warnings.push(`${check.name}: ${check.message}`);
    }
  }
  
  // Print summary
  console.log("\n📋 Startup Check Summary:");
  console.log("─".repeat(50));
  
  for (const check of checks) {
    const icon = check.status === "pass" ? "✅" : check.status === "warn" ? "⚠️" : "❌";
    console.log(`${icon} ${check.name}: ${check.message}`);
  }
  
  console.log("─".repeat(50));
  
  const success = errors.length === 0;
  
  if (success) {
    console.log("✅ All checks passed! Starting SCA-01...\n");
  } else {
    console.log(`❌ ${errors.length} error(s) found. Please fix before continuing.\n`);
  }
  
  return { success, checks, ollamaStarted, errors, warnings };
}

// ============================================================================
// SPRINT 26-35: PERFORMANCE & RELIABILITY ENHANCEMENTS
// ============================================================================

// Sprint 26: Cache check results to avoid redundant calls
const checkCache = new Map<string, { result: CheckResult; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

function getCachedCheck(key: string): CheckResult | null {
  const cached = checkCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  return null;
}

function setCachedCheck(key: string, result: CheckResult): void {
  checkCache.set(key, { result, timestamp: Date.now() });
}

// Sprint 27: Parallel health checks
async function runParallelChecks(_cfg: OllamaConfig): Promise<CheckResult[]> {
  const checks = await Promise.allSettled([
    checkNodeVersion(),
    checkMemory(),
    checkDiskSpace(),
  ]);
  
  return checks.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    const names = ["Node.js", "Memory", "Disk"];
    return {
      name: names[index] ?? "Unknown",
      status: "warn" as const,
      message: "Check failed",
      details: result.reason?.message,
    };
  });
}

// Sprint 28: Retry logic with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Sprint 29: Health check with timeout
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timed out"
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (e) {
    clearTimeout(timeoutId!);
    throw e;
  }
}

// Sprint 30: Comprehensive system info
export async function getSystemInfo(): Promise<{
  platform: string;
  arch: string;
  nodeVersion: string;
  totalMemory: number;
  freeMemory: number;
  cpuCount: number;
  uptime: number;
}> {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpuCount: os.cpus().length,
    uptime: os.uptime(),
  };
}

// Sprint 31: Model recommendation based on system specs
export function recommendModel(): string {
  const totalMemGB = os.totalmem() / (1024 ** 3);
  
  if (totalMemGB >= 32) {
    return "qwen3:32b";
  } else if (totalMemGB >= 16) {
    return "qwen3:8b";
  } else if (totalMemGB >= 8) {
    return "phi3:mini";
  } else {
    return "tinyllama";
  }
}

// Sprint 32: Startup time tracking
let startupStartTime: number = 0;
let startupMetrics: { phase: string; duration: number }[] = [];

export function startStartupTimer(): void {
  startupStartTime = Date.now();
  startupMetrics = [];
}

export function recordStartupPhase(phase: string): void {
  const now = Date.now();
  const lastTime = startupMetrics.length > 0 
    ? startupStartTime + startupMetrics.reduce((sum, m) => sum + m.duration, 0)
    : startupStartTime;
  startupMetrics.push({ phase, duration: now - lastTime });
}

export function getStartupMetrics(): { totalMs: number; phases: { phase: string; duration: number }[] } {
  return {
    totalMs: Date.now() - startupStartTime,
    phases: startupMetrics,
  };
}

// Sprint 33: Graceful degradation
export interface DegradedModeOptions {
  allowOfflineMode: boolean;
  fallbackModel: string;
  skipOptionalChecks: boolean;
}

const DEFAULT_DEGRADED_OPTIONS: DegradedModeOptions = {
  allowOfflineMode: true,
  fallbackModel: "phi3:mini",
  skipOptionalChecks: true,
};

// Sprint 34: Pre-warm Ollama model
export async function prewarmModel(model: string, host: string = "http://localhost:11434"): Promise<boolean> {
  try {
    const response = await fetch(`${host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: "Hello",
        stream: false,
        options: { num_predict: 1 },
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Sprint 35: Health check endpoint for monitoring
export function createHealthCheckResponse(result: BootstrapResult): {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: Record<string, boolean>;
  uptime: number;
} {
  const checkStatus = Object.fromEntries(
    result.checks.map(c => [c.name, c.status === "pass"])
  );
  
  const status = result.success ? "healthy" 
    : result.warnings.length > 0 ? "degraded" 
    : "unhealthy";
  
  return {
    status,
    timestamp: new Date().toISOString(),
    checks: checkStatus,
    uptime: process.uptime(),
  };
}

// Export for direct testing
export {
  isOllamaInstalled,
  isOllamaRunning,
  startOllama,
  ensureModelAvailable,
  pullModel,
  getOllamaVersion,
  getCachedCheck,
  withRetry,
  withTimeout,
  runParallelChecks,
};


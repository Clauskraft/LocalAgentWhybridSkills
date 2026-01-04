/**
 * Sprint 43-47: Input Validation & Security Utilities
 */

// Sprint 43: Safe path validation
export function isPathSafe(inputPath: string, baseDir: string): boolean {
  const path = require("node:path");
  const resolved = path.resolve(baseDir, inputPath);
  const normalized = path.normalize(resolved);
  
  // Check for path traversal
  if (!normalized.startsWith(path.normalize(baseDir))) {
    return false;
  }
  
  // Check for sensitive patterns
  const dangerousPatterns = [
    /\.env/i,
    /\.git\//i,
    /node_modules\//i,
    /\.ssh\//i,
    /\.aws\//i,
    /secrets?\//i,
    /credentials?\//i,
    /\.npmrc/i,
    /\.pypirc/i,
  ];
  
  return !dangerousPatterns.some(p => p.test(normalized));
}

// Sprint 44: Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove JS protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim();
}

// Sprint 45: URL validation
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Sprint 46: API key format validation
export function validateApiKeyFormat(key: string, provider: string): boolean {
  const patterns: Record<string, RegExp> = {
    openai: /^sk-[A-Za-z0-9-_]{32,}$/,
    anthropic: /^sk-ant-api[A-Za-z0-9-_]{32,}$/,
    gemini: /^AIza[A-Za-z0-9-_]{35,}$/,
    github: /^ghp_[A-Za-z0-9]{36,}$/,
    huggingface: /^hf_[A-Za-z0-9]{32,}$/,
  };
  
  const pattern = patterns[provider.toLowerCase()];
  return pattern ? pattern.test(key) : key.length > 20;
}

// Sprint 47: Rate limit tracking
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    this.cleanup();
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    this.requests = this.requests.filter(t => t > cutoff);
  }

  getRemainingRequests(): number {
    this.cleanup();
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    return Math.max(0, this.requests[0]! + this.windowMs - Date.now());
  }
}

// Sprint 48: Content type detection
export function detectContentType(content: string): "markdown" | "code" | "json" | "plain" {
  // Check for JSON
  if (/^\s*[\[{]/.test(content) && /[\]}]\s*$/.test(content)) {
    try {
      JSON.parse(content);
      return "json";
    } catch {
      // Not valid JSON
    }
  }
  
  // Check for code patterns
  const codePatterns = [
    /^(function|const|let|var|class|import|export|async|if|for|while)\s/m,
    /^(def|class|import|from|if|for|while|return)\s/m,
    /^\s*(public|private|protected|static|void|int|string)\s/m,
  ];
  
  if (codePatterns.some(p => p.test(content))) {
    return "code";
  }
  
  // Check for markdown
  const mdPatterns = [
    /^#+\s/m, // Headers
    /^\*\*.*\*\*$/m, // Bold
    /^-\s/m, // Lists
    /```/m, // Code blocks
    /\[.*\]\(.*\)/m, // Links
  ];
  
  if (mdPatterns.some(p => p.test(content))) {
    return "markdown";
  }
  
  return "plain";
}

// Sprint 49: Error classification
export type ErrorCategory = "network" | "auth" | "validation" | "timeout" | "unknown";

export function classifyError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  
  if (message.includes("network") || message.includes("fetch") || message.includes("econnrefused")) {
    return "network";
  }
  if (message.includes("auth") || message.includes("401") || message.includes("403") || message.includes("unauthorized")) {
    return "auth";
  }
  if (message.includes("valid") || message.includes("invalid") || message.includes("required")) {
    return "validation";
  }
  if (message.includes("timeout") || message.includes("timed out")) {
    return "timeout";
  }
  
  return "unknown";
}

// Sprint 50: Structured error response
export interface ErrorResponse {
  code: string;
  message: string;
  category: ErrorCategory;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export function createErrorResponse(error: Error, code?: string): ErrorResponse {
  const category = classifyError(error);
  
  return {
    code: code ?? `ERR_${category.toUpperCase()}`,
    message: error.message,
    category,
    retryable: ["network", "timeout"].includes(category),
    details: {
      name: error.name,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    },
  };
}


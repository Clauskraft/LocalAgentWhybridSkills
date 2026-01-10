/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                    SHARED HARVEST UTILITIES                                                             ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Fælles utility-modul for harvest-operationer                                                           ║
 * ║  Flyttet fra WidgeTDC BaseSourceAdapter til LocalAgentWhybridSkills                                    ║
 * ║  Genbruges af både ROMA-motoren og WidgeTDC-harvest                                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// AUTH UTILITIES
// ============================================================================

export type AuthMethod = 'api_key' | 'oauth2' | 'basic' | 'cookies' | 'none';

export interface CredentialSet {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  username?: string;
  password?: string;
  cookies?: string;
  sessionId?: string;
}

/**
 * Get credentials from environment variables
 */
export function getCredentials(envPrefix: string, authMethod: AuthMethod): CredentialSet {
  const creds: CredentialSet = {};

  switch (authMethod) {
    case 'api_key':
      creds.apiKey = process.env[`${envPrefix}_API_KEY`] || '';
      break;
    case 'oauth2':
      creds.clientId = process.env[`${envPrefix}_CLIENT_ID`] || '';
      creds.clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`] || '';
      creds.accessToken = process.env[`${envPrefix}_ACCESS_TOKEN`] || '';
      creds.refreshToken = process.env[`${envPrefix}_REFRESH_TOKEN`] || '';
      break;
    case 'basic':
      creds.username = process.env[`${envPrefix}_USERNAME`] || '';
      creds.password = process.env[`${envPrefix}_PASSWORD`] || '';
      break;
    case 'cookies':
      creds.cookies = process.env[`${envPrefix}_COOKIES`] || '';
      creds.sessionId = process.env[`${envPrefix}_SESSION_ID`] || '';
      break;
    case 'none':
    default:
      break;
  }

  return creds;
}

/**
 * Validate credentials for a given auth method
 */
export function hasValidCredentials(creds: CredentialSet, authMethod: AuthMethod): boolean {
  switch (authMethod) {
    case 'api_key':
      return !!creds.apiKey;
    case 'oauth2':
      return !!(creds.accessToken || (creds.clientId && creds.clientSecret));
    case 'basic':
      return !!(creds.username && creds.password);
    case 'cookies':
      return !!(creds.cookies || creds.sessionId);
    case 'none':
      return true;
    default:
      return false;
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfterMs: number;
}

export interface RateLimitState {
  requestCount: number;
  windowStart: number;
}

/**
 * Create a rate limiter for a specific source
 */
export function createRateLimiter(config: RateLimitConfig) {
  const state: RateLimitState = {
    requestCount: 0,
    windowStart: Date.now()
  };

  return {
    /**
     * Check and wait if rate limit exceeded
     */
    async check(): Promise<void> {
      const now = Date.now();

      // Reset window if expired
      if (now - state.windowStart > config.windowMs) {
        state.requestCount = 0;
        state.windowStart = now;
      }

      // Check if over limit
      if (state.requestCount >= config.maxRequests) {
        console.log(`⏳ Rate limit reached, waiting ${config.retryAfterMs}ms...`);
        await sleep(config.retryAfterMs);
        state.requestCount = 0;
        state.windowStart = Date.now();
      }

      state.requestCount++;
    },

    /**
     * Get current state
     */
    getState(): RateLimitState {
      return { ...state };
    },

    /**
     * Reset the rate limiter
     */
    reset(): void {
      state.requestCount = 0;
      state.windowStart = Date.now();
    }
  };
}

// ============================================================================
// DATA EXTRACTION UTILITIES
// ============================================================================

/**
 * Extract email addresses from text
 */
export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return [...new Set(text.match(emailRegex) || [])];
}

/**
 * Extract domains from email addresses
 */
export function extractDomainsFromEmails(emails: string[]): string[] {
  return [...new Set(emails.map(e => e.split('@')[1]).filter(Boolean))];
}

/**
 * Extract URLs from text
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/g;
  return [...new Set(text.match(urlRegex) || [])];
}

/**
 * Extract phone numbers (Danish and international)
 */
export function extractPhones(text: string): { value: string; type: string; confidence: number }[] {
  const danishRegex = /(?:\+45\s?)?(?:\d{2}\s?){4}/g;
  const internationalRegex = /\+\d{1,3}\s?\d{4,14}/g;
  
  const results: { value: string; type: string; confidence: number }[] = [];
  
  const danishMatches = text.match(danishRegex) || [];
  danishMatches.forEach(p => results.push({ 
    value: p.trim(), 
    type: 'phone_dk', 
    confidence: 0.8 
  }));
  
  const intlMatches = text.match(internationalRegex) || [];
  intlMatches.forEach(p => results.push({ 
    value: p.trim(), 
    type: 'phone_intl', 
    confidence: 0.7 
  }));
  
  return results;
}

/**
 * Extract Danish CVR numbers
 */
export function extractCvrNumbers(text: string): { value: string; confidence: number }[] {
  const cvrRegex = /CVR[:\s]*(\d{8})/gi;
  const results: { value: string; confidence: number }[] = [];
  
  let match;
  while ((match = cvrRegex.exec(text)) !== null) {
    results.push({ value: match[1], confidence: 0.95 });
  }
  
  return results;
}

/**
 * Extract keywords using simple TF approach
 */
export function extractKeywords(text: string, topN: number = 10, minLength: number = 4): string[] {
  const words = text.toLowerCase()
    .replace(/[^a-zæøå0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > minLength);
  
  const wordFreq: Record<string, number> = {};
  words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
  
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

/**
 * Strip HTML tags from content
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Simple content hash for deduplication
 */
export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// ============================================================================
// EVENT UTILITIES
// ============================================================================

export interface ProgressEvent {
  current: number;
  total?: number;
  message?: string;
  source: string;
}

export interface ErrorEvent {
  error: Error;
  source: string;
  timestamp: Date;
}

export type EventCallback<T> = (event: T) => void;

/**
 * Create an event emitter for harvest progress
 */
export function createEventEmitter() {
  const listeners: Map<string, Set<EventCallback<unknown>>> = new Map();

  return {
    on<T>(event: string, callback: EventCallback<T>): void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(callback as EventCallback<unknown>);
    },

    off<T>(event: string, callback: EventCallback<T>): void {
      listeners.get(event)?.delete(callback as EventCallback<unknown>);
    },

    emit<T>(event: string, data: T): void {
      listeners.get(event)?.forEach(cb => cb(data));
    },

    emitProgress(source: string, current: number, total?: number, message?: string): void {
      this.emit<ProgressEvent>('progress', { current, total, message, source });
    },

    emitError(source: string, error: Error): void {
      this.emit<ErrorEvent>('error', { error, source, timestamp: new Date() });
    }
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${lastError.message}`);
      await sleep(delay);
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Batch execute with concurrency limit
 */
export async function batchExecute<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = 3
): Promise<R[]> {
  const results: R[] = [];
  const queue = [...items];
  
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()!;
      const result = await fn(item);
      results.push(result);
    }
  }
  
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());
  
  await Promise.all(workers);
  return results;
}

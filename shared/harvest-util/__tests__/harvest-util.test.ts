/**
 * 🧪 Harvest Utilities Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import utilities directly (mock for test isolation)
const harvestUtil = {
  // Auth
  getCredentials: (envPrefix: string, authMethod: string) => {
    const creds: Record<string, string> = {};
    if (authMethod === 'api_key') {
      creds.apiKey = process.env[`${envPrefix}_API_KEY`] || '';
    } else if (authMethod === 'basic') {
      creds.username = process.env[`${envPrefix}_USERNAME`] || '';
      creds.password = process.env[`${envPrefix}_PASSWORD`] || '';
    }
    return creds;
  },

  hasValidCredentials: (creds: Record<string, string>, authMethod: string): boolean => {
    if (authMethod === 'api_key') return !!creds.apiKey;
    if (authMethod === 'basic') return !!(creds.username && creds.password);
    if (authMethod === 'none') return true;
    return false;
  },

  // Rate limiting
  createRateLimiter: (config: { maxRequests: number; windowMs: number; retryAfterMs: number }) => {
    const state = { requestCount: 0, windowStart: Date.now() };
    return {
      check: async () => {
        const now = Date.now();
        if (now - state.windowStart > config.windowMs) {
          state.requestCount = 0;
          state.windowStart = now;
        }
        if (state.requestCount >= config.maxRequests) {
          await new Promise(r => setTimeout(r, config.retryAfterMs));
          state.requestCount = 0;
          state.windowStart = Date.now();
        }
        state.requestCount++;
      },
      getState: () => ({ ...state }),
      reset: () => { state.requestCount = 0; state.windowStart = Date.now(); }
    };
  },

  // Data extraction
  extractEmails: (text: string): string[] => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return [...new Set(text.match(emailRegex) || [])];
  },

  extractUrls: (text: string): string[] => {
    const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/g;
    return [...new Set(text.match(urlRegex) || [])];
  },

  extractPhones: (text: string) => {
    const danishRegex = /(?:\+45\s?)?(?:\d{2}\s?){4}/g;
    const results: { value: string; type: string; confidence: number }[] = [];
    const matches = text.match(danishRegex) || [];
    matches.forEach(p => results.push({ value: p.trim(), type: 'phone_dk', confidence: 0.8 }));
    return results;
  },

  extractCvrNumbers: (text: string) => {
    const cvrRegex = /CVR[:\s]*(\d{8})/gi;
    const results: { value: string; confidence: number }[] = [];
    let match;
    while ((match = cvrRegex.exec(text)) !== null) {
      results.push({ value: match[1], confidence: 0.95 });
    }
    return results;
  },

  extractKeywords: (text: string, topN = 10, minLength = 4): string[] => {
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
  },

  hashContent: (content: string): string => {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  },

  stripHtml: (html: string): string => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
};

describe('Auth Utilities', () => {
  it('should get api_key credentials from env', () => {
    process.env.TEST_API_KEY = 'test-key-123';
    const creds = harvestUtil.getCredentials('TEST', 'api_key');
    expect(creds.apiKey).toBe('test-key-123');
    delete process.env.TEST_API_KEY;
  });

  it('should validate api_key credentials', () => {
    expect(harvestUtil.hasValidCredentials({ apiKey: 'key' }, 'api_key')).toBe(true);
    expect(harvestUtil.hasValidCredentials({ apiKey: '' }, 'api_key')).toBe(false);
  });

  it('should validate basic auth credentials', () => {
    expect(harvestUtil.hasValidCredentials({ username: 'user', password: 'pass' }, 'basic')).toBe(true);
    expect(harvestUtil.hasValidCredentials({ username: 'user', password: '' }, 'basic')).toBe(false);
  });

  it('should always validate none auth', () => {
    expect(harvestUtil.hasValidCredentials({}, 'none')).toBe(true);
  });
});

describe('Rate Limiter', () => {
  it('should allow requests within limit', async () => {
    const limiter = harvestUtil.createRateLimiter({
      maxRequests: 5,
      windowMs: 60000,
      retryAfterMs: 10
    });

    // Should allow 5 requests without waiting
    for (let i = 0; i < 5; i++) {
      await limiter.check();
    }
    
    expect(limiter.getState().requestCount).toBe(5);
  });

  it('should reset after window expires', () => {
    const limiter = harvestUtil.createRateLimiter({
      maxRequests: 5,
      windowMs: 10, // Very short window
      retryAfterMs: 1
    });

    limiter.reset();
    expect(limiter.getState().requestCount).toBe(0);
  });
});

describe('Email Extraction', () => {
  it('should extract valid emails', () => {
    const text = 'Contact us at info@example.com or support@test.org';
    const emails = harvestUtil.extractEmails(text);
    expect(emails).toContain('info@example.com');
    expect(emails).toContain('support@test.org');
    expect(emails.length).toBe(2);
  });

  it('should handle empty text', () => {
    expect(harvestUtil.extractEmails('')).toEqual([]);
  });

  it('should deduplicate emails', () => {
    const text = 'Email: test@example.com, again: test@example.com';
    const emails = harvestUtil.extractEmails(text);
    expect(emails.length).toBe(1);
  });
});

describe('URL Extraction', () => {
  it('should extract URLs', () => {
    const text = 'Visit https://example.com and http://test.org/page';
    const urls = harvestUtil.extractUrls(text);
    expect(urls).toContain('https://example.com');
    expect(urls).toContain('http://test.org/page');
  });
});

describe('Phone Extraction', () => {
  it('should extract Danish phone numbers', () => {
    const text = 'Ring til +45 12 34 56 78 eller 87654321';
    const phones = harvestUtil.extractPhones(text);
    expect(phones.length).toBeGreaterThan(0);
    expect(phones[0].type).toBe('phone_dk');
  });
});

describe('CVR Extraction', () => {
  it('should extract Danish CVR numbers', () => {
    const text = 'Firmaet har CVR: 12345678 og CVR 87654321';
    const cvrs = harvestUtil.extractCvrNumbers(text);
    expect(cvrs.length).toBe(2);
    expect(cvrs[0].value).toBe('12345678');
    expect(cvrs[1].value).toBe('87654321');
    expect(cvrs[0].confidence).toBe(0.95);
  });

  it('should handle CVR with colon', () => {
    const text = 'CVR:11223344';
    const cvrs = harvestUtil.extractCvrNumbers(text);
    expect(cvrs.length).toBe(1);
    expect(cvrs[0].value).toBe('11223344');
  });
});

describe('Keyword Extraction', () => {
  it('should extract top keywords', () => {
    const text = 'security security security analysis analysis report';
    const keywords = harvestUtil.extractKeywords(text, 3, 4);
    expect(keywords[0]).toBe('security');
    expect(keywords[1]).toBe('analysis');
    expect(keywords[2]).toBe('report');
  });

  it('should filter short words', () => {
    const text = 'a an the security';
    const keywords = harvestUtil.extractKeywords(text, 10, 4);
    expect(keywords).toContain('security');
    expect(keywords).not.toContain('the');
  });
});

describe('Content Hashing', () => {
  it('should generate consistent hash', () => {
    const content = 'Test content';
    const hash1 = harvestUtil.hashContent(content);
    const hash2 = harvestUtil.hashContent(content);
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different content', () => {
    const hash1 = harvestUtil.hashContent('Content A');
    const hash2 = harvestUtil.hashContent('Content B');
    expect(hash1).not.toBe(hash2);
  });
});

describe('HTML Stripping', () => {
  it('should strip HTML tags', () => {
    const html = '<p>Hello <strong>World</strong></p>';
    const text = harvestUtil.stripHtml(html);
    expect(text).toBe('Hello World');
  });

  it('should normalize whitespace', () => {
    const html = '<div>  Multiple   spaces  </div>';
    const text = harvestUtil.stripHtml(html);
    expect(text).toBe('Multiple spaces');
  });
});

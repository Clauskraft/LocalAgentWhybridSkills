/**
 * External Feed Connector
 *
 * Henter data fra RSS feeds og JSON APIs.
 * Understøtter: NVD CVE, Hacker News, TechCrunch, EU Digital Strategy
 */

import type {
  PulseSource,
  RawPulseEvent,
  PulseCategory,
} from "../types.js";

// ============================================================================
// RSS Parser (simpel XML parsing)
// ============================================================================

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

async function parseRSS(xml: string): Promise<RSSItem[]> {
  const items: RSSItem[] = [];

  // Simple regex-based XML parsing (works for most RSS feeds)
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1] ?? "";
    if (!itemXml) continue;

    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const description = extractTag(itemXml, 'description');
    const pubDate = extractTag(itemXml, 'pubDate');

    if (title) {
      items.push({
        title: decodeHTMLEntities(title),
        link: link || '',
        description: decodeHTMLEntities(stripHTML(description || '')),
        pubDate: pubDate || new Date().toISOString(),
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = regex.exec(xml);
  return match ? (match[1] || match[2] || '').trim() : '';
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripHTML(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

// ============================================================================
// API Fetchers
// ============================================================================

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SCA-01-Pulse/1.0',
        'Accept': 'application/json, application/xml, text/xml, */*',
      },
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// Source-Specific Parsers
// ============================================================================

async function fetchNVDCVE(source: PulseSource): Promise<RawPulseEvent[]> {
  try {
    const response = await fetchWithTimeout(source.url);
    const data = await response.json();

    const events: RawPulseEvent[] = [];
    const vulnerabilities = data.vulnerabilities || [];

    for (const vuln of vulnerabilities.slice(0, 10)) {
      const cve = vuln.cve;
      if (!cve) continue;

      const description = cve.descriptions?.find((d: any) => d.lang === 'en')?.value
        || cve.descriptions?.[0]?.value
        || 'No description available';

      events.push({
        source: source.name,
        sourceId: cve.id,
        title: `${cve.id}: ${description.substring(0, 100)}...`,
        content: description,
        url: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
        publishedAt: cve.published || new Date().toISOString(),
        category: 'THREAT',
      });
    }

    return events;
  } catch (error) {
    console.error(`[Pulse] Failed to fetch NVD CVE:`, error);
    return [];
  }
}

async function fetchHackerNews(source: PulseSource): Promise<RawPulseEvent[]> {
  try {
    const response = await fetchWithTimeout(source.url);
    const data = await response.json();

    const events: RawPulseEvent[] = [];
    const hits = data.hits || [];

    for (const hit of hits.slice(0, 10)) {
      events.push({
        source: source.name,
        sourceId: hit.objectID,
        title: hit.title || 'Untitled',
        content: hit.story_text || hit.title || '',
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        publishedAt: new Date(hit.created_at_i * 1000).toISOString(),
        category: source.category,
      });
    }

    return events;
  } catch (error) {
    console.error(`[Pulse] Failed to fetch Hacker News:`, error);
    return [];
  }
}

async function fetchRSSFeed(source: PulseSource): Promise<RawPulseEvent[]> {
  try {
    const response = await fetchWithTimeout(source.url);
    const xml = await response.text();
    const items = await parseRSS(xml);

    const events: RawPulseEvent[] = [];

    for (const item of items.slice(0, 10)) {
      events.push({
        source: source.name,
        sourceId: item.link || `${source.id}-${Date.now()}`,
        title: item.title,
        content: item.description,
        url: item.link,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        category: source.category,
      });
    }

    return events;
  } catch (error) {
    console.error(`[Pulse] Failed to fetch RSS feed ${source.name}:`, error);
    return [];
  }
}

// ============================================================================
// Main Connector Class
// ============================================================================

export class ExternalFeedConnector {
  private sources: PulseSource[];

  constructor(sources: PulseSource[]) {
    this.sources = sources;
  }

  async fetchSource(source: PulseSource): Promise<RawPulseEvent[]> {
    console.log(`[Pulse] Fetching source: ${source.name}`);

    // Route to appropriate parser based on source ID or type
    if (source.id === 'nvd-cve') {
      return fetchNVDCVE(source);
    }

    if (source.id.includes('hackernews')) {
      return fetchHackerNews(source);
    }

    if (source.type === 'rss') {
      return fetchRSSFeed(source);
    }

    if (source.type === 'api') {
      // Generic JSON API - try to parse
      return this.fetchGenericAPI(source);
    }

    console.warn(`[Pulse] Unknown source type for ${source.name}`);
    return [];
  }

  private async fetchGenericAPI(source: PulseSource): Promise<RawPulseEvent[]> {
    try {
      const response = await fetchWithTimeout(source.url);
      const data = await response.json();

      // Try to extract items from common JSON structures
      const items = data.items || data.results || data.data || data.entries || [];
      if (!Array.isArray(items)) {
        console.warn(`[Pulse] Could not find items array in response for ${source.name}`);
        return [];
      }

      const events: RawPulseEvent[] = [];

      for (const item of items.slice(0, 10)) {
        const title = item.title || item.name || item.headline || 'Untitled';
        const content = item.description || item.summary || item.content || item.body || title;
        const url = item.url || item.link || item.href || '';
        const date = item.publishedAt || item.published || item.date || item.created_at || new Date().toISOString();

        events.push({
          source: source.name,
          sourceId: item.id || url || `${source.id}-${Date.now()}-${Math.random()}`,
          title,
          content,
          url,
          publishedAt: new Date(date).toISOString(),
          category: source.category,
        });
      }

      return events;
    } catch (error) {
      console.error(`[Pulse] Failed to fetch generic API ${source.name}:`, error);
      return [];
    }
  }

  async fetchAllSources(): Promise<RawPulseEvent[]> {
    const allEvents: RawPulseEvent[] = [];
    const enabledSources = this.sources.filter(s => s.enabled);

    // Fetch all sources in parallel
    const results = await Promise.allSettled(
      enabledSources.map(source => this.fetchSource(source))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value);
      }
    }

    console.log(`[Pulse] Fetched ${allEvents.length} events from ${enabledSources.length} sources`);
    return allEvents;
  }

  updateSources(sources: PulseSource[]): void {
    this.sources = sources;
  }
}

// ============================================================================
// Keyword Extraction for Tags
// ============================================================================

const CATEGORY_KEYWORDS: Record<PulseCategory, string[]> = {
  THREAT: [
    'cve', 'vulnerability', 'exploit', 'malware', 'ransomware', 'phishing',
    'breach', 'attack', 'security', 'patch', 'zero-day', 'cyber', 'hacker',
    'ddos', 'botnet', 'trojan', 'backdoor', 'encryption', 'cert', 'nist',
  ],
  AI_INSIGHT: [
    'ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning',
    'llm', 'gpt', 'claude', 'openai', 'anthropic', 'neural', 'transformer',
    'chatbot', 'nlp', 'computer vision', 'generative', 'model', 'training',
  ],
  BUSINESS: [
    'business', 'market', 'revenue', 'growth', 'investment', 'startup',
    'enterprise', 'saas', 'cloud', 'strategy', 'merger', 'acquisition',
    'regulation', 'gdpr', 'nis2', 'compliance', 'eu', 'policy', 'digital',
  ],
  ACTIVITY: [
    'release', 'update', 'launch', 'announcement', 'event', 'conference',
    'partnership', 'collaboration', 'milestone', 'achievement', 'news',
  ],
  // Graph-derived categories: keyword heuristics don't apply (leave empty)
  PERSONAL: [],
  FAMILY: [],
};

export function extractTags(text: string, category: PulseCategory): string[] {
  const lowerText = text.toLowerCase();
  const tags: string[] = [];

  // Check keywords for the category
  for (const keyword of CATEGORY_KEYWORDS[category]) {
    if (lowerText.includes(keyword)) {
      tags.push(keyword);
    }
  }

  // Also check other categories for cross-categorization signals
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat !== category) {
      for (const keyword of keywords.slice(0, 5)) { // Only check top 5
        if (lowerText.includes(keyword) && !tags.includes(keyword)) {
          tags.push(keyword);
        }
      }
    }
  }

  return tags.slice(0, 10); // Max 10 tags
}

export function inferCategory(text: string): PulseCategory {
  const lowerText = text.toLowerCase();
  const scores: Record<PulseCategory, number> = {
    THREAT: 0,
    AI_INSIGHT: 0,
    BUSINESS: 0,
    ACTIVITY: 0,
    PERSONAL: 0,
    FAMILY: 0,
  };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        scores[category as PulseCategory]++;
      }
    }
  }

  // Return category with highest score, default to ACTIVITY
  let maxCategory: PulseCategory = 'ACTIVITY';
  let maxScore = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxCategory = category as PulseCategory;
    }
  }

  return maxCategory;
}

/**
 * Pulse+ Storage Layer
 *
 * SQLite-baseret persistens for Pulse cards, feedback og præferencer.
 * Automatisk oprydning af gamle data (24 timer) medmindre gemt af bruger.
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { DEFAULT_PULSE_PREFERENCES } from "./types.js";
import type {
  PulseCard,
  PulseCategory,
  PulseCardStatus,
  PulseFeedback,
  PulsePreferences,
  CurationRequest,
  PulseSource,
} from "./types.js";

// ============================================================================
// Database Setup
// ============================================================================

let db: Database.Database | null = null;

function getDbPath(): string {
  const userDataPath = app?.getPath?.('userData') || '.';
  return path.join(userDataPath, 'pulse.db');
}

export function initPulseStorage(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    -- Pulse Cards
    CREATE TABLE IF NOT EXISTS pulse_cards (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT,
      timestamp TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      relevance_score REAL NOT NULL DEFAULT 0.5,
      status TEXT NOT NULL DEFAULT 'new',
      feedback TEXT,
      tags TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cards_timestamp ON pulse_cards(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_cards_category ON pulse_cards(category);
    CREATE INDEX IF NOT EXISTS idx_cards_status ON pulse_cards(status);

    -- Curation Requests
    CREATE TABLE IF NOT EXISTS curation_requests (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      fulfilled INTEGER NOT NULL DEFAULT 0,
      result_card_ids TEXT DEFAULT '[]'
    );

    -- Pulse Sources
    CREATE TABLE IF NOT EXISTS pulse_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_fetched TEXT,
      fetch_interval_minutes INTEGER NOT NULL DEFAULT 60
    );

    -- User Preferences (single row)
    CREATE TABLE IF NOT EXISTS pulse_preferences (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      preferences TEXT NOT NULL DEFAULT '{}'
    );

    -- Ensure preferences row exists
    INSERT OR IGNORE INTO pulse_preferences (id, preferences) VALUES (1, '{}');

    -- Feedback History (for learning)
    CREATE TABLE IF NOT EXISTS feedback_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT NOT NULL,
      feedback TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (card_id) REFERENCES pulse_cards(id)
    );
  `);

  // Insert default sources if empty
  const sourceCount = db.prepare('SELECT COUNT(*) as count FROM pulse_sources').get() as { count: number };
  if (sourceCount.count === 0) {
    insertDefaultSources(db);
  }

  return db;
}

function insertDefaultSources(database: Database.Database) {
  const defaultSources: Omit<PulseSource, 'lastFetched'>[] = [
    {
      id: 'nvd-cve',
      name: 'NVD CVE Feed',
      type: 'api',
      url: 'https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20',
      category: 'THREAT',
      enabled: true,
      fetchIntervalMinutes: 60,
    },
    {
      id: 'hackernews-ai',
      name: 'Hacker News - AI',
      type: 'api',
      url: 'https://hn.algolia.com/api/v1/search?query=AI+LLM+GPT&tags=story&hitsPerPage=10',
      category: 'AI_INSIGHT',
      enabled: true,
      fetchIntervalMinutes: 30,
    },
    {
      id: 'techcrunch-ai',
      name: 'TechCrunch AI',
      type: 'rss',
      url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
      category: 'AI_INSIGHT',
      enabled: true,
      fetchIntervalMinutes: 60,
    },
    {
      id: 'eu-digital',
      name: 'EU Digital Strategy',
      type: 'rss',
      url: 'https://digital-strategy.ec.europa.eu/en/rss.xml',
      category: 'BUSINESS',
      enabled: true,
      fetchIntervalMinutes: 120,
    },
  ];

  const insert = database.prepare(`
    INSERT INTO pulse_sources (id, name, type, url, category, enabled, fetch_interval_minutes)
    VALUES (@id, @name, @type, @url, @category, @enabled, @fetchIntervalMinutes)
  `);

  for (const source of defaultSources) {
    insert.run({
      ...source,
      enabled: source.enabled ? 1 : 0,
    });
  }
}

export function closePulseStorage() {
  if (db) {
    db.close();
    db = null;
  }
}

// ============================================================================
// Cards CRUD
// ============================================================================

export function insertCard(card: PulseCard): void {
  const database = initPulseStorage();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO pulse_cards
    (id, category, title, summary, source, source_url, timestamp, priority, relevance_score, status, feedback, tags, metadata, updated_at)
    VALUES (@id, @category, @title, @summary, @source, @sourceUrl, @timestamp, @priority, @relevanceScore, @status, @feedback, @tags, @metadata, datetime('now'))
  `);
  stmt.run({
    ...card,
    sourceUrl: card.sourceUrl || null,
    feedback: card.feedback || null,
    tags: JSON.stringify(card.tags),
    metadata: JSON.stringify(card.metadata || {}),
  });
}

export function insertCards(cards: PulseCard[]): void {
  const database = initPulseStorage();
  const insert = database.prepare(`
    INSERT OR REPLACE INTO pulse_cards
    (id, category, title, summary, source, source_url, timestamp, priority, relevance_score, status, feedback, tags, metadata, updated_at)
    VALUES (@id, @category, @title, @summary, @source, @sourceUrl, @timestamp, @priority, @relevanceScore, @status, @feedback, @tags, @metadata, datetime('now'))
  `);

  const transaction = database.transaction((items: PulseCard[]) => {
    for (const card of items) {
      insert.run({
        ...card,
        sourceUrl: card.sourceUrl || null,
        feedback: card.feedback || null,
        tags: JSON.stringify(card.tags),
        metadata: JSON.stringify(card.metadata || {}),
      });
    }
  });

  transaction(cards);
}

export function getCardById(id: string): PulseCard | null {
  const database = initPulseStorage();
  const row = database.prepare('SELECT * FROM pulse_cards WHERE id = ?').get(id) as any;
  return row ? rowToCard(row) : null;
}

export function getTodayCards(limit = 10): PulseCard[] {
  const database = initPulseStorage();
  const today = new Date().toISOString().split('T')[0];
  const rows = database.prepare(`
    SELECT * FROM pulse_cards
    WHERE date(timestamp) = date(?)
    ORDER BY relevance_score DESC, timestamp DESC
    LIMIT ?
  `).all(today, limit) as any[];
  return rows.map(rowToCard);
}

export function getCardsByCategory(category: PulseCategory, limit = 20): PulseCard[] {
  const database = initPulseStorage();
  const rows = database.prepare(`
    SELECT * FROM pulse_cards
    WHERE category = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(category, limit) as any[];
  return rows.map(rowToCard);
}

export function getRecentCards(days = 7, limit = 50): PulseCard[] {
  const database = initPulseStorage();
  const rows = database.prepare(`
    SELECT * FROM pulse_cards
    WHERE timestamp >= datetime('now', '-' || ? || ' days')
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(days, limit) as any[];
  return rows.map(rowToCard);
}

export function updateCardStatus(id: string, status: PulseCardStatus): void {
  const database = initPulseStorage();
  database.prepare(`
    UPDATE pulse_cards SET status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(status, id);
}

export function updateCardFeedback(id: string, feedback: PulseFeedback): void {
  const database = initPulseStorage();

  // Update the card
  database.prepare(`
    UPDATE pulse_cards SET feedback = ?, updated_at = datetime('now') WHERE id = ?
  `).run(feedback, id);

  // Record feedback history for learning
  const card = getCardById(id);
  if (card && feedback) {
    database.prepare(`
      INSERT INTO feedback_history (card_id, category, tags, feedback)
      VALUES (?, ?, ?, ?)
    `).run(id, card.category, JSON.stringify(card.tags), feedback);
  }
}

function rowToCard(row: any): PulseCard {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    summary: row.summary,
    source: row.source,
    sourceUrl: row.source_url || undefined,
    timestamp: row.timestamp,
    priority: row.priority,
    relevanceScore: row.relevance_score,
    status: row.status,
    feedback: row.feedback || null,
    tags: JSON.parse(row.tags || '[]'),
    metadata: JSON.parse(row.metadata || '{}'),
  };
}

// ============================================================================
// Cleanup
// ============================================================================

export function cleanupOldCards(hoursToKeep = 24): number {
  const database = initPulseStorage();
  const result = database.prepare(`
    DELETE FROM pulse_cards
    WHERE status NOT IN ('saved')
    AND created_at < datetime('now', '-' || ? || ' hours')
  `).run(hoursToKeep);
  return result.changes;
}

// ============================================================================
// Curation Requests
// ============================================================================

export function insertCurationRequest(request: CurationRequest): void {
  const database = initPulseStorage();
  database.prepare(`
    INSERT INTO curation_requests (id, topic, created_at, fulfilled, result_card_ids)
    VALUES (@id, @topic, @createdAt, @fulfilled, @resultCardIds)
  `).run({
    ...request,
    fulfilled: request.fulfilled ? 1 : 0,
    resultCardIds: JSON.stringify(request.resultCardIds),
  });
}

export function getPendingCurationRequests(): CurationRequest[] {
  const database = initPulseStorage();
  const rows = database.prepare(`
    SELECT * FROM curation_requests WHERE fulfilled = 0 ORDER BY created_at ASC
  `).all() as any[];
  return rows.map(row => ({
    id: row.id,
    topic: row.topic,
    createdAt: row.created_at,
    fulfilled: Boolean(row.fulfilled),
    resultCardIds: JSON.parse(row.result_card_ids || '[]'),
  }));
}

export function fulfillCurationRequest(id: string, cardIds: string[]): void {
  const database = initPulseStorage();
  database.prepare(`
    UPDATE curation_requests
    SET fulfilled = 1, result_card_ids = ?
    WHERE id = ?
  `).run(JSON.stringify(cardIds), id);
}

// ============================================================================
// Sources
// ============================================================================

export function getSources(): PulseSource[] {
  const database = initPulseStorage();
  const rows = database.prepare('SELECT * FROM pulse_sources').all() as any[];
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    category: row.category,
    enabled: Boolean(row.enabled),
    lastFetched: row.last_fetched || undefined,
    fetchIntervalMinutes: row.fetch_interval_minutes,
  }));
}

export function getEnabledSources(): PulseSource[] {
  const database = initPulseStorage();
  const rows = database.prepare('SELECT * FROM pulse_sources WHERE enabled = 1').all() as any[];
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    category: row.category,
    enabled: true,
    lastFetched: row.last_fetched || undefined,
    fetchIntervalMinutes: row.fetch_interval_minutes,
  }));
}

export function updateSourceLastFetched(id: string): void {
  const database = initPulseStorage();
  database.prepare(`
    UPDATE pulse_sources SET last_fetched = datetime('now') WHERE id = ?
  `).run(id);
}

export function toggleSource(id: string, enabled: boolean): void {
  const database = initPulseStorage();
  database.prepare('UPDATE pulse_sources SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
}

// ============================================================================
// Preferences
// ============================================================================

export function getPreferences(): PulsePreferences {
  const database = initPulseStorage();
  const row = database.prepare('SELECT preferences FROM pulse_preferences WHERE id = 1').get() as { preferences: string } | undefined;
  if (!row) {
    return { ...DEFAULT_PULSE_PREFERENCES };
  }
  try {
    const stored = JSON.parse(row.preferences);
    return { ...DEFAULT_PULSE_PREFERENCES, ...stored };
  } catch {
    return { ...DEFAULT_PULSE_PREFERENCES };
  }
}

export function updatePreferences(prefs: Partial<PulsePreferences>): void {
  const database = initPulseStorage();
  const current = getPreferences();
  const updated = { ...current, ...prefs };
  database.prepare('UPDATE pulse_preferences SET preferences = ? WHERE id = 1').run(JSON.stringify(updated));
}

// ============================================================================
// Feedback Learning
// ============================================================================

export function getFeedbackStats(): Record<PulseCategory, { upCount: number; downCount: number }> {
  const database = initPulseStorage();
  const rows = database.prepare(`
    SELECT category, feedback, COUNT(*) as count
    FROM feedback_history
    GROUP BY category, feedback
  `).all() as { category: PulseCategory; feedback: PulseFeedback; count: number }[];

  const stats: Record<PulseCategory, { upCount: number; downCount: number }> = {
    THREAT: { upCount: 0, downCount: 0 },
    AI_INSIGHT: { upCount: 0, downCount: 0 },
    BUSINESS: { upCount: 0, downCount: 0 },
    ACTIVITY: { upCount: 0, downCount: 0 },
    PERSONAL: { upCount: 0, downCount: 0 },
    FAMILY: { upCount: 0, downCount: 0 },
  };

  for (const row of rows) {
    if (row.feedback === 'up') {
      stats[row.category].upCount = row.count;
    } else if (row.feedback === 'down') {
      stats[row.category].downCount = row.count;
    }
  }

  return stats;
}

export function getPreferredTags(): string[] {
  const database = initPulseStorage();
  const rows = database.prepare(`
    SELECT tags FROM feedback_history WHERE feedback = 'up'
  `).all() as { tags: string }[];

  const tagCounts = new Map<string, number>();
  for (const row of rows) {
    const tags = JSON.parse(row.tags || '[]') as string[];
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag]) => tag);
}

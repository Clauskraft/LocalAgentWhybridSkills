/**
 * Pulse+ Module Types
 *
 * Proaktiv daglig briefing inspireret af ChatGPT Pulse
 * Kategorier:
 *   - THREAT, AI_INSIGHT, BUSINESS, ACTIVITY (WidgeTDC Omni-Stream)
 *   - PERSONAL (Personal Assistant Graph fra Neo4J)
 *   - FAMILY (Family Graph fra Neo4J)
 */

// ============================================================================
// Core Types
// ============================================================================

export type PulseCategory = 'THREAT' | 'AI_INSIGHT' | 'BUSINESS' | 'ACTIVITY' | 'PERSONAL' | 'FAMILY';

export type PulseCardStatus = 'new' | 'viewed' | 'saved' | 'dismissed';

export type PulseFeedback = 'up' | 'down' | null;

export type PulsePriority = 'critical' | 'high' | 'medium' | 'low';

// ============================================================================
// Pulse Card
// ============================================================================

export interface PulseCard {
  id: string;
  category: PulseCategory;
  title: string;
  summary: string;
  source: string;
  sourceUrl?: string;
  timestamp: string;
  priority: PulsePriority;
  relevanceScore: number;
  status: PulseCardStatus;
  feedback: PulseFeedback;
  tags: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Curation
// ============================================================================

export interface CurationRequest {
  id: string;
  topic: string;
  createdAt: string;
  fulfilled: boolean;
  resultCardIds: string[];
}

// ============================================================================
// User Preferences
// ============================================================================

export interface PulsePreferences {
  enabled: boolean;
  dailyTime: string; // HH:mm format, default "05:00"
  maxCards: number; // default 10
  categories: {
    [K in PulseCategory]: {
      enabled: boolean;
      weight: number; // 0-1, affects relevance score
    };
  };
  interests: string[]; // keywords that boost relevance
  blockedKeywords: string[]; // keywords that reduce relevance
}

export const DEFAULT_PULSE_PREFERENCES: PulsePreferences = {
  enabled: true,
  dailyTime: '05:00',
  maxCards: 10,
  categories: {
    THREAT: { enabled: true, weight: 1.0 },
    AI_INSIGHT: { enabled: true, weight: 1.0 },
    BUSINESS: { enabled: true, weight: 0.8 },
    ACTIVITY: { enabled: true, weight: 0.6 },
    PERSONAL: { enabled: true, weight: 1.0 },
    FAMILY: { enabled: true, weight: 0.9 },
  },
  interests: [],
  blockedKeywords: [],
};

// ============================================================================
// Data Sources
// ============================================================================

export interface PulseSource {
  id: string;
  name: string;
  type: 'rss' | 'api' | 'widgetdc' | 'neo4j';
  url: string;
  category: PulseCategory;
  enabled: boolean;
  lastFetched?: string;
  fetchIntervalMinutes: number;
}

export interface RawPulseEvent {
  source: string;
  sourceId: string;
  title: string;
  content: string;
  url?: string;
  publishedAt: string;
  category?: PulseCategory;
  rawData?: Record<string, unknown>;
}

// ============================================================================
// Service Types
// ============================================================================

export interface PulseServiceState {
  isRunning: boolean;
  lastRun?: string;
  nextRun?: string;
  todayCardCount: number;
  error?: string;
}

export interface PulseDailyDigest {
  date: string;
  cards: PulseCard[];
  generatedAt: string;
  curationRequests: CurationRequest[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PulseAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Category Styling
// ============================================================================

export const CATEGORY_CONFIG: Record<PulseCategory, {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  THREAT: {
    label: 'Cybersikkerhed',
    emoji: '🔴',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  AI_INSIGHT: {
    label: 'AI Indsigter',
    emoji: '🟣',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  BUSINESS: {
    label: 'Forretning',
    emoji: '🟡',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  ACTIVITY: {
    label: 'Aktivitet',
    emoji: '🔵',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  PERSONAL: {
    label: 'Personlig Assistent',
    emoji: '🧠',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  FAMILY: {
    label: 'Familie',
    emoji: '👨‍👩‍👧‍👦',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
  },
};

export const PRIORITY_CONFIG: Record<PulsePriority, {
  label: string;
  color: string;
}> = {
  critical: { label: 'Kritisk', color: 'text-red-500' },
  high: { label: 'Høj', color: 'text-orange-400' },
  medium: { label: 'Medium', color: 'text-blue-400' },
  low: { label: 'Lav', color: 'text-gray-400' },
};

// ============================================================================
// Neo4J Graph Types
// ============================================================================

export interface Neo4JConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

export interface Neo4JGraphNode {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface Neo4JGraphRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, unknown>;
}

export interface PersonalAssistantEvent {
  type: 'task_due' | 'reminder' | 'calendar_event' | 'follow_up' | 'goal_progress' | 'habit_streak' | 'note_reference';
  nodeId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: PulsePriority;
  relatedNodes?: Neo4JGraphNode[];
  context?: string;
}

export interface FamilyGraphEvent {
  type: 'birthday' | 'anniversary' | 'event' | 'health_reminder' | 'school_event' | 'milestone' | 'contact_reminder';
  nodeId: string;
  personName: string;
  relationship?: string;
  title: string;
  description?: string;
  eventDate?: string;
  priority: PulsePriority;
  relatedPersons?: string[];
}

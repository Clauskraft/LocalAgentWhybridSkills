/**
 * Pulse+ Service
 *
 * Kernelogik for daglig proaktiv briefing.
 * Koordinerer datainhentning, klassificering, prioritering og summarisering.
 */

import type {
  PulseCard,
  PulseCategory,
  PulsePriority,
  PulsePreferences,
  PulseDailyDigest,
  PulseServiceState,
  RawPulseEvent,
  CurationRequest,
} from "./types.js";
import {
  initPulseStorage,
  insertCards,
  getTodayCards,
  getRecentCards,
  updateCardStatus,
  updateCardFeedback,
  getPreferences,
  updatePreferences,
  getEnabledSources,
  updateSourceLastFetched,
  insertCurationRequest,
  getPendingCurationRequests,
  fulfillCurationRequest,
  cleanupOldCards,
  getFeedbackStats,
  getPreferredTags,
} from "./storage.js";
import { ExternalFeedConnector, extractTags, inferCategory } from "./sources/ExternalFeedConnector.js";
import {
  fetchPersonalAssistantEvents,
  fetchFamilyGraphEvents,
  checkNeo4JConnection,
} from "./sources/Neo4JConnector.js";

// ============================================================================
// UUID Generator (Node.js crypto)
// ============================================================================

function generateId(): string {
  return `pulse-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Pulse Service Class
// ============================================================================

export class PulseService {
  private state: PulseServiceState = {
    isRunning: false,
    todayCardCount: 0,
  };

  private feedConnector: ExternalFeedConnector | null = null;

  constructor() {
    // Initialize storage on construction
    initPulseStorage();
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  getState(): PulseServiceState {
    return { ...this.state };
  }

  // ==========================================================================
  // Daily Digest Generation
  // ==========================================================================

  async generateDailyDigest(): Promise<PulseDailyDigest> {
    if (this.state.isRunning) {
      throw new Error('Pulse generation already in progress');
    }

    this.state.isRunning = true;
    console.log('[Pulse] Starting daily digest generation...');

    try {
      const preferences = getPreferences();

      // 1. Cleanup old cards first
      const cleaned = cleanupOldCards(24);
      console.log(`[Pulse] Cleaned up ${cleaned} old cards`);

      // 2. Fetch raw events from all sources
      const sources = getEnabledSources();
      this.feedConnector = new ExternalFeedConnector(sources);

      const rawEvents = await this.feedConnector.fetchAllSources();
      console.log(`[Pulse] Fetched ${rawEvents.length} raw events from external sources`);

      // 2b. Fetch from Neo4J graphs if available
      const neo4jConnected = await checkNeo4JConnection();
      if (neo4jConnected) {
        console.log('[Pulse] Neo4J connected, fetching graph data...');

        // Fetch Personal Assistant Graph events
        if (preferences.categories.PERSONAL?.enabled) {
          const personalEvents = await fetchPersonalAssistantEvents();
          rawEvents.push(...personalEvents);
          console.log(`[Pulse] Fetched ${personalEvents.length} Personal Assistant events`);
        }

        // Fetch Family Graph events
        if (preferences.categories.FAMILY?.enabled) {
          const familyEvents = await fetchFamilyGraphEvents();
          rawEvents.push(...familyEvents);
          console.log(`[Pulse] Fetched ${familyEvents.length} Family Graph events`);
        }
      } else {
        console.log('[Pulse] Neo4J not connected, skipping graph data');
      }

      console.log(`[Pulse] Total raw events: ${rawEvents.length}`);

      // 3. Update source timestamps
      for (const source of sources) {
        updateSourceLastFetched(source.id);
      }

      // 4. Process and classify events into cards
      const cards = await this.processEvents(rawEvents, preferences);
      console.log(`[Pulse] Processed into ${cards.length} cards`);

      // 5. Apply relevance scoring and sorting
      const scoredCards = this.scoreAndSort(cards, preferences);

      // 6. Select top cards based on preferences
      const selectedCards = scoredCards.slice(0, preferences.maxCards);

      // 7. Handle curation requests
      const curationRequests = getPendingCurationRequests();
      if (curationRequests.length > 0) {
        await this.processCurationRequests(curationRequests, rawEvents, preferences);
      }

      // 8. Save cards to storage
      insertCards(selectedCards);
      console.log(`[Pulse] Saved ${selectedCards.length} cards`);

      // 9. Build digest
      const digest: PulseDailyDigest = {
        date: new Date().toISOString().slice(0, 10),
        cards: selectedCards,
        generatedAt: new Date().toISOString(),
        curationRequests,
      };

      this.state.lastRun = new Date().toISOString();
      this.state.todayCardCount = selectedCards.length;
      this.state.error = undefined;

      return digest;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.state.error = errorMsg;
      console.error('[Pulse] Failed to generate digest:', error);
      throw error;
    } finally {
      this.state.isRunning = false;
    }
  }

  // ==========================================================================
  // Event Processing
  // ==========================================================================

  private async processEvents(
    events: RawPulseEvent[],
    preferences: PulsePreferences
  ): Promise<PulseCard[]> {
    const cards: PulseCard[] = [];
    const seenIds = new Set<string>();

    for (const event of events) {
      // Deduplicate by sourceId
      if (seenIds.has(event.sourceId)) continue;
      seenIds.add(event.sourceId);

      // Determine category (use source category or infer)
      const category = event.category || inferCategory(event.title + ' ' + event.content);

      // Check if category is enabled
      if (!preferences.categories[category]?.enabled) continue;

      // Extract tags for relevance scoring
      const tags = extractTags(event.title + ' ' + event.content, category);

      // Create card
      const card: PulseCard = {
        id: generateId(),
        category,
        title: this.truncateTitle(event.title),
        summary: this.generateSummary(event.content),
        source: event.source,
        sourceUrl: event.url,
        timestamp: event.publishedAt,
        priority: this.inferPriority(event, category),
        relevanceScore: 0.5, // Will be updated in scoring phase
        status: 'new',
        feedback: null,
        tags,
        metadata: {
          originalSourceId: event.sourceId,
        },
      };

      cards.push(card);
    }

    return cards;
  }

  private truncateTitle(title: string, maxLength = 120): string {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  }

  private generateSummary(content: string, maxLength = 250): string {
    // Strip HTML tags if present
    const text = content.replace(/<[^>]*>/g, '').trim();

    if (text.length <= maxLength) return text;

    // Try to cut at sentence boundary
    const truncated = text.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastQuestion = truncated.lastIndexOf('?');
    const lastExclaim = truncated.lastIndexOf('!');

    const cutPoint = Math.max(lastPeriod, lastQuestion, lastExclaim);

    if (cutPoint > maxLength * 0.5) {
      return text.substring(0, cutPoint + 1);
    }

    return truncated + '...';
  }

  private inferPriority(event: RawPulseEvent, category: PulseCategory): PulsePriority {
    // Check if priority is already set in rawData (from Neo4J connector)
    if (event.rawData?.priority) {
      return event.rawData.priority as PulsePriority;
    }

    const text = (event.title + ' ' + event.content).toLowerCase();

    // Critical keywords
    const criticalKeywords = [
      'critical', 'urgent', 'severe', 'emergency', 'immediate',
      'zero-day', '0-day', 'actively exploited', 'ransomware attack',
    ];

    // High priority keywords
    const highKeywords = [
      'important', 'major', 'significant', 'breaking', 'warning',
      'vulnerability', 'breach', 'exploit', 'patch now',
    ];

    for (const keyword of criticalKeywords) {
      if (text.includes(keyword)) return 'critical';
    }

    for (const keyword of highKeywords) {
      if (text.includes(keyword)) return 'high';
    }

    // Category-based defaults
    if (category === 'THREAT') return 'high';
    if (category === 'AI_INSIGHT') return 'medium';

    // Personal Assistant events - check event type
    if (category === 'PERSONAL') {
      const eventType = event.rawData?.eventType;
      if (eventType === 'task_due') return 'high';
      if (eventType === 'calendar_event') return 'high';
      if (eventType === 'follow_up') return 'medium';
      return 'medium';
    }

    // Family events - birthdays and health are higher priority
    if (category === 'FAMILY') {
      const eventType = event.rawData?.eventType;
      if (eventType === 'birthday') return 'high';
      if (eventType === 'health_reminder') return 'high';
      if (eventType === 'anniversary') return 'medium';
      return 'medium';
    }

    return 'medium';
  }

  // ==========================================================================
  // Relevance Scoring
  // ==========================================================================

  private scoreAndSort(cards: PulseCard[], preferences: PulsePreferences): PulseCard[] {
    const feedbackStats = getFeedbackStats();
    const preferredTags = getPreferredTags();

    for (const card of cards) {
      let score = 0.5; // Base score

      // 1. Category weight from preferences
      const categoryWeight = preferences.categories[card.category]?.weight || 0.5;
      score *= categoryWeight;

      // 2. Priority boost
      const priorityBoost: Record<PulsePriority, number> = {
        critical: 0.3,
        high: 0.2,
        medium: 0.1,
        low: 0,
      };
      score += priorityBoost[card.priority] ?? 0;

      // 3. User interests match
      for (const interest of preferences.interests) {
        const lowerInterest = interest.toLowerCase();
        if (
          card.title.toLowerCase().includes(lowerInterest) ||
          card.summary.toLowerCase().includes(lowerInterest) ||
          card.tags.some((t: string) => t.includes(lowerInterest))
        ) {
          score += 0.15;
        }
      }

      // 4. Blocked keywords penalty
      for (const blocked of preferences.blockedKeywords) {
        const lowerBlocked = blocked.toLowerCase();
        if (
          card.title.toLowerCase().includes(lowerBlocked) ||
          card.summary.toLowerCase().includes(lowerBlocked)
        ) {
          score -= 0.3;
        }
      }

      // 5. Feedback learning boost
      const stats = feedbackStats[card.category];
      if (stats) {
        const ratio = stats.upCount / Math.max(stats.upCount + stats.downCount, 1);
        score += (ratio - 0.5) * 0.2; // Adjust based on category feedback history
      }

      // 6. Preferred tags boost
      for (const tag of card.tags) {
        if (preferredTags.includes(tag)) {
          score += 0.05;
        }
      }

      // 7. Recency boost (newer is slightly better)
      const hoursSincePublished = (Date.now() - new Date(card.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursSincePublished < 6) score += 0.1;
      else if (hoursSincePublished < 12) score += 0.05;

      // Clamp score between 0 and 1
      card.relevanceScore = Math.max(0, Math.min(1, score));
    }

    // Sort by relevance score (descending), then by timestamp (descending)
    return cards.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  // ==========================================================================
  // Curation Requests
  // ==========================================================================

  async addCurationRequest(topic: string): Promise<CurationRequest> {
    const request: CurationRequest = {
      id: generateId(),
      topic,
      createdAt: new Date().toISOString(),
      fulfilled: false,
      resultCardIds: [],
    };

    insertCurationRequest(request);
    console.log(`[Pulse] Added curation request: ${topic}`);

    return request;
  }

  private async processCurationRequests(
    requests: CurationRequest[],
    rawEvents: RawPulseEvent[],
    preferences: PulsePreferences
  ): Promise<void> {
    for (const request of requests) {
      console.log(`[Pulse] Processing curation request: ${request.topic}`);

      // Filter events matching the topic
      const topicLower = request.topic.toLowerCase();
      const matchingEvents = rawEvents.filter(event => {
        const text = (event.title + ' ' + event.content).toLowerCase();
        return text.includes(topicLower);
      });

      if (matchingEvents.length > 0) {
        // Process matching events into cards
        const cards = await this.processEvents(matchingEvents.slice(0, 3), preferences);
        insertCards(cards);

        // Mark request as fulfilled
        fulfillCurationRequest(request.id, cards.map(c => c.id));
        console.log(`[Pulse] Fulfilled curation request with ${cards.length} cards`);
      } else {
        // Still mark as fulfilled but with no results
        fulfillCurationRequest(request.id, []);
        console.log(`[Pulse] No matching content for curation request: ${request.topic}`);
      }
    }
  }

  // ==========================================================================
  // Card Operations
  // ==========================================================================

  getTodayCards(): PulseCard[] {
    const prefs = getPreferences();
    return getTodayCards(prefs.maxCards);
  }

  getRecentCards(days = 7): PulseCard[] {
    return getRecentCards(days);
  }

  markAsViewed(cardId: string): void {
    updateCardStatus(cardId, 'viewed');
  }

  saveCard(cardId: string): void {
    updateCardStatus(cardId, 'saved');
  }

  dismissCard(cardId: string): void {
    updateCardStatus(cardId, 'dismissed');
  }

  submitFeedback(cardId: string, feedback: 'up' | 'down'): void {
    updateCardFeedback(cardId, feedback);
    console.log(`[Pulse] Feedback recorded: ${cardId} -> ${feedback}`);
  }

  // ==========================================================================
  // Preferences
  // ==========================================================================

  getPreferences(): PulsePreferences {
    return getPreferences();
  }

  updatePreferences(prefs: Partial<PulsePreferences>): void {
    updatePreferences(prefs);
    console.log('[Pulse] Preferences updated');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let pulseServiceInstance: PulseService | null = null;

export function getPulseService(): PulseService {
  if (!pulseServiceInstance) {
    pulseServiceInstance = new PulseService();
  }
  return pulseServiceInstance;
}

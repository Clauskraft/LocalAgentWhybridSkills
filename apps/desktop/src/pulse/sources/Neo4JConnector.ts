/**
 * Neo4J Graph Connector for Pulse+
 *
 * Fetches data from Personal Assistant Graph and Family Graph in Neo4J
 * to generate daily briefing cards.
 */

import type {
  Neo4JConfig,
  Neo4JGraphNode,
  PersonalAssistantEvent,
  FamilyGraphEvent,
  RawPulseEvent,
  PulsePriority,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_NEO4J_CONFIG: Neo4JConfig = {
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  username: process.env.NEO4J_USERNAME || 'neo4j',
  password: process.env.NEO4J_PASSWORD || '',
  database: process.env.NEO4J_DATABASE || 'neo4j',
};

// ============================================================================
// Neo4J Driver (dynamic import to handle optional dependency)
// ============================================================================

let neo4jDriver: any = null;
let driverInitialized = false;

async function getDriver(config: Neo4JConfig = DEFAULT_NEO4J_CONFIG): Promise<any> {
  if (!driverInitialized) {
    try {
      // Dynamic import for neo4j-driver (optional dependency)
      const neo4j = await import('neo4j-driver');
      neo4jDriver = neo4j.default.driver(
        config.uri,
        neo4j.default.auth.basic(config.username, config.password)
      );
      driverInitialized = true;
      console.log('[Neo4JConnector] Driver initialized successfully');
    } catch (error) {
      console.warn('[Neo4JConnector] neo4j-driver not available:', error);
      return null;
    }
  }
  return neo4jDriver;
}

async function runQuery<T>(cypher: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const driver = await getDriver();
  if (!driver) return [];

  const session = driver.session({ database: DEFAULT_NEO4J_CONFIG.database });
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record: any) => record.toObject()) as T[];
  } catch (error) {
    console.error('[Neo4JConnector] Query error:', error);
    return [];
  } finally {
    await session.close();
  }
}

// ============================================================================
// Personal Assistant Graph Queries
// ============================================================================

/**
 * Fetch upcoming tasks and reminders from Personal Assistant Graph
 */
async function fetchUpcomingTasks(daysAhead: number = 7): Promise<PersonalAssistantEvent[]> {
  const cypher = `
    MATCH (t:Task)
    WHERE t.dueDate IS NOT NULL
      AND date(t.dueDate) >= date()
      AND date(t.dueDate) <= date() + duration({days: $daysAhead})
    OPTIONAL MATCH (t)-[:RELATED_TO]->(related)
    RETURN t, collect(related) as relatedNodes
    ORDER BY t.dueDate ASC
    LIMIT 20
  `;

  const results = await runQuery<{ t: any; relatedNodes: any[] }>(cypher, { daysAhead });

  return results.map((row) => ({
    type: 'task_due' as const,
    nodeId: row.t.identity?.toString() || row.t.properties?.id || '',
    title: row.t.properties?.title || row.t.properties?.name || 'Unnamed Task',
    description: row.t.properties?.description,
    dueDate: row.t.properties?.dueDate,
    priority: mapPriority(row.t.properties?.priority),
    relatedNodes: row.relatedNodes?.map(nodeToGraphNode) || [],
    context: row.t.properties?.context,
  }));
}

/**
 * Fetch calendar events from Personal Assistant Graph
 */
async function fetchCalendarEvents(daysAhead: number = 7): Promise<PersonalAssistantEvent[]> {
  const cypher = `
    MATCH (e:Event)
    WHERE e.date IS NOT NULL
      AND date(e.date) >= date()
      AND date(e.date) <= date() + duration({days: $daysAhead})
    OPTIONAL MATCH (e)-[:INVOLVES]->(p:Person)
    RETURN e, collect(p) as participants
    ORDER BY e.date ASC
    LIMIT 20
  `;

  const results = await runQuery<{ e: any; participants: any[] }>(cypher, { daysAhead });

  return results.map((row) => ({
    type: 'calendar_event' as const,
    nodeId: row.e.identity?.toString() || row.e.properties?.id || '',
    title: row.e.properties?.title || row.e.properties?.name || 'Unnamed Event',
    description: row.e.properties?.description,
    dueDate: row.e.properties?.date,
    priority: mapPriority(row.e.properties?.priority) || 'medium',
    relatedNodes: row.participants?.map(nodeToGraphNode) || [],
    context: row.e.properties?.location,
  }));
}

/**
 * Fetch follow-up reminders (contacts, emails, etc.)
 */
async function fetchFollowUps(daysAhead: number = 7): Promise<PersonalAssistantEvent[]> {
  const cypher = `
    MATCH (f:FollowUp)
    WHERE f.dueDate IS NOT NULL
      AND date(f.dueDate) >= date()
      AND date(f.dueDate) <= date() + duration({days: $daysAhead})
    OPTIONAL MATCH (f)-[:REGARDING]->(subject)
    RETURN f, collect(subject) as subjects
    ORDER BY f.dueDate ASC
    LIMIT 15
  `;

  const results = await runQuery<{ f: any; subjects: any[] }>(cypher, { daysAhead });

  return results.map((row) => ({
    type: 'follow_up' as const,
    nodeId: row.f.identity?.toString() || row.f.properties?.id || '',
    title: row.f.properties?.title || 'Follow-up Reminder',
    description: row.f.properties?.notes,
    dueDate: row.f.properties?.dueDate,
    priority: mapPriority(row.f.properties?.priority) || 'medium',
    relatedNodes: row.subjects?.map(nodeToGraphNode) || [],
    context: row.f.properties?.type,
  }));
}

/**
 * Fetch goal progress updates
 */
async function fetchGoalProgress(): Promise<PersonalAssistantEvent[]> {
  const cypher = `
    MATCH (g:Goal)
    WHERE g.active = true
    OPTIONAL MATCH (g)<-[:CONTRIBUTES_TO]-(milestone:Milestone)
    WHERE milestone.completedAt IS NULL
    RETURN g, collect(milestone) as pendingMilestones
    ORDER BY g.priority DESC
    LIMIT 10
  `;

  const results = await runQuery<{ g: any; pendingMilestones: any[] }>(cypher);

  return results.map((row) => ({
    type: 'goal_progress' as const,
    nodeId: row.g.identity?.toString() || row.g.properties?.id || '',
    title: `Mål: ${row.g.properties?.title || 'Unnamed Goal'}`,
    description: `${row.pendingMilestones?.length || 0} milepæle mangler`,
    priority: mapPriority(row.g.properties?.priority) || 'medium',
    relatedNodes: row.pendingMilestones?.map(nodeToGraphNode) || [],
    context: `${Math.round((row.g.properties?.progress || 0) * 100)}% færdig`,
  }));
}

// ============================================================================
// Family Graph Queries
// ============================================================================

/**
 * Fetch upcoming birthdays from Family Graph
 */
async function fetchUpcomingBirthdays(daysAhead: number = 30): Promise<FamilyGraphEvent[]> {
  const cypher = `
    MATCH (p:Person)
    WHERE p.birthday IS NOT NULL
    WITH p,
         date(p.birthday) as bday,
         date().year as currentYear
    WITH p,
         date({year: currentYear, month: bday.month, day: bday.day}) as thisYearBday
    WHERE thisYearBday >= date() AND thisYearBday <= date() + duration({days: $daysAhead})
    OPTIONAL MATCH (p)<-[:RELATED_TO]-(relation)
    RETURN p, thisYearBday as upcomingBirthday, collect(DISTINCT relation.relationship) as relationships
    ORDER BY thisYearBday ASC
    LIMIT 15
  `;

  const results = await runQuery<{ p: any; upcomingBirthday: string; relationships: string[] }>(
    cypher,
    { daysAhead }
  );

  return results.map((row) => ({
    type: 'birthday' as const,
    nodeId: row.p.identity?.toString() || row.p.properties?.id || '',
    personName: row.p.properties?.name || 'Unknown',
    relationship: row.relationships?.[0],
    title: `🎂 ${row.p.properties?.name || 'Unknown'}s fødselsdag`,
    eventDate: row.upcomingBirthday,
    priority: determineBirthdayPriority(row.upcomingBirthday, row.relationships),
    relatedPersons: [],
  }));
}

/**
 * Fetch upcoming anniversaries from Family Graph
 */
async function fetchAnniversaries(daysAhead: number = 30): Promise<FamilyGraphEvent[]> {
  const cypher = `
    MATCH (r:Relationship {type: 'marriage'})
    WHERE r.date IS NOT NULL
    WITH r,
         date(r.date) as annivDate,
         date().year as currentYear
    WITH r,
         date({year: currentYear, month: annivDate.month, day: annivDate.day}) as thisYearAnniv,
         currentYear - annivDate.year as yearsMarried
    WHERE thisYearAnniv >= date() AND thisYearAnniv <= date() + duration({days: $daysAhead})
    MATCH (r)-[:BETWEEN]->(p1:Person), (r)-[:BETWEEN]->(p2:Person)
    WHERE id(p1) < id(p2)
    RETURN r, p1, p2, thisYearAnniv as upcomingAnniversary, yearsMarried
    ORDER BY thisYearAnniv ASC
    LIMIT 10
  `;

  const results = await runQuery<{
    r: any;
    p1: any;
    p2: any;
    upcomingAnniversary: string;
    yearsMarried: number;
  }>(cypher, { daysAhead });

  return results.map((row) => ({
    type: 'anniversary' as const,
    nodeId: row.r.identity?.toString() || '',
    personName: `${row.p1.properties?.name} & ${row.p2.properties?.name}`,
    title: `💍 ${row.yearsMarried} års bryllupsdag`,
    description: `${row.p1.properties?.name} og ${row.p2.properties?.name}`,
    eventDate: row.upcomingAnniversary,
    priority: row.yearsMarried % 5 === 0 ? 'high' : 'medium',
    relatedPersons: [row.p1.properties?.name, row.p2.properties?.name],
  }));
}

/**
 * Fetch family events (gatherings, holidays, etc.)
 */
async function fetchFamilyEvents(daysAhead: number = 14): Promise<FamilyGraphEvent[]> {
  const cypher = `
    MATCH (e:FamilyEvent)
    WHERE e.date IS NOT NULL
      AND date(e.date) >= date()
      AND date(e.date) <= date() + duration({days: $daysAhead})
    OPTIONAL MATCH (e)-[:INVOLVES]->(p:Person)
    RETURN e, collect(p.name) as participants
    ORDER BY e.date ASC
    LIMIT 15
  `;

  const results = await runQuery<{ e: any; participants: string[] }>(cypher, { daysAhead });

  return results.map((row) => ({
    type: 'event' as const,
    nodeId: row.e.identity?.toString() || row.e.properties?.id || '',
    personName: '',
    title: row.e.properties?.title || 'Family Event',
    description: row.e.properties?.description,
    eventDate: row.e.properties?.date,
    priority: mapPriority(row.e.properties?.priority) || 'medium',
    relatedPersons: row.participants || [],
  }));
}

/**
 * Fetch health reminders for family members
 */
async function fetchHealthReminders(daysAhead: number = 30): Promise<FamilyGraphEvent[]> {
  const cypher = `
    MATCH (h:HealthReminder)-[:FOR]->(p:Person)
    WHERE h.dueDate IS NOT NULL
      AND date(h.dueDate) >= date()
      AND date(h.dueDate) <= date() + duration({days: $daysAhead})
    RETURN h, p
    ORDER BY h.dueDate ASC
    LIMIT 10
  `;

  const results = await runQuery<{ h: any; p: any }>(cypher, { daysAhead });

  return results.map((row) => ({
    type: 'health_reminder' as const,
    nodeId: row.h.identity?.toString() || row.h.properties?.id || '',
    personName: row.p.properties?.name || 'Unknown',
    relationship: row.p.properties?.relationship,
    title: `🏥 ${row.h.properties?.type || 'Sundhedspåmindelse'} - ${row.p.properties?.name}`,
    description: row.h.properties?.notes,
    eventDate: row.h.properties?.dueDate,
    priority: mapPriority(row.h.properties?.priority) || 'high',
    relatedPersons: [row.p.properties?.name],
  }));
}

/**
 * Fetch contact reminders (people you haven't contacted recently)
 */
async function fetchContactReminders(): Promise<FamilyGraphEvent[]> {
  const cypher = `
    MATCH (p:Person)
    WHERE p.lastContact IS NOT NULL
      AND date(p.lastContact) < date() - duration({days: p.contactFrequencyDays})
    OPTIONAL MATCH (p)<-[:RELATED_TO]-(rel)
    RETURN p, collect(DISTINCT rel.relationship) as relationships
    ORDER BY date(p.lastContact) ASC
    LIMIT 10
  `;

  const results = await runQuery<{ p: any; relationships: string[] }>(cypher);

  return results.map((row) => ({
    type: 'contact_reminder' as const,
    nodeId: row.p.identity?.toString() || row.p.properties?.id || '',
    personName: row.p.properties?.name || 'Unknown',
    relationship: row.relationships?.[0],
    title: `📞 Kontakt ${row.p.properties?.name}`,
    description: `Sidst kontaktet: ${row.p.properties?.lastContact || 'Ukendt'}`,
    priority: 'medium',
    relatedPersons: [],
  }));
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Fetch all Personal Assistant Graph events
 */
export async function fetchPersonalAssistantEvents(): Promise<RawPulseEvent[]> {
  const [tasks, events, followUps, goals] = await Promise.all([
    fetchUpcomingTasks(),
    fetchCalendarEvents(),
    fetchFollowUps(),
    fetchGoalProgress(),
  ]);

  const allEvents = [...tasks, ...events, ...followUps, ...goals];

  return allEvents.map((event) => ({
    source: 'neo4j-personal',
    sourceId: event.nodeId,
    title: event.title,
    content: event.description || event.context || '',
    url: undefined,
    publishedAt: event.dueDate || new Date().toISOString(),
    category: 'PERSONAL' as const,
    rawData: {
      eventType: event.type,
      priority: event.priority,
      relatedNodes: event.relatedNodes,
      context: event.context,
    },
  }));
}

/**
 * Fetch all Family Graph events
 */
export async function fetchFamilyGraphEvents(): Promise<RawPulseEvent[]> {
  const [birthdays, anniversaries, familyEvents, healthReminders, contactReminders] =
    await Promise.all([
      fetchUpcomingBirthdays(),
      fetchAnniversaries(),
      fetchFamilyEvents(),
      fetchHealthReminders(),
      fetchContactReminders(),
    ]);

  const allEvents = [
    ...birthdays,
    ...anniversaries,
    ...familyEvents,
    ...healthReminders,
    ...contactReminders,
  ];

  return allEvents.map((event) => ({
    source: 'neo4j-family',
    sourceId: event.nodeId,
    title: event.title,
    content: event.description || `${event.personName}${event.relationship ? ` (${event.relationship})` : ''}`,
    url: undefined,
    publishedAt: event.eventDate || new Date().toISOString(),
    category: 'FAMILY' as const,
    rawData: {
      eventType: event.type,
      personName: event.personName,
      relationship: event.relationship,
      priority: event.priority,
      relatedPersons: event.relatedPersons,
    },
  }));
}

/**
 * Check if Neo4J connection is available
 */
export async function checkNeo4JConnection(): Promise<boolean> {
  const driver = await getDriver();
  if (!driver) return false;

  try {
    await driver.verifyConnectivity();
    return true;
  } catch {
    return false;
  }
}

/**
 * Close the Neo4J driver connection
 */
export async function closeNeo4JConnection(): Promise<void> {
  if (neo4jDriver) {
    await neo4jDriver.close();
    neo4jDriver = null;
    driverInitialized = false;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function nodeToGraphNode(node: any): Neo4JGraphNode {
  return {
    id: node.identity?.toString() || node.properties?.id || '',
    labels: node.labels || [],
    properties: node.properties || {},
  };
}

function mapPriority(value: unknown): PulsePriority {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'critical' || normalized === 'urgent') return 'critical';
    if (normalized === 'high' || normalized === 'important') return 'high';
    if (normalized === 'low' || normalized === 'minor') return 'low';
  }
  if (typeof value === 'number') {
    if (value >= 4) return 'critical';
    if (value >= 3) return 'high';
    if (value <= 1) return 'low';
  }
  return 'medium';
}

function determineBirthdayPriority(dateStr: string, relationships: string[]): PulsePriority {
  try {
    const date = new Date(dateStr);
    const today = new Date();
    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Close family gets higher priority
    const isCloseFamily = relationships?.some((r) =>
      ['spouse', 'partner', 'child', 'parent', 'sibling', 'ægtefælle', 'barn', 'forælder', 'søskende'].includes(
        r?.toLowerCase() || ''
      )
    );

    if (daysUntil <= 1) return 'critical';
    if (daysUntil <= 3 && isCloseFamily) return 'high';
    if (daysUntil <= 7) return isCloseFamily ? 'high' : 'medium';
    return 'low';
  } catch {
    return 'medium';
  }
}

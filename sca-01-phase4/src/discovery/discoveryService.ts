/**
 * Discovery Service for Agent-Mesh
 * Enables agents to discover and register with the mesh
 */

import type { AgentManifest, AgentCapability, AgentTransport, AgentTrustLevel } from "../types/agent.js";

export type DiscoveryMethod = "broadcast" | "registry" | "dns" | "multicast" | "manual";

export interface ServiceEndpoint {
  /** Service URL */
  url: string;
  /** Transport type */
  transport: AgentTransport;
  /** Priority (lower = higher priority) */
  priority: number;
  /** Weight for load balancing */
  weight: number;
  /** Is this endpoint healthy */
  healthy: boolean;
  /** Last health check time */
  lastCheck: Date | null;
}

export interface ServiceRecord {
  /** Service/Agent ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Service version */
  version: string;
  /** Service description */
  description: string;
  /** Available endpoints */
  endpoints: ServiceEndpoint[];
  /** Capabilities provided */
  capabilities: AgentCapability[];
  /** Tags for filtering */
  tags: string[];
  /** Trust level */
  trustLevel: AgentTrustLevel;
  /** Registration time */
  registeredAt: Date;
  /** Last heartbeat */
  lastHeartbeat: Date;
  /** TTL in ms (0 = no expiry) */
  ttlMs: number;
  /** Metadata */
  metadata: Record<string, unknown>;
}

export interface DiscoveryQuery {
  /** Filter by capability name */
  capability?: string;
  /** Filter by tags */
  tags?: string[];
  /** Filter by transport type */
  transport?: AgentTransport;
  /** Filter by minimum trust level */
  minTrustLevel?: AgentTrustLevel;
  /** Only return healthy services */
  healthyOnly?: boolean;
  /** Maximum results */
  limit?: number;
}

export interface DiscoveryConfig {
  /** How agents announce themselves */
  announcementMethod: DiscoveryMethod;
  /** Heartbeat interval in ms */
  heartbeatIntervalMs: number;
  /** Service TTL in ms */
  defaultTtlMs: number;
  /** Health check interval in ms */
  healthCheckIntervalMs: number;
  /** Enable automatic cleanup of expired services */
  autoCleanup: boolean;
  /** Cleanup interval in ms */
  cleanupIntervalMs: number;
  /** Enable caching of discovery results */
  enableCache: boolean;
  /** Cache TTL in ms */
  cacheTtlMs: number;
}

type ServiceChangeHandler = (event: "register" | "unregister" | "update", record: ServiceRecord) => void;

const DEFAULT_CONFIG: DiscoveryConfig = {
  announcementMethod: "registry",
  heartbeatIntervalMs: 30000,
  defaultTtlMs: 120000, // 2 minutes
  healthCheckIntervalMs: 60000,
  autoCleanup: true,
  cleanupIntervalMs: 30000,
  enableCache: true,
  cacheTtlMs: 10000,
};

/**
 * Discovery Service for agent registration and lookup
 */
export class DiscoveryService {
  private config: DiscoveryConfig;
  private services: Map<string, ServiceRecord> = new Map();
  private capabilityIndex: Map<string, Set<string>> = new Map(); // capability -> serviceIds
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> serviceIds
  private changeHandlers: Set<ServiceChangeHandler> = new Set();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private cache: Map<string, { results: ServiceRecord[]; expiresAt: number }> = new Map();

  constructor(config: Partial<DiscoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.autoCleanup) {
      this.startCleanup();
    }
  }

  /**
   * Register a service/agent
   */
  register(
    manifest: AgentManifest,
    endpoints?: ServiceEndpoint[],
    metadata?: Record<string, unknown>
  ): ServiceRecord {
    const now = new Date();

    // Create default endpoint from manifest
    const defaultEndpoints: ServiceEndpoint[] = endpoints ?? [{
      url: manifest.endpoint,
      transport: manifest.transport,
      priority: 1,
      weight: 100,
      healthy: true,
      lastCheck: null,
    }];

    const record: ServiceRecord = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      endpoints: defaultEndpoints,
      capabilities: manifest.capabilities,
      tags: manifest.tags ?? [],
      trustLevel: manifest.trustLevel,
      registeredAt: now,
      lastHeartbeat: now,
      ttlMs: this.config.defaultTtlMs,
      metadata: metadata ?? {},
    };

    // Store the record
    this.services.set(manifest.id, record);

    // Update indexes
    this.indexService(record);

    // Notify handlers
    this.notifyChange("register", record);

    // Invalidate cache
    this.invalidateCache();

    return record;
  }

  /**
   * Unregister a service/agent
   */
  unregister(serviceId: string): boolean {
    const record = this.services.get(serviceId);
    if (!record) return false;

    // Remove from indexes
    this.unindexService(record);

    // Remove record
    this.services.delete(serviceId);

    // Notify handlers
    this.notifyChange("unregister", record);

    // Invalidate cache
    this.invalidateCache();

    return true;
  }

  /**
   * Update service heartbeat
   */
  heartbeat(serviceId: string): boolean {
    const record = this.services.get(serviceId);
    if (!record) return false;

    record.lastHeartbeat = new Date();
    return true;
  }

  /**
   * Update service endpoints
   */
  updateEndpoints(serviceId: string, endpoints: ServiceEndpoint[]): boolean {
    const record = this.services.get(serviceId);
    if (!record) return false;

    record.endpoints = endpoints;
    this.notifyChange("update", record);
    this.invalidateCache();

    return true;
  }

  /**
   * Update endpoint health status
   */
  updateEndpointHealth(serviceId: string, endpointUrl: string, healthy: boolean): boolean {
    const record = this.services.get(serviceId);
    if (!record) return false;

    const endpoint = record.endpoints.find(e => e.url === endpointUrl);
    if (!endpoint) return false;

    endpoint.healthy = healthy;
    endpoint.lastCheck = new Date();

    return true;
  }

  /**
   * Query for services
   */
  query(filter: DiscoveryQuery = {}): ServiceRecord[] {
    // Check cache
    if (this.config.enableCache) {
      const cacheKey = JSON.stringify(filter);
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.results;
      }
    }

    let results: ServiceRecord[] = [];

    // Start with capability filter (most selective)
    if (filter.capability) {
      const serviceIds = this.capabilityIndex.get(filter.capability);
      if (!serviceIds || serviceIds.size === 0) {
        return [];
      }
      results = Array.from(serviceIds)
        .map(id => this.services.get(id))
        .filter((r): r is ServiceRecord => r !== undefined);
    } else {
      results = Array.from(this.services.values());
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(r =>
        filter.tags!.some(tag => r.tags.includes(tag))
      );
    }

    // Filter by transport
    if (filter.transport) {
      results = results.filter(r =>
        r.endpoints.some(e => e.transport === filter.transport)
      );
    }

    // Filter by trust level
    if (filter.minTrustLevel) {
      const trustOrder: AgentTrustLevel[] = ["untrusted", "local", "verified", "signed"];
      const minLevel = trustOrder.indexOf(filter.minTrustLevel);

      results = results.filter(r => {
        const level = trustOrder.indexOf(r.trustLevel);
        return level >= minLevel;
      });
    }

    // Filter by health
    if (filter.healthyOnly) {
      results = results.filter(r =>
        r.endpoints.some(e => e.healthy)
      );
    }

    // Filter expired services
    const now = Date.now();
    results = results.filter(r => {
      if (r.ttlMs === 0) return true;
      const expiresAt = r.lastHeartbeat.getTime() + r.ttlMs;
      return expiresAt > now;
    });

    // Apply limit
    if (filter.limit && results.length > filter.limit) {
      results = results.slice(0, filter.limit);
    }

    // Cache results
    if (this.config.enableCache) {
      const cacheKey = JSON.stringify(filter);
      this.cache.set(cacheKey, {
        results,
        expiresAt: Date.now() + this.config.cacheTtlMs,
      });
    }

    return results;
  }

  /**
   * Get a specific service by ID
   */
  get(serviceId: string): ServiceRecord | undefined {
    return this.services.get(serviceId);
  }

  /**
   * Get all registered services
   */
  getAll(): ServiceRecord[] {
    return Array.from(this.services.values());
  }

  /**
   * Find services by capability
   */
  findByCapability(capabilityName: string): ServiceRecord[] {
    return this.query({ capability: capabilityName });
  }

  /**
   * Find services by tag
   */
  findByTag(tag: string): ServiceRecord[] {
    return this.query({ tags: [tag] });
  }

  /**
   * Get healthy endpoint for a service
   */
  getHealthyEndpoint(serviceId: string): ServiceEndpoint | undefined {
    const record = this.services.get(serviceId);
    if (!record) return undefined;

    // Sort by priority (lower = better) and health
    const sorted = [...record.endpoints]
      .filter(e => e.healthy)
      .sort((a, b) => a.priority - b.priority);

    return sorted[0];
  }

  /**
   * Subscribe to service changes
   */
  onChange(handler: ServiceChangeHandler): () => void {
    this.changeHandlers.add(handler);
    return () => this.changeHandlers.delete(handler);
  }

  /**
   * Get discovery statistics
   */
  getStats(): {
    totalServices: number;
    healthyServices: number;
    capabilitiesCount: number;
    tagsCount: number;
  } {
    const now = Date.now();
    let healthyCount = 0;

    for (const record of this.services.values()) {
      // Check if not expired
      if (record.ttlMs > 0) {
        const expiresAt = record.lastHeartbeat.getTime() + record.ttlMs;
        if (expiresAt <= now) continue;
      }

      // Check if has healthy endpoints
      if (record.endpoints.some(e => e.healthy)) {
        healthyCount++;
      }
    }

    return {
      totalServices: this.services.size,
      healthyServices: healthyCount,
      capabilitiesCount: this.capabilityIndex.size,
      tagsCount: this.tagIndex.size,
    };
  }

  /**
   * Export service registry for backup/sync
   */
  export(): ServiceRecord[] {
    return Array.from(this.services.values());
  }

  /**
   * Import service registry from backup/sync
   */
  import(records: ServiceRecord[]): void {
    for (const record of records) {
      this.services.set(record.id, record);
      this.indexService(record);
    }
    this.invalidateCache();
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
    this.capabilityIndex.clear();
    this.tagIndex.clear();
    this.invalidateCache();
  }

  /**
   * Stop the discovery service
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private indexService(record: ServiceRecord): void {
    // Index capabilities
    for (const cap of record.capabilities) {
      if (!this.capabilityIndex.has(cap.name)) {
        this.capabilityIndex.set(cap.name, new Set());
      }
      this.capabilityIndex.get(cap.name)!.add(record.id);
    }

    // Index tags
    for (const tag of record.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(record.id);
    }
  }

  private unindexService(record: ServiceRecord): void {
    // Remove from capability index
    for (const cap of record.capabilities) {
      const set = this.capabilityIndex.get(cap.name);
      if (set) {
        set.delete(record.id);
        if (set.size === 0) {
          this.capabilityIndex.delete(cap.name);
        }
      }
    }

    // Remove from tag index
    for (const tag of record.tags) {
      const set = this.tagIndex.get(tag);
      if (set) {
        set.delete(record.id);
        if (set.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  private notifyChange(event: "register" | "unregister" | "update", record: ServiceRecord): void {
    for (const handler of this.changeHandlers) {
      try {
        handler(event, record);
      } catch (e) {
        console.error("Change handler error:", e);
      }
    }
  }

  private invalidateCache(): void {
    this.cache.clear();
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }

  private cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [id, record] of this.services.entries()) {
      if (record.ttlMs === 0) continue;

      const expiresAt = record.lastHeartbeat.getTime() + record.ttlMs;
      if (expiresAt <= now) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      this.unregister(id);
    }

    // Clean up old cache entries
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * DNS-SD style service advertisement
 */
export interface ServiceAdvertisement {
  serviceType: string;  // e.g., "_mcp._tcp"
  serviceName: string;  // e.g., "file-agent"
  port: number;
  host: string;
  txtRecords: Record<string, string>;
}

/**
 * Create advertisement from service record
 */
export function createAdvertisement(record: ServiceRecord): ServiceAdvertisement {
  const endpoint = record.endpoints[0];
  const url = new URL(endpoint?.url ?? "http://localhost:8080");

  return {
    serviceType: "_mcp._tcp",
    serviceName: record.id,
    port: parseInt(url.port) || (url.protocol === "https:" ? 443 : 80),
    host: url.hostname,
    txtRecords: {
      version: record.version,
      transport: endpoint?.transport ?? "http",
      capabilities: record.capabilities.map(c => c.name).join(","),
      tags: record.tags.join(","),
    },
  };
}

// Default singleton
export const discoveryService = new DiscoveryService();

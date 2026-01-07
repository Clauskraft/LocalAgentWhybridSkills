/**
 * Load Balancer for Agent-Mesh
 * Distributes tool calls across multiple agents providing the same capability
 */

import type { AgentRegistryEntry, AgentStatus } from "../types/agent.js";

export type LoadBalancingStrategy =
  | "round-robin"      // Rotate through agents sequentially
  | "least-connections" // Route to agent with fewest active calls
  | "weighted"         // Weight-based distribution
  | "latency"          // Route to fastest responding agent
  | "random"           // Random selection
  | "sticky"           // Same source always routes to same target
  | "failover";        // Primary with fallback chain

export interface AgentHealth {
  agentId: string;
  status: AgentStatus;
  activeConnections: number;
  avgLatencyMs: number;
  successRate: number;
  lastHealthCheck: Date;
  weight: number;
  isHealthy: boolean;
}

export interface LoadBalancerConfig {
  /** Default strategy */
  strategy: LoadBalancingStrategy;
  /** Health check interval in ms */
  healthCheckIntervalMs: number;
  /** Unhealthy threshold (consecutive failures) */
  unhealthyThreshold: number;
  /** Healthy threshold (consecutive successes to recover) */
  healthyThreshold: number;
  /** Connection timeout for health checks */
  healthCheckTimeoutMs: number;
  /** Enable circuit breaker */
  circuitBreakerEnabled: boolean;
  /** Circuit breaker open duration in ms */
  circuitBreakerDurationMs: number;
  /** Max latency before marking agent as slow */
  maxLatencyMs: number;
  /** Sticky session TTL in ms */
  stickySessionTtlMs: number;
}

interface AgentStats {
  activeConnections: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalLatencyMs: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastRequestTime: Date | null;
  circuitOpen: boolean;
  circuitOpenedAt: Date | null;
}

const DEFAULT_CONFIG: LoadBalancerConfig = {
  strategy: "round-robin",
  healthCheckIntervalMs: 30000,
  unhealthyThreshold: 3,
  healthyThreshold: 2,
  healthCheckTimeoutMs: 5000,
  circuitBreakerEnabled: true,
  circuitBreakerDurationMs: 30000,
  maxLatencyMs: 10000,
  stickySessionTtlMs: 300000, // 5 minutes
};

/**
 * Load Balancer for distributing requests across agents
 */
export class LoadBalancer {
  private config: LoadBalancerConfig;
  private agents: Map<string, AgentHealth> = new Map();
  private stats: Map<string, AgentStats> = new Map();
  private roundRobinIndex = 0;
  private stickyMap: Map<string, { agentId: string; expiresAt: number }> = new Map();
  private failoverOrder: string[] = [];
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<LoadBalancerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the load balancer with health checking
   */
  start(): void {
    if (this.healthCheckTimer) return;

    this.healthCheckTimer = setInterval(() => {
      this.runHealthChecks();
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Stop the load balancer
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Register an agent with the load balancer
   */
  registerAgent(entry: AgentRegistryEntry, weight: number = 1): void {
    const health: AgentHealth = {
      agentId: entry.manifest.id,
      status: entry.state.status,
      activeConnections: 0,
      avgLatencyMs: 0,
      successRate: 1.0,
      lastHealthCheck: new Date(),
      weight,
      isHealthy: entry.state.status === "online",
    };

    this.agents.set(entry.manifest.id, health);

    this.stats.set(entry.manifest.id, {
      activeConnections: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalLatencyMs: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastRequestTime: null,
      circuitOpen: false,
      circuitOpenedAt: null,
    });

    // Add to failover order
    if (!this.failoverOrder.includes(entry.manifest.id)) {
      this.failoverOrder.push(entry.manifest.id);
    }
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.stats.delete(agentId);
    this.failoverOrder = this.failoverOrder.filter(id => id !== agentId);
  }

  /**
   * Update agent weight (for weighted strategy)
   */
  setWeight(agentId: string, weight: number): void {
    const health = this.agents.get(agentId);
    if (health) {
      health.weight = Math.max(0, Math.min(100, weight));
    }
  }

  /**
   * Set failover order (for failover strategy)
   */
  setFailoverOrder(agentIds: string[]): void {
    this.failoverOrder = agentIds.filter(id => this.agents.has(id));
  }

  /**
   * Select an agent for a request
   */
  selectAgent(
    toolName?: string,
    sourceId?: string,
    strategy?: LoadBalancingStrategy
  ): string | null {
    const effectiveStrategy = strategy ?? this.config.strategy;
    const healthyAgents = this.getHealthyAgents();

    if (healthyAgents.length === 0) {
      return null;
    }

    switch (effectiveStrategy) {
      case "round-robin":
        return this.selectRoundRobin(healthyAgents);

      case "least-connections":
        return this.selectLeastConnections(healthyAgents);

      case "weighted":
        return this.selectWeighted(healthyAgents);

      case "latency":
        return this.selectLowestLatency(healthyAgents);

      case "random":
        return this.selectRandom(healthyAgents);

      case "sticky":
        return this.selectSticky(healthyAgents, sourceId ?? "default");

      case "failover":
        return this.selectFailover(healthyAgents);

      default:
        return this.selectRoundRobin(healthyAgents);
    }
  }

  /**
   * Record the start of a request
   */
  recordRequestStart(agentId: string): void {
    const stats = this.stats.get(agentId);
    const health = this.agents.get(agentId);

    if (stats) {
      stats.activeConnections++;
      stats.totalRequests++;
      stats.lastRequestTime = new Date();
    }

    if (health) {
      health.activeConnections++;
    }
  }

  /**
   * Record the completion of a request
   */
  recordRequestEnd(agentId: string, success: boolean, latencyMs: number): void {
    const stats = this.stats.get(agentId);
    const health = this.agents.get(agentId);

    if (stats) {
      stats.activeConnections = Math.max(0, stats.activeConnections - 1);

      if (success) {
        stats.successfulRequests++;
        stats.consecutiveSuccesses++;
        stats.consecutiveFailures = 0;

        // Check if we should close circuit
        if (stats.circuitOpen && stats.consecutiveSuccesses >= this.config.healthyThreshold) {
          stats.circuitOpen = false;
          stats.circuitOpenedAt = null;
        }
      } else {
        stats.failedRequests++;
        stats.consecutiveFailures++;
        stats.consecutiveSuccesses = 0;

        // Check if we should open circuit
        if (this.config.circuitBreakerEnabled &&
            stats.consecutiveFailures >= this.config.unhealthyThreshold) {
          stats.circuitOpen = true;
          stats.circuitOpenedAt = new Date();
        }
      }

      stats.totalLatencyMs += latencyMs;
    }

    if (health) {
      health.activeConnections = Math.max(0, health.activeConnections - 1);

      // Update average latency (exponential moving average)
      const alpha = 0.2;
      health.avgLatencyMs = alpha * latencyMs + (1 - alpha) * health.avgLatencyMs;

      // Update success rate
      if (stats) {
        health.successRate = stats.totalRequests > 0
          ? stats.successfulRequests / stats.totalRequests
          : 1.0;
      }

      // Update health status
      this.updateHealthStatus(agentId);
    }
  }

  /**
   * Get agent health information
   */
  getAgentHealth(agentId: string): AgentHealth | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents' health
   */
  getAllHealth(): AgentHealth[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get healthy agents
   */
  getHealthyAgents(): AgentHealth[] {
    const now = Date.now();

    return Array.from(this.agents.values()).filter(health => {
      const stats = this.stats.get(health.agentId);

      // Check circuit breaker
      if (stats?.circuitOpen) {
        // Check if circuit should be half-open (allow testing)
        if (stats.circuitOpenedAt) {
          const elapsed = now - stats.circuitOpenedAt.getTime();
          if (elapsed < this.config.circuitBreakerDurationMs) {
            return false;
          }
        }
      }

      return health.isHealthy && health.status === "online";
    });
  }

  /**
   * Get load balancer statistics
   */
  getStats(): {
    totalAgents: number;
    healthyAgents: number;
    totalActiveConnections: number;
    circuitsBroken: number;
    strategy: LoadBalancingStrategy;
  } {
    let totalActive = 0;
    let circuitsBroken = 0;

    for (const stats of this.stats.values()) {
      totalActive += stats.activeConnections;
      if (stats.circuitOpen) circuitsBroken++;
    }

    return {
      totalAgents: this.agents.size,
      healthyAgents: this.getHealthyAgents().length,
      totalActiveConnections: totalActive,
      circuitsBroken,
      strategy: this.config.strategy,
    };
  }

  /**
   * Force health check on an agent
   */
  async checkHealth(agentId: string, checker: () => Promise<boolean>): Promise<boolean> {
    const health = this.agents.get(agentId);
    if (!health) return false;

    try {
      const isHealthy = await Promise.race([
        checker(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), this.config.healthCheckTimeoutMs)
        ),
      ]);

      health.lastHealthCheck = new Date();

      if (isHealthy) {
        const stats = this.stats.get(agentId);
        if (stats) {
          stats.consecutiveSuccesses++;
          stats.consecutiveFailures = 0;
        }
        health.isHealthy = true;
        health.status = "online";
      } else {
        this.markUnhealthy(agentId, "Health check failed");
      }

      return isHealthy;
    } catch {
      this.markUnhealthy(agentId, "Health check timeout");
      return false;
    }
  }

  /**
   * Mark an agent as unhealthy
   */
  markUnhealthy(agentId: string, reason?: string): void {
    const health = this.agents.get(agentId);
    const stats = this.stats.get(agentId);

    if (health) {
      health.isHealthy = false;
      health.status = "error";
    }

    if (stats) {
      stats.consecutiveFailures++;
      stats.consecutiveSuccesses = 0;
    }

    console.log(`[LoadBalancer] Agent ${agentId} marked unhealthy: ${reason ?? "unknown"}`);
  }

  /**
   * Mark an agent as healthy
   */
  markHealthy(agentId: string): void {
    const health = this.agents.get(agentId);
    const stats = this.stats.get(agentId);

    if (health) {
      health.isHealthy = true;
      health.status = "online";
    }

    if (stats) {
      stats.consecutiveSuccesses++;
      stats.consecutiveFailures = 0;
      stats.circuitOpen = false;
      stats.circuitOpenedAt = null;
    }
  }

  // Selection strategies

  private selectRoundRobin(agents: AgentHealth[]): string {
    const index = this.roundRobinIndex % agents.length;
    this.roundRobinIndex = (this.roundRobinIndex + 1) % agents.length;
    return agents[index]!.agentId;
  }

  private selectLeastConnections(agents: AgentHealth[]): string {
    let selected = agents[0]!;

    for (const agent of agents) {
      if (agent.activeConnections < selected.activeConnections) {
        selected = agent;
      }
    }

    return selected.agentId;
  }

  private selectWeighted(agents: AgentHealth[]): string {
    const totalWeight = agents.reduce((sum, a) => sum + a.weight, 0);
    if (totalWeight === 0) return agents[0]!.agentId;

    let random = Math.random() * totalWeight;

    for (const agent of agents) {
      random -= agent.weight;
      if (random <= 0) {
        return agent.agentId;
      }
    }

    return agents[agents.length - 1]!.agentId;
  }

  private selectLowestLatency(agents: AgentHealth[]): string {
    let selected = agents[0]!;

    for (const agent of agents) {
      // Prefer agents with lower latency, but also consider success rate
      const score = agent.avgLatencyMs / Math.max(0.1, agent.successRate);
      const selectedScore = selected.avgLatencyMs / Math.max(0.1, selected.successRate);

      if (score < selectedScore) {
        selected = agent;
      }
    }

    return selected.agentId;
  }

  private selectRandom(agents: AgentHealth[]): string {
    const index = Math.floor(Math.random() * agents.length);
    return agents[index]!.agentId;
  }

  private selectSticky(agents: AgentHealth[], sourceId: string): string {
    const now = Date.now();
    const existing = this.stickyMap.get(sourceId);

    // Check if existing sticky mapping is valid
    if (existing && existing.expiresAt > now) {
      const agent = agents.find(a => a.agentId === existing.agentId);
      if (agent) {
        return agent.agentId;
      }
    }

    // Create new sticky mapping
    const selected = this.selectRoundRobin(agents);
    this.stickyMap.set(sourceId, {
      agentId: selected,
      expiresAt: now + this.config.stickySessionTtlMs,
    });

    return selected;
  }

  private selectFailover(agents: AgentHealth[]): string {
    // Return first healthy agent in failover order
    for (const agentId of this.failoverOrder) {
      const agent = agents.find(a => a.agentId === agentId);
      if (agent) {
        return agent.agentId;
      }
    }

    // Fallback to first available
    return agents[0]!.agentId;
  }

  private updateHealthStatus(agentId: string): void {
    const health = this.agents.get(agentId);
    const stats = this.stats.get(agentId);

    if (!health || !stats) return;

    // Check various health indicators
    const isSlowAgent = health.avgLatencyMs > this.config.maxLatencyMs;
    const hasLowSuccessRate = health.successRate < 0.5;
    const hasCircuitOpen = stats.circuitOpen;

    health.isHealthy = !isSlowAgent && !hasLowSuccessRate && !hasCircuitOpen;

    if (!health.isHealthy) {
      health.status = "error";
    }
  }

  private runHealthChecks(): void {
    const now = Date.now();

    // Clean up expired sticky mappings
    for (const [sourceId, mapping] of this.stickyMap.entries()) {
      if (mapping.expiresAt < now) {
        this.stickyMap.delete(sourceId);
      }
    }

    // Reset circuit breakers that have been open long enough
    for (const [agentId, stats] of this.stats.entries()) {
      if (stats.circuitOpen && stats.circuitOpenedAt) {
        const elapsed = now - stats.circuitOpenedAt.getTime();
        if (elapsed >= this.config.circuitBreakerDurationMs) {
          // Half-open the circuit for testing
          console.log(`[LoadBalancer] Circuit half-open for ${agentId}`);
        }
      }
    }
  }
}

/**
 * Create a load balancer with specific strategy presets
 */
export const LoadBalancerPresets = {
  /** High availability: failover with circuit breaker */
  highAvailability: (): LoadBalancer => new LoadBalancer({
    strategy: "failover",
    circuitBreakerEnabled: true,
    unhealthyThreshold: 2,
    healthyThreshold: 3,
    circuitBreakerDurationMs: 60000,
  }),

  /** Performance: latency-based with aggressive health checks */
  performance: (): LoadBalancer => new LoadBalancer({
    strategy: "latency",
    healthCheckIntervalMs: 15000,
    maxLatencyMs: 5000,
    circuitBreakerEnabled: true,
  }),

  /** Simple: round-robin for testing/development */
  simple: (): LoadBalancer => new LoadBalancer({
    strategy: "round-robin",
    circuitBreakerEnabled: false,
    healthCheckIntervalMs: 60000,
  }),

  /** Sticky sessions: for stateful agents */
  sticky: (): LoadBalancer => new LoadBalancer({
    strategy: "sticky",
    stickySessionTtlMs: 600000, // 10 minutes
    circuitBreakerEnabled: true,
  }),

  /** Weighted: for heterogeneous agent pools */
  weighted: (): LoadBalancer => new LoadBalancer({
    strategy: "weighted",
    circuitBreakerEnabled: true,
    healthCheckIntervalMs: 30000,
  }),
};

// Default singleton
export const loadBalancer = new LoadBalancer();

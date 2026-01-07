/**
 * Agent-to-Agent Messaging System
 * Direct communication between agents in the mesh
 */

import type { AgentMessage, ToolCallRequest, ToolCallResponse } from "../types/agent.js";

export type MessagePriority = "low" | "normal" | "high" | "urgent";

export type MessageType =
  | "request"      // Tool call request
  | "response"     // Tool call response
  | "notification" // One-way notification
  | "broadcast"    // Message to all agents
  | "heartbeat"    // Keepalive ping
  | "subscribe"    // Subscribe to topic
  | "unsubscribe"  // Unsubscribe from topic
  | "ack"          // Acknowledgment
  | "error";       // Error notification

export interface AgentEnvelope {
  /** Unique message ID */
  id: string;
  /** Message type */
  type: MessageType;
  /** Source agent ID */
  from: string;
  /** Target agent ID (or "*" for broadcast) */
  to: string;
  /** Message priority */
  priority: MessagePriority;
  /** ISO timestamp */
  timestamp: string;
  /** Time-to-live in ms (0 = no expiry) */
  ttlMs: number;
  /** Correlation ID for request/response matching */
  correlationId?: string;
  /** Topic for pub/sub messaging */
  topic?: string;
  /** Payload data */
  payload: unknown;
  /** Retry count */
  retryCount: number;
  /** Max retries allowed */
  maxRetries: number;
}

export interface DeliveryReceipt {
  messageId: string;
  delivered: boolean;
  deliveredAt?: string;
  agentId: string;
  error?: string;
}

export interface MessagingConfig {
  /** Maximum message queue size per agent */
  maxQueueSize: number;
  /** Default TTL for messages in ms */
  defaultTtlMs: number;
  /** Enable message persistence */
  persistMessages: boolean;
  /** Message retry delay in ms */
  retryDelayMs: number;
  /** Default max retries */
  defaultMaxRetries: number;
  /** Enable delivery receipts */
  enableReceipts: boolean;
  /** Dead letter queue for failed messages */
  enableDeadLetterQueue: boolean;
}

type MessageHandler = (envelope: AgentEnvelope) => void | Promise<void>;
type TopicHandler = (envelope: AgentEnvelope, topic: string) => void | Promise<void>;

const DEFAULT_CONFIG: MessagingConfig = {
  maxQueueSize: 1000,
  defaultTtlMs: 300000, // 5 minutes
  persistMessages: false,
  retryDelayMs: 1000,
  defaultMaxRetries: 3,
  enableReceipts: true,
  enableDeadLetterQueue: true,
};

/**
 * Message Queue for a single agent
 */
class AgentMessageQueue {
  private queue: AgentEnvelope[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  enqueue(envelope: AgentEnvelope): boolean {
    if (this.queue.length >= this.maxSize) {
      return false;
    }

    // Insert by priority (urgent first)
    const priorityOrder: Record<MessagePriority, number> = {
      urgent: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    const insertIndex = this.queue.findIndex(
      (e) => priorityOrder[e.priority] > priorityOrder[envelope.priority]
    );

    if (insertIndex === -1) {
      this.queue.push(envelope);
    } else {
      this.queue.splice(insertIndex, 0, envelope);
    }

    return true;
  }

  dequeue(): AgentEnvelope | undefined {
    return this.queue.shift();
  }

  peek(): AgentEnvelope | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }

  removeExpired(): number {
    const now = Date.now();
    const before = this.queue.length;
    this.queue = this.queue.filter((e) => {
      if (e.ttlMs === 0) return true;
      const expiresAt = new Date(e.timestamp).getTime() + e.ttlMs;
      return expiresAt > now;
    });
    return before - this.queue.length;
  }

  getAll(): AgentEnvelope[] {
    return [...this.queue];
  }
}

/**
 * Agent Messaging Hub
 * Central hub for agent-to-agent communication
 */
export class AgentMessagingHub {
  private config: MessagingConfig;
  private queues: Map<string, AgentMessageQueue> = new Map();
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private topicSubscriptions: Map<string, Set<string>> = new Map(); // topic -> agentIds
  private topicHandlers: Map<string, Set<TopicHandler>> = new Map();
  private pendingResponses: Map<string, {
    resolve: (response: AgentEnvelope) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private deadLetterQueue: AgentEnvelope[] = [];
  private deliveryReceipts: Map<string, DeliveryReceipt[]> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<MessagingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Register an agent with the messaging hub
   */
  registerAgent(agentId: string): void {
    if (!this.queues.has(agentId)) {
      this.queues.set(agentId, new AgentMessageQueue(this.config.maxQueueSize));
      this.handlers.set(agentId, new Set());
    }
  }

  /**
   * Unregister an agent from the messaging hub
   */
  unregisterAgent(agentId: string): void {
    this.queues.delete(agentId);
    this.handlers.delete(agentId);

    // Remove from topic subscriptions
    for (const [topic, subscribers] of this.topicSubscriptions.entries()) {
      subscribers.delete(agentId);
      if (subscribers.size === 0) {
        this.topicSubscriptions.delete(topic);
      }
    }
  }

  /**
   * Subscribe to messages for an agent
   */
  onMessage(agentId: string, handler: MessageHandler): () => void {
    this.registerAgent(agentId);
    const handlers = this.handlers.get(agentId)!;
    handlers.add(handler);
    return () => handlers.delete(handler);
  }

  /**
   * Subscribe to a topic
   */
  subscribeTopic(agentId: string, topic: string, handler?: TopicHandler): () => void {
    if (!this.topicSubscriptions.has(topic)) {
      this.topicSubscriptions.set(topic, new Set());
    }
    this.topicSubscriptions.get(topic)!.add(agentId);

    if (handler) {
      if (!this.topicHandlers.has(topic)) {
        this.topicHandlers.set(topic, new Set());
      }
      this.topicHandlers.get(topic)!.add(handler);

      return () => {
        this.topicSubscriptions.get(topic)?.delete(agentId);
        this.topicHandlers.get(topic)?.delete(handler);
      };
    }

    return () => {
      this.topicSubscriptions.get(topic)?.delete(agentId);
    };
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribeTopic(agentId: string, topic: string): void {
    this.topicSubscriptions.get(topic)?.delete(agentId);
  }

  /**
   * Send a message to another agent
   */
  async send(
    from: string,
    to: string,
    type: MessageType,
    payload: unknown,
    options: Partial<{
      priority: MessagePriority;
      ttlMs: number;
      correlationId: string;
      topic: string;
      maxRetries: number;
    }> = {}
  ): Promise<DeliveryReceipt> {
    const envelope: AgentEnvelope = {
      id: this.generateId(),
      type,
      from,
      to,
      priority: options.priority ?? "normal",
      timestamp: new Date().toISOString(),
      ttlMs: options.ttlMs ?? this.config.defaultTtlMs,
      ...(options.correlationId ? { correlationId: options.correlationId } : {}),
      ...(options.topic ? { topic: options.topic } : {}),
      payload,
      retryCount: 0,
      maxRetries: options.maxRetries ?? this.config.defaultMaxRetries,
    };

    return this.deliver(envelope);
  }

  /**
   * Send a request and wait for response
   */
  async request(
    from: string,
    to: string,
    payload: unknown,
    timeoutMs: number = 30000
  ): Promise<AgentEnvelope> {
    const correlationId = this.generateId();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(correlationId);
        reject(new Error(`Request timeout: ${correlationId}`));
      }, timeoutMs);

      this.pendingResponses.set(correlationId, { resolve, reject, timeout });

      this.send(from, to, "request", payload, { correlationId }).catch((e) => {
        clearTimeout(timeout);
        this.pendingResponses.delete(correlationId);
        reject(e);
      });
    });
  }

  /**
   * Send a response to a request
   */
  async respond(
    from: string,
    to: string,
    correlationId: string,
    payload: unknown,
    success: boolean = true
  ): Promise<DeliveryReceipt> {
    return this.send(from, to, success ? "response" : "error", payload, { correlationId });
  }

  /**
   * Broadcast a message to all agents
   */
  async broadcast(from: string, payload: unknown, options?: { topic?: string }): Promise<DeliveryReceipt[]> {
    const receipts: DeliveryReceipt[] = [];

    if (options?.topic) {
      // Topic-based broadcast
      const subscribers = this.topicSubscriptions.get(options.topic) ?? new Set();
      for (const agentId of subscribers) {
        if (agentId !== from) {
          const receipt = await this.send(from, agentId, "broadcast", payload, { topic: options.topic });
          receipts.push(receipt);
        }
      }
    } else {
      // Broadcast to all registered agents
      for (const agentId of this.queues.keys()) {
        if (agentId !== from) {
          const receipt = await this.send(from, agentId, "broadcast", payload);
          receipts.push(receipt);
        }
      }
    }

    return receipts;
  }

  /**
   * Publish to a topic
   */
  async publish(from: string, topic: string, payload: unknown): Promise<DeliveryReceipt[]> {
    return this.broadcast(from, payload, { topic });
  }

  /**
   * Get pending messages for an agent
   */
  getPendingMessages(agentId: string): AgentEnvelope[] {
    const queue = this.queues.get(agentId);
    return queue?.getAll() ?? [];
  }

  /**
   * Process next message for an agent
   */
  async processNext(agentId: string): Promise<AgentEnvelope | undefined> {
    const queue = this.queues.get(agentId);
    if (!queue) return undefined;

    const envelope = queue.dequeue();
    if (!envelope) return undefined;

    // Check if expired
    if (envelope.ttlMs > 0) {
      const expiresAt = new Date(envelope.timestamp).getTime() + envelope.ttlMs;
      if (Date.now() > expiresAt) {
        // Message expired, try next
        return this.processNext(agentId);
      }
    }

    // Handle response correlation
    if ((envelope.type === "response" || envelope.type === "error") && envelope.correlationId) {
      const pending = this.pendingResponses.get(envelope.correlationId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingResponses.delete(envelope.correlationId);
        pending.resolve(envelope);
      }
    }

    // Notify handlers
    const handlers = this.handlers.get(agentId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(envelope);
        } catch (e) {
          console.error(`Handler error for agent ${agentId}:`, e);
        }
      }
    }

    // Topic handlers
    if (envelope.topic) {
      const topicHandlers = this.topicHandlers.get(envelope.topic);
      if (topicHandlers) {
        for (const handler of topicHandlers) {
          try {
            await handler(envelope, envelope.topic);
          } catch (e) {
            console.error(`Topic handler error for ${envelope.topic}:`, e);
          }
        }
      }
    }

    return envelope;
  }

  /**
   * Get hub statistics
   */
  getStats(): {
    registeredAgents: number;
    totalQueuedMessages: number;
    topicCount: number;
    deadLetterCount: number;
    pendingRequests: number;
  } {
    let totalQueued = 0;
    for (const queue of this.queues.values()) {
      totalQueued += queue.size();
    }

    return {
      registeredAgents: this.queues.size,
      totalQueuedMessages: totalQueued,
      topicCount: this.topicSubscriptions.size,
      deadLetterCount: this.deadLetterQueue.length,
      pendingRequests: this.pendingResponses.size,
    };
  }

  /**
   * Get dead letter queue contents
   */
  getDeadLetterQueue(): AgentEnvelope[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): number {
    const count = this.deadLetterQueue.length;
    this.deadLetterQueue = [];
    return count;
  }

  /**
   * Shutdown the messaging hub
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear all pending responses
    for (const [id, pending] of this.pendingResponses.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Messaging hub shutdown"));
    }
    this.pendingResponses.clear();

    // Clear all queues
    this.queues.clear();
    this.handlers.clear();
    this.topicSubscriptions.clear();
    this.topicHandlers.clear();
  }

  private async deliver(envelope: AgentEnvelope): Promise<DeliveryReceipt> {
    const queue = this.queues.get(envelope.to);

    if (!queue) {
      // Agent not registered
      const receipt: DeliveryReceipt = {
        messageId: envelope.id,
        delivered: false,
        agentId: envelope.to,
        error: "Agent not registered",
      };

      if (this.config.enableDeadLetterQueue) {
        this.deadLetterQueue.push(envelope);
      }

      return receipt;
    }

    const success = queue.enqueue(envelope);

    if (!success) {
      // Queue full
      const receipt: DeliveryReceipt = {
        messageId: envelope.id,
        delivered: false,
        agentId: envelope.to,
        error: "Queue full",
      };

      if (this.config.enableDeadLetterQueue) {
        this.deadLetterQueue.push(envelope);
      }

      return receipt;
    }

    const receipt: DeliveryReceipt = {
      messageId: envelope.id,
      delivered: true,
      deliveredAt: new Date().toISOString(),
      agentId: envelope.to,
    };

    if (this.config.enableReceipts) {
      if (!this.deliveryReceipts.has(envelope.from)) {
        this.deliveryReceipts.set(envelope.from, []);
      }
      this.deliveryReceipts.get(envelope.from)!.push(receipt);
    }

    return receipt;
  }

  private cleanup(): void {
    // Remove expired messages from all queues
    for (const queue of this.queues.values()) {
      queue.removeExpired();
    }

    // Trim delivery receipts (keep last 100 per agent)
    for (const [agentId, receipts] of this.deliveryReceipts.entries()) {
      if (receipts.length > 100) {
        this.deliveryReceipts.set(agentId, receipts.slice(-100));
      }
    }

    // Trim dead letter queue
    if (this.deadLetterQueue.length > 1000) {
      this.deadLetterQueue = this.deadLetterQueue.slice(-1000);
    }
  }

  private generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

/**
 * Convenience wrapper for agent-side messaging
 */
export class AgentMessenger {
  private hub: AgentMessagingHub;
  private agentId: string;

  constructor(hub: AgentMessagingHub, agentId: string) {
    this.hub = hub;
    this.agentId = agentId;
    hub.registerAgent(agentId);
  }

  async send(to: string, type: MessageType, payload: unknown): Promise<DeliveryReceipt> {
    return this.hub.send(this.agentId, to, type, payload);
  }

  async request(to: string, payload: unknown, timeoutMs?: number): Promise<AgentEnvelope> {
    return this.hub.request(this.agentId, to, payload, timeoutMs);
  }

  async respond(to: string, correlationId: string, payload: unknown, success?: boolean): Promise<DeliveryReceipt> {
    return this.hub.respond(this.agentId, to, correlationId, payload, success);
  }

  async broadcast(payload: unknown, topic?: string): Promise<DeliveryReceipt[]> {
    return this.hub.broadcast(this.agentId, payload, topic ? { topic } : undefined);
  }

  async publish(topic: string, payload: unknown): Promise<DeliveryReceipt[]> {
    return this.hub.publish(this.agentId, topic, payload);
  }

  subscribe(topic: string, handler?: TopicHandler): () => void {
    return this.hub.subscribeTopic(this.agentId, topic, handler);
  }

  unsubscribe(topic: string): void {
    this.hub.unsubscribeTopic(this.agentId, topic);
  }

  onMessage(handler: MessageHandler): () => void {
    return this.hub.onMessage(this.agentId, handler);
  }

  getPendingMessages(): AgentEnvelope[] {
    return this.hub.getPendingMessages(this.agentId);
  }

  async processNext(): Promise<AgentEnvelope | undefined> {
    return this.hub.processNext(this.agentId);
  }

  disconnect(): void {
    this.hub.unregisterAgent(this.agentId);
  }
}

// Default singleton hub
export const messagingHub = new AgentMessagingHub();

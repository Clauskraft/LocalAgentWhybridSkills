/**
 * WebSocket Transport for Agent-Mesh
 * Real-time bidirectional communication for agents
 */

import type {
  AgentMessage,
  ToolCallRequest,
  ToolCallResponse,
} from "../types/agent.js";

export type WebSocketState = "connecting" | "open" | "closing" | "closed";

export interface WebSocketTransportConfig {
  /** WebSocket server URL */
  url: string;
  /** Reconnection settings */
  reconnect: {
    enabled: boolean;
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
    maxDelayMs: number;
  };
  /** Ping/pong keepalive interval in ms */
  pingIntervalMs: number;
  /** Connection timeout in ms */
  connectionTimeoutMs: number;
  /** Message timeout in ms */
  messageTimeoutMs: number;
  /** Enable message compression */
  compression: boolean;
  /** Authentication token */
  authToken?: string;
  /** Agent ID for identification */
  agentId: string;
}

export interface WebSocketMessage {
  id: string;
  type: "request" | "response" | "broadcast" | "heartbeat" | "auth" | "error";
  payload: unknown;
  timestamp: string;
  correlationId?: string;
}

type MessageHandler = (message: WebSocketMessage) => void | Promise<void>;
type ErrorHandler = (error: Error) => void;
type StateHandler = (state: WebSocketState) => void;

const DEFAULT_CONFIG: WebSocketTransportConfig = {
  url: "ws://localhost:8080",
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    delayMs: 1000,
    backoffMultiplier: 1.5,
    maxDelayMs: 30000,
  },
  pingIntervalMs: 30000,
  connectionTimeoutMs: 10000,
  messageTimeoutMs: 30000,
  compression: false,
  agentId: "unknown",
};

/**
 * WebSocket Transport Client
 * Handles WebSocket connections with automatic reconnection and message queueing
 */
export class WebSocketTransport {
  private config: WebSocketTransportConfig;
  private ws: WebSocket | null = null;
  private state: WebSocketState = "closed";
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private pendingRequests: Map<string, {
    resolve: (response: WebSocketMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private stateHandlers: Set<StateHandler> = new Set();
  private isManualClose = false;

  constructor(config: Partial<WebSocketTransportConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.state === "open" || this.state === "connecting") {
      return;
    }

    this.isManualClose = false;
    this.updateState("connecting");

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
        this.ws?.close();
      }, this.config.connectionTimeoutMs);

      try {
        // Note: In Node.js, you'd use the 'ws' package
        // This implementation assumes a WebSocket API compatible interface
        const wsUrl = new URL(this.config.url);
        if (this.config.authToken) {
          wsUrl.searchParams.set("token", this.config.authToken);
        }
        wsUrl.searchParams.set("agentId", this.config.agentId);

        this.ws = new WebSocket(wsUrl.toString());

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.updateState("open");
          this.reconnectAttempts = 0;
          this.startPing();
          this.flushQueue();
          resolve();
        };

        this.ws.onclose = (event) => {
          this.stopPing();
          this.updateState("closed");

          if (!this.isManualClose && this.config.reconnect.enabled) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          const err = new Error(`WebSocket error: ${error}`);
          this.notifyError(err);

          if (this.state === "connecting") {
            clearTimeout(timeout);
            reject(err);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data as string) as WebSocketMessage;
            this.handleMessage(message);
          } catch (e) {
            this.notifyError(new Error(`Failed to parse message: ${e}`));
          }
        };
      } catch (e) {
        clearTimeout(timeout);
        reject(e);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect(): Promise<void> {
    this.isManualClose = true;
    this.cancelReconnect();
    this.stopPing();

    if (this.ws && this.state !== "closed") {
      this.updateState("closing");

      return new Promise((resolve) => {
        const cleanup = () => {
          this.ws = null;
          this.updateState("closed");
          resolve();
        };

        // Give it a moment to close gracefully
        const timeout = setTimeout(cleanup, 1000);

        this.ws!.onclose = () => {
          clearTimeout(timeout);
          cleanup();
        };

        this.ws!.close(1000, "Client disconnecting");
      });
    }
  }

  /**
   * Send a message
   */
  async send(message: Omit<WebSocketMessage, "id" | "timestamp">): Promise<void> {
    const fullMessage: WebSocketMessage = {
      ...message,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    if (this.state !== "open") {
      // Queue message for later delivery
      this.messageQueue.push(fullMessage);
      return;
    }

    this.sendRaw(fullMessage);
  }

  /**
   * Send a request and wait for response
   */
  async request(
    type: WebSocketMessage["type"],
    payload: unknown,
    timeoutMs?: number
  ): Promise<WebSocketMessage> {
    const id = this.generateId();
    const message: WebSocketMessage = {
      id,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${id}`));
      }, timeoutMs ?? this.config.messageTimeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      if (this.state !== "open") {
        this.messageQueue.push(message);
      } else {
        this.sendRaw(message);
      }
    });
  }

  /**
   * Send a tool call request
   */
  async callTool(request: ToolCallRequest): Promise<ToolCallResponse> {
    const response = await this.request("request", request, request.timeout);

    if (response.type === "error") {
      return {
        requestId: request.requestId,
        success: false,
        error: String(response.payload),
        durationMs: 0,
      };
    }

    return response.payload as ToolCallResponse;
  }

  /**
   * Broadcast a message to all connected agents
   */
  async broadcast(payload: unknown): Promise<void> {
    await this.send({ type: "broadcast", payload });
  }

  /**
   * Subscribe to messages
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to errors
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  /**
   * Get current state
   */
  getState(): WebSocketState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === "open";
  }

  private handleMessage(message: WebSocketMessage): void {
    // Check if this is a response to a pending request
    if (message.correlationId && this.pendingRequests.has(message.correlationId)) {
      const pending = this.pendingRequests.get(message.correlationId)!;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.correlationId);
      pending.resolve(message);
      return;
    }

    // Handle heartbeat/pong
    if (message.type === "heartbeat") {
      return;
    }

    // Notify handlers
    for (const handler of this.messageHandlers) {
      try {
        const result = handler(message);
        if (result instanceof Promise) {
          result.catch((e) => this.notifyError(e));
        }
      } catch (e) {
        this.notifyError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  }

  private sendRaw(message: WebSocketMessage): void {
    if (this.ws && this.state === "open") {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (e) {
        this.notifyError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.state === "open") {
      const message = this.messageQueue.shift()!;
      this.sendRaw(message);
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.state === "open") {
        this.send({ type: "heartbeat", payload: { agent: this.config.agentId } });
      }
    }, this.config.pingIntervalMs);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnect.maxAttempts) {
      this.notifyError(new Error(`Max reconnection attempts (${this.config.reconnect.maxAttempts}) exceeded`));
      return;
    }

    const delay = Math.min(
      this.config.reconnect.delayMs * Math.pow(this.config.reconnect.backoffMultiplier, this.reconnectAttempts),
      this.config.reconnect.maxDelayMs
    );

    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.reconnect.maxAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((e) => this.notifyError(e));
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private updateState(newState: WebSocketState): void {
    if (this.state !== newState) {
      this.state = newState;
      for (const handler of this.stateHandlers) {
        try {
          handler(newState);
        } catch (e) {
          console.error("State handler error:", e);
        }
      }
    }
  }

  private notifyError(error: Error): void {
    for (const handler of this.errorHandlers) {
      try {
        handler(error);
      } catch (e) {
        console.error("Error handler error:", e);
      }
    }
  }

  private generateId(): string {
    return `${this.config.agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

/**
 * WebSocket Server for Agent-Mesh Hub
 * Manages connections from multiple agents
 */
export interface WebSocketServerConfig {
  /** Port to listen on */
  port: number;
  /** Host to bind to */
  host: string;
  /** Path for WebSocket endpoint */
  path: string;
  /** Maximum connections */
  maxConnections: number;
  /** Client timeout in ms */
  clientTimeoutMs: number;
  /** Authentication validator */
  authenticator?: (token: string, agentId: string) => Promise<boolean>;
}

export interface ConnectedAgent {
  id: string;
  ws: WebSocket;
  connectedAt: Date;
  lastSeen: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Message router for WebSocket server
 */
export class WebSocketMessageRouter {
  private handlers: Map<WebSocketMessage["type"], Set<(msg: WebSocketMessage, agentId: string) => void | Promise<void>>> = new Map();

  /**
   * Register a handler for a message type
   */
  on(type: WebSocketMessage["type"], handler: (msg: WebSocketMessage, agentId: string) => void | Promise<void>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  /**
   * Route a message to handlers
   */
  async route(message: WebSocketMessage, agentId: string): Promise<void> {
    const handlers = this.handlers.get(message.type);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        await handler(message, agentId);
      } catch (e) {
        console.error(`Handler error for ${message.type}:`, e);
      }
    }
  }
}

/**
 * Create WebSocket transport with Node.js 'ws' package
 * This is a factory function for environments where 'ws' is available
 */
export function createNodeWebSocketTransport(
  config: Partial<WebSocketTransportConfig>,
  WebSocketImpl?: typeof WebSocket
): WebSocketTransport {
  // In Node.js environments, the 'ws' package would be passed here
  // For browser environments, the native WebSocket would be used
  if (WebSocketImpl) {
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocketImpl;
  }
  return new WebSocketTransport(config);
}

// Export types for consumers
export type { MessageHandler, ErrorHandler, StateHandler };

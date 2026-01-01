/**
 * Agent Types for Agent-Mesh
 */

export type AgentTransport = "stdio" | "http" | "websocket";
export type AgentStatus = "offline" | "online" | "busy" | "error";
export type AgentTrustLevel = "untrusted" | "local" | "verified" | "signed";

export interface AgentCapability {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface AgentManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  
  // Transport configuration
  transport: AgentTransport;
  endpoint: string; // stdio command or HTTP URL
  
  // Capabilities
  capabilities: AgentCapability[];
  resources?: string[];
  prompts?: string[];
  
  // Trust and security
  trustLevel: AgentTrustLevel;
  signature?: string;
  publicKey?: string;
  
  // Metadata
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentState {
  id: string;
  status: AgentStatus;
  lastSeen: string;
  currentTask?: string;
  errorMessage?: string;
  metrics: {
    callsTotal: number;
    callsSuccess: number;
    callsFailed: number;
    avgResponseMs: number;
  };
}

export interface AgentRegistryEntry {
  manifest: AgentManifest;
  state: AgentState;
}

export interface ToolCallRequest {
  requestId: string;
  sourceAgentId: string;
  targetAgentId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  timeout?: number;
  priority?: "low" | "normal" | "high";
}

export interface ToolCallResponse {
  requestId: string;
  success: boolean;
  content?: unknown;
  error?: string;
  durationMs: number;
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: "request" | "response" | "broadcast" | "heartbeat";
  payload: unknown;
  timestamp: string;
}

export interface OrchestratorConfig {
  maxConcurrentCalls: number;
  defaultTimeout: number;
  retryAttempts: number;
  retryDelayMs: number;
  heartbeatIntervalMs: number;
}


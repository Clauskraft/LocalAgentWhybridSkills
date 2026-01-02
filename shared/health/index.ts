/**
 * Shared health check response types and utilities
 * Standardizes health endpoint responses across all Local Agent services
 */

export type HealthStatus = "ok" | "degraded" | "unhealthy";

export interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  service: string;
  version?: string;
  uptime?: number;
  checks?: Record<string, { status: HealthStatus; message?: string }>;
}

export interface ReadyResponse {
  status: "ready" | "degraded";
  timestamp: string;
  service: string;
  checks?: Record<string, { status: HealthStatus; message?: string }>;
}

/**
 * Create a standard health response
 */
export function createHealthResponse(
  service: string,
  options?: {
    version?: string;
    uptime?: number;
    checks?: Record<string, { status: HealthStatus; message?: string }>;
  }
): HealthResponse {
  const status: HealthStatus = options?.checks
    ? Object.values(options.checks).every((c) => c.status === "ok")
      ? "ok"
      : Object.values(options.checks).some((c) => c.status === "unhealthy")
      ? "unhealthy"
      : "degraded"
    : "ok";

  return {
    status,
    timestamp: new Date().toISOString(),
    service,
    ...(options?.version && { version: options.version }),
    ...(options?.uptime !== undefined && { uptime: options.uptime }),
    ...(options?.checks && { checks: options.checks }),
  };
}

/**
 * Create a standard readiness response
 */
export function createReadyResponse(
  service: string,
  checks?: Record<string, { status: HealthStatus; message?: string }>
): ReadyResponse {
  const allReady = checks
    ? Object.values(checks).every((c) => c.status === "ok")
    : true;

  return {
    status: allReady ? "ready" : "degraded",
    timestamp: new Date().toISOString(),
    service,
    ...(checks && { checks }),
  };
}


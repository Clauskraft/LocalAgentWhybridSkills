/**
 * Security Module Exports
 */

export {
  RateLimiter,
  RateLimitPresets,
  createRateLimitMiddleware,
  RateLimitExceededError,
  standardLimiter,
  toolLimiter,
} from "./rateLimiter.js";

export type {
  RateLimitConfig,
  RateLimitContext,
  RateLimitResult,
} from "./rateLimiter.js";

export {
  AuditLogger,
  computeAuditStats,
  auditLogger,
} from "./auditLog.js";

export type {
  AuditEvent,
  AuditEventType,
  AuditSeverity,
  AuditLogConfig,
  AuditStats,
} from "./auditLog.js";

export {
  SignatureVerifier,
  signatureVerifier,
} from "./signatureVerifier.js";

export type {
  KeyPair,
  SignaturePayload,
  SignatureAlgorithm,
  VerificationResult,
  TrustChain,
  SignatureVerifierConfig,
} from "./signatureVerifier.js";

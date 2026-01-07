/**
 * Signature Verification for Agent-Mesh
 * Cryptographic verification of agent identities and messages
 */

import { createHash, createSign, createVerify, generateKeyPairSync, randomBytes } from "node:crypto";
import type { AgentManifest, AgentTrustLevel } from "../types/agent.js";

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface SignaturePayload {
  /** Data that was signed */
  data: string;
  /** Base64-encoded signature */
  signature: string;
  /** Algorithm used */
  algorithm: SignatureAlgorithm;
  /** Timestamp of signing */
  timestamp: string;
  /** Key ID (for key rotation) */
  keyId?: string;
}

export type SignatureAlgorithm = "RSA-SHA256" | "RSA-SHA512" | "ECDSA-SHA256" | "Ed25519";

export interface VerificationResult {
  valid: boolean;
  agentId?: string;
  trustLevel?: AgentTrustLevel;
  error?: string;
  verifiedAt: string;
}

export interface TrustChain {
  agentId: string;
  publicKey: string;
  trustLevel: AgentTrustLevel;
  issuedBy?: string;
  issuedAt: string;
  expiresAt?: string;
  revoked: boolean;
}

export interface SignatureVerifierConfig {
  /** Default algorithm for signing */
  defaultAlgorithm: SignatureAlgorithm;
  /** Enable timestamp validation */
  validateTimestamp: boolean;
  /** Maximum age for signatures in ms */
  maxSignatureAgeMs: number;
  /** Enable trust chain verification */
  enableTrustChain: boolean;
  /** RSA key size for generation */
  rsaKeySize: number;
}

const DEFAULT_CONFIG: SignatureVerifierConfig = {
  defaultAlgorithm: "RSA-SHA256",
  validateTimestamp: true,
  maxSignatureAgeMs: 300000, // 5 minutes
  enableTrustChain: true,
  rsaKeySize: 2048,
};

/**
 * Signature Verifier for agent authentication
 */
export class SignatureVerifier {
  private config: SignatureVerifierConfig;
  private trustStore: Map<string, TrustChain> = new Map();
  private revokedKeys: Set<string> = new Set();

  constructor(config: Partial<SignatureVerifierConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a new key pair
   */
  generateKeyPair(algorithm?: SignatureAlgorithm): KeyPair {
    const algo = algorithm ?? this.config.defaultAlgorithm;

    switch (algo) {
      case "RSA-SHA256":
      case "RSA-SHA512": {
        const { publicKey, privateKey } = generateKeyPairSync("rsa", {
          modulusLength: this.config.rsaKeySize,
          publicKeyEncoding: { type: "spki", format: "pem" },
          privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });
        return { publicKey, privateKey };
      }

      case "ECDSA-SHA256": {
        const { publicKey, privateKey } = generateKeyPairSync("ec", {
          namedCurve: "P-256",
          publicKeyEncoding: { type: "spki", format: "pem" },
          privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });
        return { publicKey, privateKey };
      }

      case "Ed25519": {
        const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
          publicKeyEncoding: { type: "spki", format: "pem" },
          privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });
        return { publicKey, privateKey };
      }

      default:
        throw new Error(`Unsupported algorithm: ${algo}`);
    }
  }

  /**
   * Sign data with a private key
   */
  sign(data: string, privateKey: string, algorithm?: SignatureAlgorithm): SignaturePayload {
    const algo = algorithm ?? this.config.defaultAlgorithm;
    const timestamp = new Date().toISOString();

    const signData = this.config.validateTimestamp
      ? `${data}|${timestamp}`
      : data;

    let signature: string;

    switch (algo) {
      case "RSA-SHA256": {
        const signer = createSign("RSA-SHA256");
        signer.update(signData);
        signature = signer.sign(privateKey, "base64");
        break;
      }

      case "RSA-SHA512": {
        const signer = createSign("RSA-SHA512");
        signer.update(signData);
        signature = signer.sign(privateKey, "base64");
        break;
      }

      case "ECDSA-SHA256": {
        const signer = createSign("SHA256");
        signer.update(signData);
        signature = signer.sign(privateKey, "base64");
        break;
      }

      case "Ed25519": {
        const signer = createSign("ed25519");
        signer.update(signData);
        signature = signer.sign(privateKey, "base64");
        break;
      }

      default:
        throw new Error(`Unsupported algorithm: ${algo}`);
    }

    return {
      data,
      signature,
      algorithm: algo,
      timestamp,
    };
  }

  /**
   * Verify a signature
   */
  verify(payload: SignaturePayload, publicKey: string): VerificationResult {
    const now = new Date();

    // Check timestamp if enabled
    if (this.config.validateTimestamp) {
      const signedAt = new Date(payload.timestamp);
      const age = now.getTime() - signedAt.getTime();

      if (age > this.config.maxSignatureAgeMs) {
        return {
          valid: false,
          error: `Signature expired (age: ${age}ms, max: ${this.config.maxSignatureAgeMs}ms)`,
          verifiedAt: now.toISOString(),
        };
      }

      if (age < -60000) {
        // Allow 1 minute clock skew into the future
        return {
          valid: false,
          error: "Signature timestamp is in the future",
          verifiedAt: now.toISOString(),
        };
      }
    }

    const verifyData = this.config.validateTimestamp
      ? `${payload.data}|${payload.timestamp}`
      : payload.data;

    try {
      let valid: boolean;

      switch (payload.algorithm) {
        case "RSA-SHA256": {
          const verifier = createVerify("RSA-SHA256");
          verifier.update(verifyData);
          valid = verifier.verify(publicKey, payload.signature, "base64");
          break;
        }

        case "RSA-SHA512": {
          const verifier = createVerify("RSA-SHA512");
          verifier.update(verifyData);
          valid = verifier.verify(publicKey, payload.signature, "base64");
          break;
        }

        case "ECDSA-SHA256": {
          const verifier = createVerify("SHA256");
          verifier.update(verifyData);
          valid = verifier.verify(publicKey, payload.signature, "base64");
          break;
        }

        case "Ed25519": {
          const verifier = createVerify("ed25519");
          verifier.update(verifyData);
          valid = verifier.verify(publicKey, payload.signature, "base64");
          break;
        }

        default:
          return {
            valid: false,
            error: `Unsupported algorithm: ${payload.algorithm}`,
            verifiedAt: now.toISOString(),
          };
      }

      return {
        valid,
        verifiedAt: now.toISOString(),
        ...(valid ? {} : { error: "Signature verification failed" }),
      };
    } catch (e) {
      return {
        valid: false,
        error: `Verification error: ${e instanceof Error ? e.message : String(e)}`,
        verifiedAt: now.toISOString(),
      };
    }
  }

  /**
   * Verify an agent manifest signature
   */
  verifyManifest(manifest: AgentManifest): VerificationResult {
    if (!manifest.signature || !manifest.publicKey) {
      return {
        valid: false,
        error: "Manifest is not signed",
        verifiedAt: new Date().toISOString(),
      };
    }

    // Check if key is revoked
    if (this.revokedKeys.has(manifest.publicKey)) {
      return {
        valid: false,
        error: "Agent's public key has been revoked",
        verifiedAt: new Date().toISOString(),
      };
    }

    // Create canonical data to verify
    const manifestData = this.canonicalizeManifest(manifest);

    // Parse signature payload
    let payload: SignaturePayload;
    try {
      payload = JSON.parse(manifest.signature) as SignaturePayload;
    } catch {
      // Legacy format: signature is just the base64 string
      payload = {
        data: manifestData,
        signature: manifest.signature,
        algorithm: this.config.defaultAlgorithm,
        timestamp: manifest.updatedAt,
      };
    }

    const result = this.verify(payload, manifest.publicKey);

    if (result.valid) {
      result.agentId = manifest.id;
      result.trustLevel = manifest.trustLevel;
    }

    return result;
  }

  /**
   * Sign an agent manifest
   */
  signManifest(manifest: AgentManifest, privateKey: string): string {
    const manifestData = this.canonicalizeManifest(manifest);
    const payload = this.sign(manifestData, privateKey);
    return JSON.stringify(payload);
  }

  /**
   * Add an agent to the trust store
   */
  trustAgent(
    agentId: string,
    publicKey: string,
    trustLevel: AgentTrustLevel,
    issuedBy?: string,
    expiresAt?: Date
  ): void {
    const chain: TrustChain = {
      agentId,
      publicKey,
      trustLevel,
      ...(issuedBy ? { issuedBy } : {}),
      issuedAt: new Date().toISOString(),
      ...(expiresAt ? { expiresAt: expiresAt.toISOString() } : {}),
      revoked: false,
    };

    this.trustStore.set(agentId, chain);
  }

  /**
   * Revoke trust for an agent
   */
  revokeAgent(agentId: string): void {
    const chain = this.trustStore.get(agentId);
    if (chain) {
      chain.revoked = true;
      this.revokedKeys.add(chain.publicKey);
    }
  }

  /**
   * Revoke a specific public key
   */
  revokeKey(publicKey: string): void {
    this.revokedKeys.add(publicKey);

    // Mark any agents using this key as revoked
    for (const chain of this.trustStore.values()) {
      if (chain.publicKey === publicKey) {
        chain.revoked = true;
      }
    }
  }

  /**
   * Get trust chain for an agent
   */
  getTrustChain(agentId: string): TrustChain | undefined {
    return this.trustStore.get(agentId);
  }

  /**
   * Verify agent is trusted
   */
  isTrusted(agentId: string, minTrustLevel?: AgentTrustLevel): boolean {
    const chain = this.trustStore.get(agentId);
    if (!chain || chain.revoked) return false;

    // Check expiry
    if (chain.expiresAt) {
      const expiresAt = new Date(chain.expiresAt);
      if (new Date() > expiresAt) return false;
    }

    // Check minimum trust level
    if (minTrustLevel) {
      const trustOrder: AgentTrustLevel[] = ["untrusted", "local", "verified", "signed"];
      const chainLevel = trustOrder.indexOf(chain.trustLevel);
      const requiredLevel = trustOrder.indexOf(minTrustLevel);
      if (chainLevel < requiredLevel) return false;
    }

    return true;
  }

  /**
   * Hash data for integrity checking
   */
  hash(data: string, algorithm: "SHA-256" | "SHA-512" = "SHA-256"): string {
    return createHash(algorithm.replace("-", "").toLowerCase())
      .update(data)
      .digest("hex");
  }

  /**
   * Generate a random nonce
   */
  generateNonce(length: number = 32): string {
    return randomBytes(length).toString("hex");
  }

  /**
   * Create a challenge for authentication
   */
  createChallenge(agentId: string): { challenge: string; expiresAt: string } {
    const nonce = this.generateNonce();
    const timestamp = new Date().toISOString();
    const challenge = this.hash(`${agentId}:${nonce}:${timestamp}`);

    return {
      challenge,
      expiresAt: new Date(Date.now() + 60000).toISOString(), // 1 minute
    };
  }

  /**
   * Verify a challenge response
   */
  verifyChallengeResponse(
    agentId: string,
    challenge: string,
    response: SignaturePayload,
    publicKey: string
  ): VerificationResult {
    // Verify the response is a signature of the challenge
    if (response.data !== challenge) {
      return {
        valid: false,
        error: "Challenge mismatch",
        verifiedAt: new Date().toISOString(),
      };
    }

    const result = this.verify(response, publicKey);
    if (result.valid) {
      result.agentId = agentId;
    }

    return result;
  }

  /**
   * Export trust store for backup
   */
  exportTrustStore(): TrustChain[] {
    return Array.from(this.trustStore.values());
  }

  /**
   * Import trust store from backup
   */
  importTrustStore(chains: TrustChain[]): void {
    for (const chain of chains) {
      this.trustStore.set(chain.agentId, chain);
      if (chain.revoked) {
        this.revokedKeys.add(chain.publicKey);
      }
    }
  }

  /**
   * Clear trust store
   */
  clearTrustStore(): void {
    this.trustStore.clear();
    this.revokedKeys.clear();
  }

  private canonicalizeManifest(manifest: AgentManifest): string {
    // Create a canonical representation for signing
    // Exclude signature field and sort keys
    const { signature: _, ...rest } = manifest;

    const sortedKeys = Object.keys(rest).sort();
    const canonical: Record<string, unknown> = {};

    for (const key of sortedKeys) {
      canonical[key] = rest[key as keyof typeof rest];
    }

    return JSON.stringify(canonical);
  }
}

// Default singleton
export const signatureVerifier = new SignatureVerifier();

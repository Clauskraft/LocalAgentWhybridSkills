import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  importJWK,
  jwtVerify,
  type JWTPayload,
  type KeyLike,
} from "jose";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// ============================================================================
// JWT AUTHENTICATION MODULE
// Zero Trust: Short-lived tokens, key rotation, audience validation
// ============================================================================

export interface JwtConfig {
  issuer: string;
  audience: string;
  accessTokenTTL: number;  // seconds
  refreshTokenTTL: number; // seconds
  keyRotationInterval: number; // seconds
}

export interface TokenPayload {
  sub: string;           // Subject (user/agent ID)
  aud: string;           // Audience
  iss: string;           // Issuer
  iat: number;           // Issued at
  exp: number;           // Expiration
  jti: string;           // Token ID (for revocation)
  scopes: string[];      // Permissions
  agentId?: string;      // Agent identifier
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

const DEFAULT_CONFIG: JwtConfig = {
  issuer: "sca-01-cloud",
  audience: "sca-01-api",
  accessTokenTTL: 900,       // 15 minutes
  refreshTokenTTL: 86400,    // 24 hours
  keyRotationInterval: 3600  // 1 hour
};

export class JwtAuthService {
  private config: JwtConfig;
  private currentKey: KeyLike | null = null;
  private previousKey: KeyLike | null = null;
  private keyId: string = "";
  private keyPath: string;
  private revokedTokens: Set<string> = new Set();

  constructor(keyPath = "./config/keys", config: Partial<JwtConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.keyPath = path.resolve(keyPath);
    
    if (!fs.existsSync(this.keyPath)) {
      fs.mkdirSync(this.keyPath, { recursive: true, mode: 0o700 });
    }
  }

  private async loadOrGenerateKey(): Promise<void> {
    const keyFile = path.join(this.keyPath, "jwt-key.json");
    
    try {
      if (fs.existsSync(keyFile)) {
        const stored = JSON.parse(fs.readFileSync(keyFile, "utf8"));
        const age = Date.now() - stored.createdAt;
        
        if (age < this.config.keyRotationInterval * 1000) {
          const imported = await importJWK(stored.key, "ES256");
          this.currentKey = imported as KeyLike;
          this.keyId = stored.keyId;
          return;
        }
        
        // Key rotation: keep old key for verification
        const prevImported = await importJWK(stored.key, "ES256");
        this.previousKey = prevImported as KeyLike;
      }
    } catch {
      // Generate new key on any error
    }

    // Generate new ECDSA key pair
    const { privateKey } = await generateKeyPair("ES256");
    this.currentKey = privateKey;
    this.keyId = crypto.randomUUID();

    const jwk = await exportJWK(privateKey);
    const keyData = {
      key: jwk,
      keyId: this.keyId,
      createdAt: Date.now()
    };

    fs.writeFileSync(keyFile, JSON.stringify(keyData), { mode: 0o600 });
  }

  async initialize(): Promise<void> {
    await this.loadOrGenerateKey();
  }

  async generateTokenPair(
    subject: string,
    scopes: string[],
    agentId?: string
  ): Promise<TokenPair> {
    if (!this.currentKey) {
      await this.initialize();
    }
    const signingKey = this.currentKey;
    if (!signingKey) {
      throw new Error("JWT signing key not available");
    }

    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    const accessPayload: TokenPayload = {
      sub: subject,
      aud: this.config.audience,
      iss: this.config.issuer,
      iat: now,
      exp: now + this.config.accessTokenTTL,
      jti,
      scopes,
      agentId
    };

    const accessToken = await new SignJWT(accessPayload as unknown as JWTPayload)
      .setProtectedHeader({ alg: "ES256", kid: this.keyId })
      .sign(signingKey);

    const refreshPayload = {
      sub: subject,
      aud: this.config.audience,
      iss: this.config.issuer,
      iat: now,
      exp: now + this.config.refreshTokenTTL,
      jti: crypto.randomUUID(),
      type: "refresh",
      accessJti: jti
    };

    const refreshToken = await new SignJWT(refreshPayload)
      .setProtectedHeader({ alg: "ES256", kid: this.keyId })
      .sign(signingKey);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.accessTokenTTL,
      tokenType: "Bearer"
    };
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    if (!this.currentKey) {
      await this.initialize();
    }

    const current = this.currentKey;
    if (!current) {
      return null;
    }
    const keys = [current, ...(this.previousKey ? [this.previousKey] : [])];

    for (const key of keys) {
      try {
        const { payload } = await jwtVerify(token, key, {
          issuer: this.config.issuer,
          audience: this.config.audience
        });

        const jti = payload.jti as string | undefined;
        if (jti && this.revokedTokens.has(jti)) {
          return null;
        }

        return payload as unknown as TokenPayload;
      } catch {
        continue;
      }
    }

    return null;
  }

  async refreshTokenPair(refreshToken: string): Promise<TokenPair | null> {
    const payload = await this.verifyToken(refreshToken);
    
    if (!payload || (payload as unknown as { type?: string }).type !== "refresh") {
      return null;
    }

    // Revoke old access token
    const accessJti = (payload as unknown as { accessJti?: string }).accessJti;
    if (accessJti) {
      this.revokedTokens.add(accessJti);
    }

    return this.generateTokenPair(payload.sub, payload.scopes, payload.agentId);
  }

  revokeToken(jti: string): void {
    this.revokedTokens.add(jti);
  }

  // Cleanup expired revoked tokens periodically
  cleanupRevokedTokens(): void {
    // In production, store revoked tokens with expiry in Redis/DB
    if (this.revokedTokens.size > 10000) {
      this.revokedTokens.clear();
    }
  }
}

// Singleton
let authService: JwtAuthService | null = null;

export function getAuthService(keyPath?: string): JwtAuthService {
  if (!authService) {
    authService = new JwtAuthService(keyPath);
  }
  return authService;
}


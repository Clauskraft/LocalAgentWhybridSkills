const KEY = "sca01.tokens.v1";

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
};

export function loadTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTokens;
    if (!parsed?.accessToken || !parsed?.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: StoredTokens): void {
  localStorage.setItem(KEY, JSON.stringify(tokens));
}

export function clearTokens(): void {
  localStorage.removeItem(KEY);
}



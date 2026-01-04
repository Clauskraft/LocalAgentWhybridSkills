const KEY = "sca01.tokens.v1";
const REMEMBER_KEY = "sca01.remember.v1";

function hasLocalTokens(): boolean {
  return !!localStorage.getItem(KEY);
}

export function getRememberMe(): boolean {
  const v = localStorage.getItem(REMEMBER_KEY);
  if (v === "1") return true;
  if (v === "0") return false;
  // Back-compat: historically tokens were stored in localStorage only.
  if (hasLocalTokens()) {
    localStorage.setItem(REMEMBER_KEY, "1");
    return true;
  }
  // Default: do not persist across browser restarts unless user opts in.
  return false;
}

export function setRememberMe(remember: boolean): void {
  localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");

  // Migrate tokens between storages so the choice takes effect immediately.
  try {
    const localRaw = localStorage.getItem(KEY);
    const sessionRaw = sessionStorage.getItem(KEY);

    if (remember) {
      if (!localRaw && sessionRaw) localStorage.setItem(KEY, sessionRaw);
      sessionStorage.removeItem(KEY);
    } else {
      if (!sessionRaw && localRaw) sessionStorage.setItem(KEY, localRaw);
      localStorage.removeItem(KEY);
    }
  } catch {
    // ignore
  }
}

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
};

export function loadTokens(): StoredTokens | null {
  try {
    const remember = getRememberMe();
    const raw = (remember ? localStorage : sessionStorage).getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTokens;
    if (!parsed?.accessToken || !parsed?.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: StoredTokens): void {
  const remember = getRememberMe();
  const payload = JSON.stringify(tokens);
  if (remember) {
    localStorage.setItem(KEY, payload);
    sessionStorage.removeItem(KEY);
  } else {
    sessionStorage.setItem(KEY, payload);
    localStorage.removeItem(KEY);
  }
}

export function clearTokens(): void {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}



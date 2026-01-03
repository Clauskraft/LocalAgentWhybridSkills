function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Resolve the backend base URL for browser/dev mode (no Electron IPC).
 *
 * Precedence:
 * - Explicit settings value
 * - Vite env: VITE_BACKEND_URL (or VITE_SCA_BACKEND_URL fallback)
 *
 * Returns undefined if none is configured.
 */
export function resolveBackendUrl(
  settingsBackendUrl: string | undefined,
  env: Record<string, string | undefined> = ((import.meta as any)?.env ?? {}) as Record<string, string | undefined>
): string | undefined {
  const fromSettings = (settingsBackendUrl ?? "").trim();
  if (fromSettings) return normalizeBaseUrl(fromSettings);

  const fromEnv = (env.VITE_BACKEND_URL ?? env.VITE_SCA_BACKEND_URL ?? "").trim();
  if (fromEnv) return normalizeBaseUrl(fromEnv);

  return undefined;
}



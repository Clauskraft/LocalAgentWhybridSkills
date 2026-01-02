import path from "node:path";

export interface PathPolicy {
  repoRootAbs: string;
}

export interface ResolvedPath {
  absPath: string;
  relPath: string;
}

// Deny-by-default for sensitive / irrelevant paths (even within repoRoot).
// NOTE: This is intentionally conservative.
const BLOCKED_PATTERNS = [
  ".git",
  "node_modules",
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "__pycache__",
  ".pyc",
  "venv",
  ".venv",
  ".ssh",
  ".aws",
  ".azure",
  "secrets",
  "credentials",
  ".npmrc",
  ".yarnrc",
];

/**
 * Resolves a requested path relative to repo root with security checks.
 * Blocks path traversal, .git, node_modules, and .env* files.
 */
export function resolveWithinRepo(policy: PathPolicy, requestedPath: string): ResolvedPath {
  const absPath = path.resolve(policy.repoRootAbs, requestedPath);
  const relPath = path.relative(policy.repoRootAbs, absPath);

  // Check if path is within repo root
  const inside =
    relPath === "" || (!relPath.startsWith("..") && !path.isAbsolute(relPath));

  if (!inside) {
    throw new Error(`Path traversal blocked: ${requestedPath}`);
  }

  // Block sensitive / irrelevant dirs
  const parts = relPath.split(path.sep).filter(Boolean);
  const base = parts[parts.length - 1] ?? "";

  for (const pattern of BLOCKED_PATTERNS) {
    if (parts.includes(pattern) || base.startsWith(pattern)) {
      throw new Error(`Access blocked: ${pattern}`);
    }
  }

  return { absPath, relPath };
}


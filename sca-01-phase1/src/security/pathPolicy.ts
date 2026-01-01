import path from "node:path";

export interface PathPolicy {
  repoRootAbs: string;
}

export interface ResolvedPath {
  absPath: string;
  relPath: string;
}

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

  if (parts.includes(".git")) {
    throw new Error("Access blocked: .git");
  }
  if (parts.includes("node_modules")) {
    throw new Error("Access blocked: node_modules");
  }
  if (base.startsWith(".env")) {
    throw new Error("Access blocked: .env*");
  }

  return { absPath, relPath };
}


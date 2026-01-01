import { describe, it, expect } from "vitest";
import { resolveWithinRepo } from "./pathPolicy.js";
import path from "node:path";

describe("resolveWithinRepo", () => {
  const policy = { repoRootAbs: "/repo" };

  it("allows valid relative paths", () => {
    const result = resolveWithinRepo(policy, "docs/README.md");
    expect(result.relPath).toBe(path.join("docs", "README.md"));
    expect(result.absPath).toBe(path.resolve("/repo", "docs", "README.md"));
  });

  it("allows root path", () => {
    const result = resolveWithinRepo(policy, ".");
    expect(result.relPath).toBe("");
  });

  it("blocks path traversal with ..", () => {
    expect(() => resolveWithinRepo(policy, "../etc/passwd")).toThrow("Path traversal blocked");
  });

  it("blocks .git directory", () => {
    expect(() => resolveWithinRepo(policy, ".git/config")).toThrow("Access blocked: .git");
  });

  it("blocks nested .git", () => {
    expect(() => resolveWithinRepo(policy, "submodule/.git/objects")).toThrow("Access blocked: .git");
  });

  it("blocks node_modules", () => {
    expect(() => resolveWithinRepo(policy, "node_modules/zod/index.js")).toThrow("Access blocked: node_modules");
  });

  it("blocks .env files", () => {
    expect(() => resolveWithinRepo(policy, ".env")).toThrow("Access blocked: .env*");
    expect(() => resolveWithinRepo(policy, ".env.local")).toThrow("Access blocked: .env*");
    expect(() => resolveWithinRepo(policy, ".env.production")).toThrow("Access blocked: .env*");
  });

  it("allows similarly named but valid files", () => {
    const result = resolveWithinRepo(policy, "docs/environment.md");
    expect(result.relPath).toBe(path.join("docs", "environment.md"));
  });
});


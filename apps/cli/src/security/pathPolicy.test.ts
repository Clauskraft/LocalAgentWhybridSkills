import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveWithinRepo } from "./pathPolicy.js";
import path from "node:path";

void describe("resolveWithinRepo", () => {
  const policy = { repoRootAbs: "/repo" };

  void it("allows valid relative paths", () => {
    const result = resolveWithinRepo(policy, "docs/README.md");
    assert.equal(result.relPath, path.join("docs", "README.md"));
    assert.equal(result.absPath, path.resolve("/repo", "docs", "README.md"));
  });

  void it("allows root path", () => {
    const result = resolveWithinRepo(policy, ".");
    assert.equal(result.relPath, "");
  });

  void it("blocks path traversal with ..", () => {
    assert.throws(() => resolveWithinRepo(policy, "../etc/passwd"), /Path traversal blocked/);
  });

  void it("blocks .git directory", () => {
    assert.throws(() => resolveWithinRepo(policy, ".git/config"), /Access blocked: \.git/);
  });

  void it("blocks nested .git", () => {
    assert.throws(() => resolveWithinRepo(policy, "submodule/.git/objects"), /Access blocked: \.git/);
  });

  void it("blocks node_modules", () => {
    assert.throws(() => resolveWithinRepo(policy, "node_modules/zod/index.js"), /Access blocked: node_modules/);
  });

  void it("blocks .env files", () => {
    assert.throws(() => resolveWithinRepo(policy, ".env"), /Access blocked: \.env/);
    assert.throws(() => resolveWithinRepo(policy, ".env.local"), /Access blocked: \.env/);
    assert.throws(() => resolveWithinRepo(policy, ".env.production"), /Access blocked: \.env/);
  });

  void it("allows similarly named but valid files", () => {
    const result = resolveWithinRepo(policy, "docs/environment.md");
    assert.equal(result.relPath, path.join("docs", "environment.md"));
  });
});

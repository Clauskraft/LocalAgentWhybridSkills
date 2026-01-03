import { describe, expect, test, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { HyperLog } from "../logging/hyperlog.js";
import { EnforcedExecutor } from "../security/enforcedExecutor.js";
import { globalApprovalQueue } from "../approval/approvalQueue.js";

function tmpDir(): string {
  return path.join(os.tmpdir(), `sca01-test-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

describe("EnforcedExecutor (integration)", () => {
  beforeEach(() => {
    // Ensure no approvals are stuck from prior tests.
    globalApprovalQueue.rejectAll("test");
  });

  afterEach(() => {
    globalApprovalQueue.rejectAll("test");
  });

  test("denies blocked file writes immediately (no approval wait)", async () => {
    const log = new HyperLog("./logs", "vitest-enforced-executor.hyperlog.jsonl");
    const ex = new EnforcedExecutor({ fullAccess: false, autoApprove: false, safeDirs: [] }, log);

    const res = await ex.writeFile("C:\\Windows\\System32\\config\\SAM", "nope");
    expect(res.ok).toBe(false);
  });

  test("allows writes inside safeDirs and can read back", async () => {
    const dir = tmpDir();
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, "hello.txt");

    const log = new HyperLog("./logs", "vitest-enforced-executor.hyperlog.jsonl");
    const ex = new EnforcedExecutor({ fullAccess: false, autoApprove: false, safeDirs: [dir] }, log);

    const w = await ex.writeFile(file, "hello");
    expect(w.ok).toBe(true);

    const r = await ex.readFile(file);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("hello");
  });

  test("shell read-only command executes without approval", async () => {
    const log = new HyperLog("./logs", "vitest-enforced-executor.hyperlog.jsonl");
    const ex = new EnforcedExecutor({ fullAccess: false, autoApprove: false, safeDirs: [] }, log);

    const res = await ex.runShell("echo hello", { shell: "powershell", timeout: 10_000 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.exitCode).toBe(0);
      expect(res.value.stdout.toLowerCase()).toContain("hello");
    }
  });

  test("approval flow unblocks high-risk write when approved", async () => {
    const dir = tmpDir();
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, "approved.txt");

    const log = new HyperLog("./logs", "vitest-enforced-executor.hyperlog.jsonl");
    // fullAccess=true but autoApprove=false => write outside safeDirs requires approval
    const ex = new EnforcedExecutor({ fullAccess: true, autoApprove: false, safeDirs: [] }, log);

    const p = ex.writeFile(file, "approved");

    // Approve the pending request shortly after it is created.
    for (let i = 0; i < 50; i += 1) {
      const pending = globalApprovalQueue.getPending();
      if (pending.length > 0) {
        globalApprovalQueue.approve(pending[0]!.id, "test");
        break;
      }
      // small delay
      await new Promise((r) => setTimeout(r, 20));
    }

    const res = await p;
    expect(res.ok).toBe(true);
  });
});



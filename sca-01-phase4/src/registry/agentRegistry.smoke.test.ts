import { afterAll, beforeAll, describe, expect, test } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AgentRegistry } from "./agentRegistry.js";

describe("AgentRegistry (smoke)", () => {
  let tmpDir = "";

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sca-01-phase4-"));
  });

  afterAll(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("can register + save and creates docs/AGENTS.md", async () => {
    const reg = new AgentRegistry(tmpDir);
    await reg.load();

    reg.register({
      id: "test-agent",
      name: "Test Agent",
      version: "0.0.1",
      description: "Smoke test agent",
      transport: "stdio",
      endpoint: "node -v",
      capabilities: [{ name: "ping", description: "ping" }],
      trustLevel: "local",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await reg.save();

    const md = await fs.readFile(path.join(tmpDir, "docs", "AGENTS.md"), "utf8");
    expect(md).toContain("test-agent");
    expect(md).toContain("```json");
  });
});



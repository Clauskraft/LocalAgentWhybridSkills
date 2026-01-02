import { afterAll, beforeAll, describe, expect, test } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AgentRegistry } from "./agentRegistry.js";

describe("AgentRegistry (integration)", () => {
  let tmpDir = "";

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sca-01-phase4-"));
  });

  afterAll(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("roundtrips manifest between JSON store and docs/AGENTS.md", async () => {
    const manifest = {
      id: "roundtrip-agent",
      name: "Roundtrip Agent",
      version: "1.2.3",
      description: "Ensures markdown roundtrip keeps full manifest",
      transport: "http" as const,
      endpoint: "https://example.com/mcp",
      capabilities: [
        { name: "read_file", description: "Read file", inputSchema: { type: "object" } },
      ],
      trustLevel: "verified" as const,
      tags: ["mesh", "docs"],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    };

    const reg1 = new AgentRegistry(tmpDir);
    await reg1.load();
    reg1.register(manifest);
    await reg1.save();

    // Now import purely from markdown into a fresh registry instance
    const reg2 = new AgentRegistry(tmpDir);
    await reg2.load();
    await reg2.syncFromMarkdown();
    await reg2.save();

    const stored = JSON.parse(await fs.readFile(path.join(tmpDir, ".agent-registry.json"), "utf8")) as {
      agents: Array<{ manifest: { id: string } }>;
    };
    expect(stored.agents.some((a) => a.manifest.id === "roundtrip-agent")).toBe(true);

    const md = await fs.readFile(path.join(tmpDir, "docs", "AGENTS.md"), "utf8");
    expect(md).toContain('"id": "roundtrip-agent"');
    expect(md).toContain('"endpoint": "https://example.com/mcp"');
    expect(md).toContain('"trustLevel": "verified"');
  });
});



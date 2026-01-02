import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AgentRegistry } from "./agentRegistry.js";

test("AgentRegistry (node smoke): register + save creates docs/AGENTS.md", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sca-01-phase4-"));
  try {
    const reg = new AgentRegistry(tmpDir);
    await reg.load();

    reg.register({
      id: "test-agent",
      name: "Test Agent",
      version: "0.0.1",
      description: "Node smoke test agent",
      transport: "stdio",
      endpoint: "node -v",
      capabilities: [{ name: "ping", description: "ping" }],
      trustLevel: "local",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await reg.save();
    const md = await fs.readFile(path.join(tmpDir, "docs", "AGENTS.md"), "utf8");
    assert.ok(md.includes("test-agent"));
    assert.ok(md.includes("```json"));
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("AgentRegistry (node integration): markdown roundtrip keeps manifest fidelity", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sca-01-phase4-"));
  try {
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

    const reg2 = new AgentRegistry(tmpDir);
    await reg2.load();
    await reg2.syncFromMarkdown();
    await reg2.save();

    const stored = JSON.parse(await fs.readFile(path.join(tmpDir, ".agent-registry.json"), "utf8")) as {
      agents: Array<{ manifest: { id: string; endpoint: string; trustLevel: string } }>;
    };
    const found = stored.agents.find((a) => a.manifest.id === "roundtrip-agent");
    assert.ok(found);
    assert.equal(found.manifest.endpoint, "https://example.com/mcp");
    assert.equal(found.manifest.trustLevel, "verified");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});



import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "./config.js";

void describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  void it("uses defaults when no env vars are set", () => {
    delete process.env["OLLAMA_HOST"];
    delete process.env["OLLAMA_MODEL"];
    delete process.env["SCA_ALLOW_WRITE"];
    delete process.env["SCA_ALLOW_EXEC"];

    const cfg = loadConfig();

    assert.equal(cfg.ollamaHost, "http://localhost:11434");
    assert.equal(cfg.ollamaModel, "qwen3");
    assert.equal(cfg.allowWrite, false);
    assert.equal(cfg.allowExec, false);
    assert.equal(cfg.maxTurns, 8);
  });

  void it("respects OLLAMA_HOST env var", () => {
    process.env["OLLAMA_HOST"] = "http://custom:1234";
    const cfg = loadConfig();
    assert.equal(cfg.ollamaHost, "http://custom:1234");
  });

  void it("parses SCA_ALLOW_WRITE=true", () => {
    process.env["SCA_ALLOW_WRITE"] = "true";
    const cfg = loadConfig();
    assert.equal(cfg.allowWrite, true);
  });

  void it("parses SCA_ALLOW_EXEC=1", () => {
    process.env["SCA_ALLOW_EXEC"] = "1";
    const cfg = loadConfig();
    assert.equal(cfg.allowExec, true);
  });

  void it("parses SCA_MAX_TURNS", () => {
    process.env["SCA_MAX_TURNS"] = "15";
    const cfg = loadConfig();
    assert.equal(cfg.maxTurns, 15);
  });

  void it("falls back to default on invalid SCA_MAX_TURNS", () => {
    process.env["SCA_MAX_TURNS"] = "not-a-number";
    const cfg = loadConfig();
    assert.equal(cfg.maxTurns, 8);
  });
});

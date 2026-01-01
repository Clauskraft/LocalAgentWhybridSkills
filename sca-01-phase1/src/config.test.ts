import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses defaults when no env vars are set", () => {
    delete process.env["OLLAMA_HOST"];
    delete process.env["OLLAMA_MODEL"];
    delete process.env["SCA_ALLOW_WRITE"];
    delete process.env["SCA_ALLOW_EXEC"];

    const cfg = loadConfig();

    expect(cfg.ollamaHost).toBe("http://localhost:11434");
    expect(cfg.ollamaModel).toBe("qwen3");
    expect(cfg.allowWrite).toBe(false);
    expect(cfg.allowExec).toBe(false);
    expect(cfg.maxTurns).toBe(8);
  });

  it("respects OLLAMA_HOST env var", () => {
    process.env["OLLAMA_HOST"] = "http://custom:1234";
    const cfg = loadConfig();
    expect(cfg.ollamaHost).toBe("http://custom:1234");
  });

  it("parses SCA_ALLOW_WRITE=true", () => {
    process.env["SCA_ALLOW_WRITE"] = "true";
    const cfg = loadConfig();
    expect(cfg.allowWrite).toBe(true);
  });

  it("parses SCA_ALLOW_EXEC=1", () => {
    process.env["SCA_ALLOW_EXEC"] = "1";
    const cfg = loadConfig();
    expect(cfg.allowExec).toBe(true);
  });

  it("parses SCA_MAX_TURNS", () => {
    process.env["SCA_MAX_TURNS"] = "15";
    const cfg = loadConfig();
    expect(cfg.maxTurns).toBe(15);
  });

  it("falls back to default on invalid SCA_MAX_TURNS", () => {
    process.env["SCA_MAX_TURNS"] = "not-a-number";
    const cfg = loadConfig();
    expect(cfg.maxTurns).toBe(8);
  });
});


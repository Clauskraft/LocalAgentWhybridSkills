import { describe, expect, test } from "vitest";
import { resolveBackendUrl } from "./backend";

describe("resolveBackendUrl", () => {
  test("prefers explicit settings URL and strips trailing slashes", () => {
    const url = resolveBackendUrl("https://example.com///", { VITE_BACKEND_URL: "https://env.com" });
    expect(url).toBe("https://example.com");
  });

  test("falls back to VITE_BACKEND_URL and strips trailing slashes", () => {
    const url = resolveBackendUrl("", { VITE_BACKEND_URL: "https://env.com///" });
    expect(url).toBe("https://env.com");
  });

  test("falls back to VITE_SCA_BACKEND_URL if VITE_BACKEND_URL is missing", () => {
    const url = resolveBackendUrl(undefined, { VITE_SCA_BACKEND_URL: "http://localhost:8787/" });
    expect(url).toBe("http://localhost:8787");
  });

  test("returns undefined when nothing is set", () => {
    const url = resolveBackendUrl(undefined, {});
    expect(url).toBeUndefined();
  });
});



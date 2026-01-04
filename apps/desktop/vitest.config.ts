import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts", "tests/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "build", "dist", "dist-electron", "tests/e2e/**"],
    testTimeout: 30_000,
  },
});



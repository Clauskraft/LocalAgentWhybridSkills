import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/*.node.test.ts", "build/**", "node_modules/**"],
  },
});



import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      "@local-agent/hyperlog": path.resolve(__dirname, "../shared/hyperlog/index.ts"),
      "@local-agent/config-utils": path.resolve(__dirname, "../shared/config-utils/index.ts"),
      "@local-agent/health": path.resolve(__dirname, "../shared/health/index.ts"),
      "@local-agent/fastify-middleware": path.resolve(__dirname, "../shared/fastify-middleware/index.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/*.node.test.ts", "build/**", "node_modules/**"],
  },
});



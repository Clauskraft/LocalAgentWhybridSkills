import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.renderer.json"],
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-case-declarations": "off",
      "prefer-spread": "off",
      "no-useless-escape": "off",
      "no-console": "off"
    }
  },
  {
    ignores: [
      "build/**",
      "dist/**",
      "dist-electron/**",
      "node_modules/**",
      "tests/**",
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/*.js",
      "**/*.mjs",
      "**/*.cjs",
      "src/mcp/toolServerFull.ts",
      "playwright.config.ts",
      "vite.config.ts",
      "vitest.config.ts"
    ]
  }
);


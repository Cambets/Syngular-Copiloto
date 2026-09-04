// Fast lint tier. Everything here runs without type information, which is
// what keeps it quick enough for a pre-commit hook. The rules that need the
// type checker live in eslint.typed.config.mjs and run on their own script.
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

import quality from "./eslint-rules/index.cjs";

export default defineConfig([
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
      globals: {
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        FileReader: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLDivElement: "readonly",
        React: "readonly",
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.strict,

  {
    files: ["src/**/*.{js,jsx,ts,tsx,mjs,cjs}", "api/**/*.{js,mjs,cjs}"],
    plugins: { quality },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-var": "error",
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn", // baseline: 28
      "@typescript-eslint/no-non-null-assertion": "warn", // baseline: 5
      // The size and complexity budget is all "warn" on purpose. These
      // numbers are a conversation starter about factoring, not a gate --
      // promote one to "error" once the count for it reaches zero.
      complexity: ["warn", 12], // baseline: 20
      "max-depth": ["warn", 4], // baseline: 8
      "max-statements": ["warn", 20], // baseline: 16
      "max-params": ["warn", 4], // baseline: 1
      "max-lines-per-function": [
        "warn",
        { max: 150, skipBlankLines: true, skipComments: true }, // baseline: 13
      ],
      "max-nested-callbacks": ["warn", 3], // baseline: 0
      "quality/max-lines": [
        "error",
        {
          max: 350,
          ignore: [
            "src/components/chat-box.tsx",
            "src/contexts/AppContext.tsx",
            "src/components/AdminKnowledgeHub.tsx",
            "src/components/login-page.tsx",
            "src/components/admin-panel.tsx",
            "src/App.tsx",
            "src/components/ChatInteractiveSpheres.tsx",
          ],
        },
      ],
      "quality/no-direct-console": [
        "warn", // baseline: 17
        { logger: "logger (src/lib/logger.ts)" },
      ],
    },
  },
  {
    files: ["src/lib/logger.ts"],
    rules: {
      "quality/no-direct-console": "off",
    },
  },
  {
    // The same file budget for test files, at "warn".
    files: [
      "**/*.test.{ts,tsx}",
      "**/{__tests__,__mocks__,fixtures,mocks}/**/*.{ts,tsx}",
    ],
    plugins: { quality },
    rules: {
      "quality/max-lines": ["warn", { max: 350, includeTests: true }],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "max-statements": "off",
      "max-lines-per-function": "off",
      "max-nested-callbacks": "off",
    },
  },
  {
    files: ["eslint-rules/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "readonly", require: "readonly" },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([
    ".claude/**",
    ".github/agents/**",
    ".github/hooks/**",
    ".github/skills/**",
    "node_modules/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "**/*.tsbuildinfo",
    "package-lock.json",
    "src/generated/**",
  ]),
]);

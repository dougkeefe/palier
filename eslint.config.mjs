import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

/**
 * The single ESLint config for the repository (docs/progress.md deviation D5).
 *
 * It replaced a per-app config so that "named exports only" is expressed once,
 * so `eslint-plugin-boundaries` sees one element map covering every workspace,
 * and so the fast lane pays for one ESLint start-up rather than two
 * (implementation-plan.md 6.5 budgets the whole lane at 90 seconds).
 *
 * Deliberately NOT type-aware. Nothing enforced here needs type information,
 * and `recommendedTypeChecked` would build a full TypeScript program on every
 * lint run. Revisit when `@palier/engine` holds algorithms worth applying
 * `no-floating-promises` to.
 */

/**
 * Named exports only (AGENTS.md). Framework file conventions are the one
 * exception: Next.js, Playwright and the config loaders resolve these modules
 * by their default export and offer no named alternative. The list is
 * exhaustive and should only grow when we adopt a new convention that genuinely
 * requires it — "it was easier" is not a reason to add a line here.
 */
const FRAMEWORK_DEFAULT_EXPORT_FILES = [
  "apps/web/src/app/**/{page,layout,route,template,default,loading,error,global-error,not-found,forbidden,unauthorized}.{ts,tsx}",
  "apps/web/src/app/**/{icon,apple-icon,opengraph-image,twitter-image}.{ts,tsx}",
  "apps/web/src/app/**/{sitemap,robots,manifest}.ts",
  "apps/web/src/{instrumentation,instrumentation-client,proxy}.ts",
  // next-intl's plugin imports the default export of the request config; there
  // is no named alternative (deviation D11).
  "apps/web/src/i18n/request.ts",
  "apps/web/next.config.ts",
  "apps/web/playwright.config.ts",
  "eslint.config.mjs",
  "vitest.config.mts",
];

/**
 * The purity rules below govern the shipped package, not its tests. A domain
 * test reads `content/profiles/psc-sle.json` off disk and awaits a snapshot
 * assertion; forbidding that would forbid testing the thing.
 */
const TEST_FILES = [
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.test-d.ts",
  "**/__tests__/**",
];

const NO_DEFAULT_EXPORT = {
  selector: "ExportDefaultDeclaration",
  message:
    "Named exports only. Default exports are allowed solely in Next.js file conventions (AGENTS.md).",
};

/**
 * i18n parity [R8] starts with never hard-coding a user-visible string.
 * Core `no-restricted-syntax` rather than `react/jsx-no-literals`, because the
 * latter also flags `className="..."` and would need a dependency we do not
 * otherwise want.
 */
const NO_JSX_LITERALS = [
  {
    selector: "JSXText[value=/[^\\s]/]",
    message:
      "No user-visible string literals in JSX. Every string goes through next-intl so both locales stay at parity [R8].",
  },
  {
    selector: "JSXExpressionContainer > Literal[value=/[^\\s]/]",
    message:
      "No user-visible string literals in JSX. Every string goes through next-intl so both locales stay at parity [R8].",
  },
];

export default defineConfig([
  globalIgnores([
    "**/dist/**",
    "**/.next/**",
    "**/.turbo/**",
    "**/coverage/**",
    "**/node_modules/**",
    "**/next-env.d.ts",
    "**/out/**",
    "**/build/**",
    "**/*.tsbuildinfo",
  ]),

  // ---------------------------------------------------------------- baseline
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // dependency-cruiser loads its config with require(), so these stay CJS.
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "writable", require: "readonly", __dirname: "readonly" },
    },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Node-run ESM scripts (build gates, tooling) get Node globals. They are
    // modules, so sourceType stays the default.
    files: ["**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", URL: "readonly" },
    },
  },
  {
    rules: {
      "no-restricted-syntax": ["error", NO_DEFAULT_EXPORT],
      // A leading underscore means "deliberately discarded", which is how a
      // test destructures a field off an artefact to prove the schema needs it.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: ["**/*.tsx"],
    // The no-hardcoded-string rule governs shipped components, not their tests:
    // a test renders `<OptionRow selected={true}>Le subjonctif</OptionRow>` to
    // exercise it, and nothing it renders is user-visible or reaches a locale
    // file. Same carve-out the purity rules take above (see the TEST_FILES note).
    // NO_DEFAULT_EXPORT still applies to test files, via the baseline block.
    ignores: TEST_FILES,
    rules: {
      "no-restricted-syntax": ["error", NO_DEFAULT_EXPORT, ...NO_JSX_LITERALS],
    },
  },

  // ------------------------------------------- package invariants (3.2)
  // The mechanical half of the "Never contains" column. The rest is stated in
  // each package's CLAUDE.md and left to review, which is said plainly rather
  // than pretended otherwise.
  {
    // domain: "Any I/O, any framework, any async" (implementation-plan.md 3.2).
    files: ["packages/domain/src/**/*.ts"],
    ignores: TEST_FILES,
    rules: {
      "no-restricted-syntax": [
        "error",
        NO_DEFAULT_EXPORT,
        {
          selector:
            ":matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression, MethodDefinition)[async=true]",
          message:
            "@palier/domain is synchronous. The ExamProfile loader parses an already-read value; the reading belongs in an adapter (implementation-plan.md 3.2).",
        },
        {
          selector: "AwaitExpression",
          message:
            "@palier/domain is synchronous (implementation-plan.md 3.2).",
        },
        {
          selector: "TSTypeReference > Identifier[name='Promise']",
          message:
            "@palier/domain is synchronous, so it has no Promise in its public surface (implementation-plan.md 3.2).",
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "@palier/domain performs no I/O." },
        { name: "crypto", message: "@palier/domain performs no I/O." },
        { name: "localStorage", message: "@palier/domain performs no I/O." },
        { name: "indexedDB", message: "@palier/domain performs no I/O." },
      ],
    },
  },
  {
    // engine: pure, with Clock and Random as parameters (ADR 7, ADR 8).
    files: ["packages/engine/src/**/*.ts"],
    ignores: TEST_FILES,
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "Date",
          property: "now",
          message:
            "@palier/engine is pure. Take a Clock as a parameter (architecture.md 7, ADR 8).",
        },
        {
          object: "Math",
          property: "random",
          message:
            "@palier/engine is pure. Take a Random as a parameter (architecture.md 7, ADR 7).",
        },
        {
          object: "performance",
          property: "now",
          message:
            "@palier/engine is pure. Take a Clock as a parameter (architecture.md 7).",
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "@palier/engine never touches the network." },
        {
          name: "localStorage",
          message: "@palier/engine never touches storage.",
        },
        {
          name: "indexedDB",
          message: "@palier/engine never touches storage.",
        },
      ],
    },
  },
  {
    // ui: "Business logic, data fetching" are never contained here.
    files: ["packages/ui/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message:
            "@palier/ui does not fetch. Data arrives as props from the composition root (implementation-plan.md 3.2).",
        },
        {
          name: "XMLHttpRequest",
          message: "@palier/ui does not fetch (implementation-plan.md 3.2).",
        },
        {
          name: "EventSource",
          message: "@palier/ui does not fetch (implementation-plan.md 3.2).",
        },
      ],
    },
  },

  // ------------------------------------------------------------- boundaries
  // Intra-package layering (implementation-plan.md 4.2). Honest note: with the
  // packages still near-empty, the rule earning its keep today is
  // `no-unknown-files` — it makes a file landing in an unclassified directory
  // an error, which is what stops this config rotting as the packages fill.
  {
    files: ["packages/**/src/**/*.{ts,tsx}", "apps/factory/src/**/*.ts"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "domain", pattern: "packages/domain/src/**" },
        { type: "engine", pattern: "packages/engine/src/**" },
        { type: "app-port", pattern: "packages/app/src/ports/**" },
        { type: "app-usecase", pattern: "packages/app/src/use-cases/**" },
        { type: "app", pattern: "packages/app/src/**" },
        // One element, not one per adapter subdirectory. The subdirectories do
        // not exist yet (progress.md deviation D3), and the rule that actually
        // forbids cross-imports between them is `no-cross-adapter-imports` in
        // .dependency-cruiser.cjs, which matches on paths and needs no
        // classification. Split this when the first adapter lands.
        { type: "adapters", pattern: "packages/adapters/src/**" },
        { type: "ui", pattern: "packages/ui/src/**" },
        { type: "testing", pattern: "packages/testing/src/**" },
        { type: "factory", pattern: "apps/factory/src/**" },
      ],
    },
    rules: {
      "boundaries/no-unknown-files": "error",
    },
  },

  // ------------------------------------------------------------- apps/web
  ...nextVitals.map((c) => ({ ...c, files: ["apps/web/**/*.{ts,tsx}"] })),
  ...nextTs.map((c) => ({ ...c, files: ["apps/web/**/*.{ts,tsx}"] })),
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    settings: { next: { rootDir: "apps/web/" } },
  },

  // The Next.js file-convention exemption, last so it wins.
  {
    files: FRAMEWORK_DEFAULT_EXPORT_FILES,
    rules: { "no-restricted-syntax": "off" },
  },
]);

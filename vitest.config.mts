import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * One root Vitest process for the whole repository (progress.md deviation D8).
 *
 * Not a Turborepo fan-out and not a per-package `test` script, because Vitest
 * computes coverage for the whole process and `coverage` is not permitted in a
 * project config. The per-package targets in implementation-plan.md 6.3 are
 * therefore glob-keyed thresholds in the single block below; eight forked
 * runners could not produce one report that enforces them.
 *
 * Cross-package imports resolve through each package's `exports` map into
 * `dist`, exactly as production does. There is deliberately no alias pointing
 * `@palier/*` at `src`: that would leave the exports maps untested and let a
 * test reach a package internal that is not publicly exported. The cost is that
 * `dist` must exist first, which `pnpm verify` guarantees by running
 * `check-types` (and so `^build`) ahead of the tests. In watch mode, run
 * `turbo watch build` alongside.
 */

// `setupFiles` resolves relative to each project's own `root`, so it has to be
// absolute to be shared across all of them.
const SETUP = fileURLToPath(new URL("./vitest.setup.mts", import.meta.url));

// `@palier/ui` is the only package with unit-level DOM tests (its primitives are
// React components); `apps/web` exercises the DOM through Playwright E2E, not
// here. So ui alone runs in jsdom and everything else stays in node.
const workspaceProject = (name: string, root: string, environment: "node" | "jsdom" = "node") => ({
  extends: true,
  test: {
    name,
    root,
    environment,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**", "src/**/*.integration.test.ts"],
    setupFiles: [SETUP],
  },
});

export default defineConfig({
  test: {
    projects: [
      workspaceProject("domain", "./packages/domain"),
      workspaceProject("engine", "./packages/engine"),
      workspaceProject("app", "./packages/app"),
      /**
       * The `adapters` unit project adds `@palier/testing/setup` (the
       * `fake-indexeddb/auto` side-effect) so the Dexie store adapters run
       * against a working IndexedDB in the fast lane — its own comment says
       * that is the intent, "rather than only under Playwright". Web Crypto is
       * native on Node, so the key vault needs no polyfill.
       */
      {
        extends: true,
        test: {
          name: "adapters",
          root: "./packages/adapters",
          environment: "node",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          exclude: ["**/node_modules/**", "**/dist/**", "src/**/*.integration.test.ts"],
          setupFiles: [SETUP, "@palier/testing/setup"],
        },
      },
      workspaceProject("ui", "./packages/ui", "jsdom"),
      workspaceProject("testing", "./packages/testing"),
      workspaceProject("factory", "./apps/factory"),
      workspaceProject("web", "./apps/web"),
      /**
       * The integration project is gated by an env var rather than skipped
       * with `--project='!integration'`, because **any** `--project` filter
       * silently zeroes coverage in Vitest 5.0.1 — the run passes, the report
       * says `Unknown% (0/0)`, and every threshold in this file becomes
       * decorative. Verified by running it; see progress.md deviation D9.
       *
       * So the fast lane runs `vitest run --coverage` with no filter at all,
       * and the medium lane opts this project in (implementation-plan.md 6.5).
       */
      ...(process.env.PALIER_INTEGRATION === "1"
        ? [
            {
              extends: true,
              test: {
                name: "integration",
                root: "./packages/adapters",
                environment: "node",
                include: ["src/**/*.integration.test.ts"],
                setupFiles: [SETUP, "@palier/testing/setup"],
              },
            },
          ]
        : []),
    ],

    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "lcov"],
      include: ["packages/*/src/**/*.{ts,tsx}", "apps/*/src/**/*.{ts,tsx}"],
      exclude: [
        "**/dist/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.test-d.ts",
        "**/*.integration.test.ts",
        "**/__tests__/**",
        "**/*.config.*",
        "apps/web/e2e/**",
        // The factory's bin entry is composition wiring (argv, cwd, stdout,
        // clock, env) with no logic of its own; the CLI it calls is covered by
        // cli.test.ts. Same rationale as apps/web's untested entry files.
        "apps/factory/src/index.ts",
      ],
      /**
       * The packages are consumed through `dist`, so a test in one package
       * executes another's built output. Without this, v8 source-maps that
       * output back into the other package's `src` and inflates its coverage —
       * which would let `@palier/domain` hit its 100% target on the strength of
       * somebody else's tests.
       */
      excludeAfterRemap: true,

      /**
       * The per-package targets from implementation-plan.md 6.3, enforced so a
       * drop fails the build rather than eroding one pull request at a time.
       * Note that a glob does NOT inherit the top-level `perFile`.
       *
       * `packages/ui/**` is split by extension on purpose: 6.3 gives ui logic a
       * 90% target and ui *rendering* no line target at all, because rendering
       * is covered by E2E and accessibility assertions instead.
       */
      thresholds: {
        "packages/domain/src/**/*.ts": {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        "packages/engine/src/**/*.ts": {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        "packages/app/src/**/*.ts": { branches: 95 },
        "packages/adapters/src/**/*.ts": { branches: 90 },
        "packages/testing/src/**/*.ts": { branches: 90 },
        "apps/factory/src/**/*.ts": { branches: 90 },
        "apps/web/src/app/**/route.ts": { branches: 95 },
        "packages/ui/src/**/*.ts": { branches: 90 },
      },
    },
  },
});

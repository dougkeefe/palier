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
 * `dist`, exactly as production does. There is no alias pointing `@palier/*` at
 * `src`: that would leave the exports maps untested and let a test reach a
 * package internal that is not publicly exported. The cost is that `dist` must
 * exist first, which `pnpm verify` guarantees by running `check-types` (and so
 * `^build`) ahead of the tests.
 *
 * The `projects` list and the real thresholds arrive with the rest of the test
 * infrastructure. This file is deliberately minimal for now, because `verify`
 * had to run real tests from the commit that introduced it (deviation D7).
 */
export default defineConfig({
  test: {
    include: ["{packages,apps}/*/src/**/*.test.ts", "{packages,apps}/*/src/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      include: ["packages/*/src/**/*.{ts,tsx}", "apps/*/src/**/*.{ts,tsx}"],
      exclude: [
        "**/dist/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.test-d.ts",
        "**/__tests__/**",
        "**/*.config.*",
      ],
      // The packages are consumed through dist, so a test in one package
      // executes another's built output. Without this, v8 source-maps that
      // output back into the other package's src and inflates its coverage.
      excludeAfterRemap: true,
    },
  },
});

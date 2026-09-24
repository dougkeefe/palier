import { defineConfig, devices } from "@playwright/test";

import { HERMETIC_ENV_FLAG } from "@palier/testing";

/**
 * E2E lives beside the app it drives. The medium lane runs Chromium only;
 * Firefox, WebKit and the mobile viewports are nightly
 * (implementation-plan.md 6.5).
 *
 * `retries: 0` everywhere, deliberately. Section 6.5's flake policy is zero
 * tolerance: everything here is deterministic by construction, so a flake is a
 * real bug and gets quarantined with an issue the same day rather than retried
 * into silence.
 *
 * Two servers, two projects:
 *
 * - `chromium` drives the **hermetic** dev server: the composition root wires the
 *   in-memory ports and the fixture bank, so these tests never depend on a network
 *   or on real content.
 * - `offline` drives a **production** server (`next start` over the build the
 *   medium lane makes first). Offline behaviour needs the service worker, which
 *   registers only in production builds, and Next's own guidance is that dev mode is
 *   not a reliable reference for it (progress.md D60). Locally, run
 *   `pnpm --filter @palier/web build` before this project.
 */
const HERMETIC_PORT = 3000;
const PRODUCTION_PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /offline\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${HERMETIC_PORT}` },
    },
    {
      name: "offline",
      testMatch: /offline\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${PRODUCTION_PORT}` },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @palier/web dev",
      url: `http://localhost:${HERMETIC_PORT}`,
      reuseExistingServer: !process.env.CI,
      // The composition root reads this to wire stub adapters instead of real
      // ones, so E2E never depends on a network or a real bank.
      env: { [HERMETIC_ENV_FLAG]: "1" },
    },
    {
      command: `pnpm --filter @palier/web start --port ${String(PRODUCTION_PORT)}`,
      url: `http://localhost:${PRODUCTION_PORT}/en`,
      reuseExistingServer: !process.env.CI,
    },
  ],
});

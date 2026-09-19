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
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm --filter @palier/web dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // The composition root reads this to wire stub adapters instead of real
    // ones, so E2E never depends on a network or a real bank.
    env: { [HERMETIC_ENV_FLAG]: "1" },
  },
});

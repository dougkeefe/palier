/**
 * The flag the composition root reads to wire stub adapters instead of real
 * ones (implementation-plan.md 6.2, tier 6). It lives here rather than in
 * `apps/web` so that the Playwright config and the composition root cannot
 * disagree about its name.
 */
export const HERMETIC_ENV_FLAG = "PALIER_HERMETIC";

export const isHermetic = (env: Record<string, string | undefined>): boolean =>
  env[HERMETIC_ENV_FLAG] === "1";

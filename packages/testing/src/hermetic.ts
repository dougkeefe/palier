/**
 * The flag the composition root reads to wire stub adapters instead of real
 * ones (implementation-plan.md 6.2, tier 6). It lives here rather than in
 * `apps/web` so that the Playwright config and the composition root cannot
 * disagree about its name.
 */
export const HERMETIC_ENV_FLAG = "PALIER_HERMETIC";

export const isHermetic = (env: Record<string, string | undefined>): boolean =>
  env[HERMETIC_ENV_FLAG] === "1";

/**
 * The global a hermetic page takes its starting settings from (progress.md D270). The in-memory stores last one page
 * load, so an E2E spec that opens a page directly sets this with an init script, and the page starts as a user who has
 * been through onboarding: `{ studyProfile: … }`. Only the hermetic graph reads it.
 */
export const HERMETIC_SETTINGS_GLOBAL = "__palierHermeticSettings";

/** The settings to start a hermetic page with, as key and value: none unless the global holds an object. */
export const hermeticSettingsSeed = (scope: Readonly<Record<string, unknown>>): readonly (readonly [string, unknown])[] => {
  const seed = scope[HERMETIC_SETTINGS_GLOBAL];
  return typeof seed === "object" && seed !== null && !Array.isArray(seed) ? Object.entries(seed) : [];
};

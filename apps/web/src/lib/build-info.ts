/**
 * Which build this is, for `GET /api/health` and the client diagnostic bundle
 * (architecture.md §10 and §16, progress.md D140): the commit's first seven characters on
 * a Vercel build, `"local"` on any other build, and `"dev"` where `next.config.ts` never ran
 * (a unit test). `next.config.ts` inlines `PALIER_BUILD_VERSION` into both the server and
 * the client bundles, so the two always name the same build.
 */
export const BUILD_VERSION: string = process.env.PALIER_BUILD_VERSION ?? "dev";

/** `VERCEL_GIT_COMMIT_SHA`'s first seven characters, or `"local"`. Read once, by `next.config.ts`. */
export const buildVersionFrom = (env: Record<string, string | undefined>): string => {
  const sha = env.VERCEL_GIT_COMMIT_SHA;
  return sha === undefined || sha === "" ? "local" : sha.slice(0, 7);
};

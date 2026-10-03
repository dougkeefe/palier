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

/**
 * The site's public origin, for the sitemap, robots and every page's canonical and `hreflang`
 * links (progress.md D199): `PALIER_SITE_URL` when set, else Vercel's own production domain,
 * which follows the domain the project serves, so pointing a new domain at it needs no code
 * change; else the local dev server. No trailing slash.
 */
export const siteUrlFrom = (env: Record<string, string | undefined>): string => {
  const explicit = env.PALIER_SITE_URL;
  if (explicit !== undefined && explicit !== "") return explicit.replace(/\/+$/, "");
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel !== undefined && vercel !== "") return `https://${vercel.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
};

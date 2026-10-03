import type { MetadataRoute } from "next";

import { routing } from "../i18n/routing";

/**
 * How search engines find the site, correctly (Phase 7 Slice 5, progress.md D199): every route in
 * both locales, each naming its other-language twin, and nothing they should not crawl. Pure, over
 * `routes.json` and the public origin, so `app/robots.ts`, `app/sitemap.ts` and the layout stay
 * one-line bindings.
 */

type Locale = (typeof routing.locales)[number];

/** A route's path in a locale: `/en` for the root, `/fr/progress` for a page. */
export const localePath = (locale: Locale, route: string): string => (route === "" ? `/${locale}` : `/${locale}/${route}`);

/** A route's language alternates, as paths: each locale, and `x-default` to the default locale. */
export const languageAlternates = (route: string): Record<string, string> => ({
  ...Object.fromEntries(routing.locales.map((locale) => [locale, localePath(locale, route)])),
  "x-default": localePath(routing.defaultLocale, route),
});

/** Every route in every locale, absolute, each with its alternates. */
export const sitemapEntries = (routes: readonly string[], origin: string): MetadataRoute.Sitemap =>
  routes.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: `${origin}${localePath(locale, route)}`,
      alternates: {
        languages: Object.fromEntries(Object.entries(languageAlternates(route)).map(([lang, path]) => [lang, `${origin}${path}`])),
      },
    })),
  );

/** Crawl everything but the API and the E2E hook, and find the sitemap at the origin. */
export const robotsFor = (origin: string): MetadataRoute.Robots => ({
  rules: [
    {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...routing.locales.map((locale) => `/${locale}/hermetic/`)],
    },
  ],
  sitemap: `${origin}/sitemap.xml`,
});

/** The request header the proxy names a known page's route in, for the layout's alternates. */
export const ROUTE_HEADER = "x-palier-route";

/** The route a request's path names, below its locale, with no trailing slash: `/en/progress/` → `progress`. */
export const routeOf = (pathname: string): string => pathname.split("/").filter(Boolean).slice(1).join("/");

/**
 * Whether a path under a locale is one of the app's pages. The E2E hook, `hermetic/<view>`, counts
 * only in the hermetic lane; anywhere else it is the 404 like any unknown path (D142).
 */
export const isKnownRoute = (route: string, routes: readonly string[], hermetic: boolean): boolean =>
  routes.includes(route) || (hermetic && /^hermetic\/[^/]+$/.test(route));

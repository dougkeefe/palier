import { defineRouting } from "next-intl/routing";

/**
 * The two official languages, locale-prefixed on every route (`/en/...`,
 * `/fr/...`) with `hreflang` alternates (product-requirements.md §12, R8).
 *
 * `localePrefix: "always"` keeps both languages at equal prominence in the URL
 * itself — neither is the unprefixed "default". `defaultLocale` is only the
 * fallback when `Accept-Language` matches nothing; the proxy negotiates the
 * real choice per request and next-intl persists it in a cookie.
 */
export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
  localePrefix: "always",
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];

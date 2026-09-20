import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

/**
 * Locale negotiation. In Next.js 16 the Middleware convention was renamed to
 * Proxy (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`);
 * the file is `src/proxy.ts` and its default export runs before every matched
 * request. `src/proxy.ts` is already on the framework default-export exemption
 * list in the root `eslint.config.mjs`.
 *
 * next-intl's middleware reads `Accept-Language` and the locale cookie to send
 * an unprefixed request (`/`) to `/en` or `/fr`, and emits the `hreflang`
 * alternates (product-requirements.md §12).
 */
export default createMiddleware(routing);

export const config = {
  // Run on everything except API routes, Next internals, and files with an
  // extension (static assets). Those never need a locale prefix.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};

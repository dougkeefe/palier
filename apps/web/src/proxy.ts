import { isHermetic } from "@palier/testing/in-memory";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";
import { newNonce, withContentSecurityPolicy } from "./lib/csp";
import { ROUTE_HEADER, isKnownRoute, routeOf } from "./lib/discoverability";
import routes from "./lib/routes.json";

/**
 * Locale negotiation and the strict CSP, before every page. In Next.js 16 the Middleware
 * convention was renamed to Proxy (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`);
 * the file is `src/proxy.ts` and its default export runs before every matched request. It
 * is already on the framework default-export exemption list in the root `eslint.config.mjs`.
 *
 * next-intl's middleware reads `Accept-Language` and the locale cookie to send an
 * unprefixed request (`/`) to `/en` or `/fr`, and emits the `hreflang` alternates
 * (product-requirements.md §12).
 *
 * **The CSP** (`lib/csp.ts`; ADR 22, progress.md D133). Each request gets a fresh nonce,
 * set on the request's `Content-Security-Policy` header, where Next reads it while
 * rendering and stamps it on every script it emits, and on the response, where the
 * browser enforces it. next-intl forwards the request's headers to the render
 * (`NextResponse.next({ request: { headers } })`), so setting them before it runs is
 * enough. The layout reads `x-nonce` for its one inline script (`lib/trusted-types.ts`).
 * A nonce needs a render per request, so every page is dynamic (ADR 22).
 *
 * **Which page** (progress.md D199). A path under a locale is checked against `routes.json`, the
 * app's one route list. A known one is named to the layout in `x-palier-route`, for its canonical
 * and `hreflang` links. **An unknown one is rewritten to itself with status 404**, so
 * `[locale]/[...rest]` renders the localised 404 inside the layout, under the same nonce and Trusted
 * Types policy, and the status says what the page does (D141 had to answer 200). next-intl's
 * redirects, an unprefixed path or an unknown locale, go first and are left alone.
 */
const negotiateLocale = createMiddleware(routing);

const isLocale = (segment: string | undefined): boolean => routing.locales.some((locale) => locale === segment);

export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const underLocale = isLocale(pathname.split("/")[1]);
  const route = routeOf(pathname);
  const known = underLocale && isKnownRoute(route, routes, isHermetic(process.env));
  // Never trust the header from the client: it is ours to set, and only for a known page.
  request.headers.delete(ROUTE_HEADER);
  if (known) request.headers.set(ROUTE_HEADER, route);
  return withContentSecurityPolicy(
    request,
    (forwarded) => {
      const response = negotiateLocale(forwarded);
      if (!underLocale || known || response.headers.has("location")) return response;
      return NextResponse.rewrite(forwarded.nextUrl, { status: 404, request: { headers: forwarded.headers } });
    },
    { nonce: newNonce(), development: process.env.NODE_ENV === "development" },
  );
}

export const config = {
  // Run on everything except API routes, Next internals, and files with an
  // extension (static assets). Those never need a locale prefix, and render no HTML.
  // A path under a locale always runs, dot or not: `[locale]/[...rest]` renders the
  // app's 404 for `/en/x.php`, and a page is never served without its CSP (D141).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/(en|fr)/:path*"],
};

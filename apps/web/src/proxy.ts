import createMiddleware from "next-intl/middleware";
import type { NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";
import { newNonce, withContentSecurityPolicy } from "./lib/csp";

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
 */
const negotiateLocale = createMiddleware(routing);

export default function proxy(request: NextRequest): NextResponse {
  return withContentSecurityPolicy(request, negotiateLocale, {
    nonce: newNonce(),
    development: process.env.NODE_ENV === "development",
  });
}

export const config = {
  // Run on everything except API routes, Next internals, and files with an
  // extension (static assets). Those never need a locale prefix, and render no HTML.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};

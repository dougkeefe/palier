# ADR 22: Pages render per request, so the strict CSP can carry a nonce

**Status:** Accepted
**Date:** 2026-09-28
**Supersedes:** Nothing. It changes how `architecture.md` §3's "static content shell" and §10's "everything else is static" are met, and both are amended in place with dated notes pointing here. ADR 11 (Next.js on Vercel, the bank as static content-hashed JSON on the CDN) stands, since the bank is still static.

## Context

Architecture.md §6.4 asks for a strict Content Security Policy with **no inline script**, Trusted Types where supported, and `connect-src` limited to this origin and OpenAI. XSS is the real threat to a key held in the browser (ADR 2), and this policy is the main mitigation. Phase 7 Slice 1 builds it (`progress.md` D132).

A spike on the built app, on 28 September 2026 (`progress.md` D133), found:

1. **Next.js 16 writes two inline scripts into every page**, `self.__next_f.push(…)`, which carry the page's RSC payload. A policy of `script-src 'self'` stops the page from hydrating.
2. **`experimental.sri` does not help.** It adds `integrity` to the external chunks and leaves the inline scripts as they are.
3. **Hashing the inline scripts would keep pages static only through custom build work.** Their contents differ per page and per build, so their hashes can only be known after `next build`. A second build would then have to bake per-route headers, and any difference between the two builds would break hydration in production.
4. **A nonce works, and it is the mechanism Next documents.** The proxy mints a fresh nonce per request and sets it on the request's `Content-Security-Policy` header, and Next stamps it on every script it renders. With a nonce, Trusted Types enforced, and zod's code generation off, all 19 routes in both locales loaded with **zero violations**. But a nonce needs a render per request: Next's guide says "you **must use dynamic rendering** to add nonces".

## Decision

- **Every page renders per request.** The locale layout reads the nonce from the request headers, which opts every route under `[locale]` into dynamic rendering, and no locale is prerendered (`generateStaticParams` is removed).
- **The policy** (`apps/web/src/lib/csp.ts`), set by `src/proxy.ts` on the request and the response:
  - `script-src 'self' 'nonce-…'`, with neither `'unsafe-inline'` nor `'strict-dynamic'`. The latter would trust whatever a trusted script loads, from any origin;
  - `connect-src 'self' https://api.openai.com`;
  - `require-trusted-types-for 'script'` and `trusted-types default`;
  - everything else limited to this origin, and `object-src`, `frame-ancestors` and `base-uri` closed.
- **One Trusted Types policy, `default`** (`src/lib/trusted-types.ts`), rendered inline and nonced in `<head>`. It accepts a script URL only for this origin's `/_next/static/` or `/sw.js`, and returns it unchanged, since Turbopack finds a chunk by its `src` text. It has no HTML or script factory.
- **`next dev` gets a relaxed policy:** `'unsafe-eval'`, inline styles, the HMR websocket, and no Trusted Types. The strict policy is held on the production build by `e2e/csp-production.spec.ts`.
- **What stays static:** the bank, the chunks, `sw.js` and every other file with an extension. The proxy never runs on them.

## Consequences

Positive:
- The policy is the strongest §6.4 describes, through the framework's supported mechanism, with no build-time rewriting.
- The deliberate attempts to leak the key are refused before they leave the page, and a test proves each one (D136). That covers a written script, a foreign or `data:` script, HTML into the DOM, and the key sent by `fetch`, a beacon, an image, a websocket or a form.

Negative:
- **Each page view is a function invocation on Vercel, not a CDN hit**, with `Cache-Control: private, no-store`. That adds time to first byte and a cold start after idle. It costs nothing at this scale, but architecture.md's "a CDN-served experience with no backend dependency and no cold starts" is no longer true of the HTML.
- **Offline is unchanged.** The service worker is network-first for navigations and caches each page with its own header and nonce, so a cached page is consistent with itself. The offline journeys (2, 3, 7) pass.
- **The Lighthouse and bundle budgets were re-run and held** (`progress.md` session log, 28 September 2026).
- **A cached page reuses its nonce while it is served offline.** An attacker would need an injection into that cached copy, which the same policy prevents.
- The CSP cannot stop script that is already running from navigating the whole page to another origin. What prevents it is that no script the app did not ship can run (`SECURITY.md`).

## Revisit when

- Next.js supports hashed inline scripts in static output, or stops writing inline scripts, so a static page can carry a strict policy. Then pages can go back to static rendering with this policy unchanged.
- Or per-request rendering shows up as a real cost: Vercel invocations or time to first byte measured as a problem, not assumed.

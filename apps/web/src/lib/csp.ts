import type { NextRequest, NextResponse } from "next/server";

/**
 * The strict Content Security Policy architecture.md §6.4 asks for, since XSS is the real
 * threat to a key held in the browser (progress.md D133, ADR 22).
 *
 * - **No inline script without this response's nonce.** Next's own inline scripts (the
 *   RSC flight data) and every `<script src>` it renders carry the nonce, because Next
 *   reads it from the request's `Content-Security-Policy` header while rendering.
 *   `'strict-dynamic'` is deliberately absent: it would trust whatever a trusted script
 *   loads, from any origin, and a chunk loaded from `'self'` needs no such trust.
 * - **`connect-src` is this origin and OpenAI only**, so a script that did run could not
 *   send the key anywhere else. The bank is served from this origin (`/content/bank`).
 * - **Trusted Types are enforced**, with only the `default` policy allowed
 *   (`trusted-types.ts`), so an HTML string can never reach a DOM sink.
 *
 * Development relaxes what `next dev` needs and production never does: React's `eval`
 * for server error stacks, the dev overlay's inline styles, the HMR websocket, and no
 * Trusted Types, since the dev runtime writes to sinks the default policy refuses.
 */
export interface PolicyOptions {
  /** This response's nonce, fresh per request. */
  readonly nonce: string;
  /** `next dev`, whose runtime needs what the production build does not. */
  readonly development: boolean;
}

export const OPENAI_ORIGIN = "https://api.openai.com";

export function contentSecurityPolicy({ nonce, development }: PolicyOptions): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self'${development ? " 'unsafe-inline'" : ""}`,
    "img-src 'self' data: blob:",
    // The examiner's voice and the local recording are played from blob: URLs.
    "media-src 'self' blob:",
    "font-src 'self'",
    `connect-src 'self' ${OPENAI_ORIGIN}${development ? " ws:" : ""}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(development ? [] : ["require-trusted-types-for 'script'", "trusted-types default"]),
  ];
  return directives.join("; ");
}

/**
 * A fresh nonce: 128 random bits, base64. Web Crypto, so it runs wherever the proxy does.
 */
export function newNonce(random: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)): string {
  const bytes = random(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/** The request header the layout reads its nonce from. */
export const NONCE_HEADER = "x-nonce";

/**
 * Sets the policy on the request, where Next reads the nonce while rendering, and on the
 * response, where the browser enforces it; `next` is the rest of the proxy (next-intl).
 */
export function withContentSecurityPolicy(
  request: NextRequest,
  next: (request: NextRequest) => NextResponse,
  options: { readonly nonce: string; readonly development: boolean },
): NextResponse {
  const policy = contentSecurityPolicy(options);
  request.headers.set("content-security-policy", policy);
  request.headers.set(NONCE_HEADER, options.nonce);
  const response = next(request);
  response.headers.set("content-security-policy", policy);
  return response;
}

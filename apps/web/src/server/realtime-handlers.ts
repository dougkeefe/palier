import type { RealtimeSecretSource } from "@palier/app";

import { RATE_LIMITS } from "./handlers";
import { clientIp, handle, refuse } from "./http";
import { rateLimitKey } from "./secrets";

/**
 * `POST /api/realtime/secret` (ADR 3, architecture.md §6.3, progress.md D165, D169): **the one
 * route that sees the user's key.** It is small on purpose, to be read line by line.
 *
 * - The key arrives in `Authorization` and nowhere else. The body is never read.
 * - It is used once, by `secrets.mint`, for a short-lived browser secret, and is never
 *   written, logged, returned or held past the request. This file has no `console` and no
 *   store; the model and voice are the server's own configuration, never the client's.
 * - The answer is `{ value, expiresAt }` only, uncached. A refusal is a code, never the
 *   upstream's text, which could echo the key.
 * - Posts are limited per IP hash (D195), counted before `Authorization` is read, and refused
 *   as `throttled`: never `rate-limited`, which is OpenAI's quota and reads as "out of credit".
 */

/** Longer than any key OpenAI issues; a header past it is not a key. */
const MAX_KEY_CHARS = 512;
const BEARER = /^Bearer ([\x21-\x7e]+)$/;

const NO_STORE = { "cache-control": "no-store" };

/** The upstream's refusal as the route's own code, by the adapter error's name. */
const refusalFor = (thrown: unknown): never => {
  const name = thrown instanceof Error ? thrown.name : "";
  if (name === "InvalidApiKeyError") return refuse("invalid-key", 401);
  if (name === "RateLimitError") return refuse("rate-limited", 429);
  return refuse("upstream", 502);
};

/**
 * How long the count may take before the post goes ahead uncounted. Tap to first word is held under
 * 2.5 s (D190), and a database that does not answer must not spend it.
 */
export const RATE_LIMIT_WAIT_MS = 1_000;

/** The rate limit's store and its secret, given only when a database is configured (`realtime.ts`). */
export type RealtimeRateLimit = {
  readonly hit: (key: string, windowStart: string) => Promise<number>;
  readonly salt: string;
  readonly now: () => Date;
  /** `RATE_LIMIT_WAIT_MS` unless a test says otherwise. */
  readonly waitMs?: number;
};

/**
 * Whether this caller is over `RATE_LIMITS.realtime`. **A failing or silent store lets the post
 * through** (D195, D200), unlike the sync routes: the spend is the user's own key and the limit
 * guards only this function, so failing closed would let a database outage break studio mode.
 */
const overLimit = async (limit: RealtimeRateLimit, request: Request): Promise<boolean> => {
  const { max, windowMs } = RATE_LIMITS.realtime;
  const now = limit.now();
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<number>((resolve) => {
    timer = setTimeout(() => resolve(0), limit.waitMs ?? RATE_LIMIT_WAIT_MS);
  });
  try {
    const hit = limit.hit(rateLimitKey(limit.salt, "realtime", clientIp(request), now), windowStart);
    return (await Promise.race([hit.catch(() => 0), late])) > max;
  } finally {
    clearTimeout(timer);
  }
};

export type RealtimeSecretApi = {
  readonly mint: (request: Request) => Promise<Response>;
};

export const createRealtimeSecretApi = (deps: {
  readonly secrets: RealtimeSecretSource;
  readonly limit?: RealtimeRateLimit;
}): RealtimeSecretApi => ({
  mint: handle(async (request) => {
    if (deps.limit !== undefined && (await overLimit(deps.limit, request))) return refuse("throttled", 429);
    const key = BEARER.exec(request.headers.get("authorization") ?? "")?.[1];
    if (key === undefined || key.length > MAX_KEY_CHARS) return refuse("missing-key", 401);
    const secret = await deps.secrets.mint(key).catch(refusalFor);
    return Response.json({ value: secret.value, expiresAt: secret.expiresAt }, { status: 200, headers: NO_STORE });
  }),
});

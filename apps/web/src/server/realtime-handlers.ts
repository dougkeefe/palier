import type { RealtimeSecretSource } from "@palier/app";

import { handle, refuse } from "./http";

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

export type RealtimeSecretApi = {
  readonly mint: (request: Request) => Promise<Response>;
};

export const createRealtimeSecretApi = (deps: { readonly secrets: RealtimeSecretSource }): RealtimeSecretApi => ({
  mint: handle(async (request) => {
    const key = BEARER.exec(request.headers.get("authorization") ?? "")?.[1];
    if (key === undefined || key.length > MAX_KEY_CHARS) return refuse("missing-key", 401);
    const secret = await deps.secrets.mint(key).catch(refusalFor);
    return Response.json({ value: secret.value, expiresAt: secret.expiresAt }, { status: 200, headers: NO_STORE });
  }),
});

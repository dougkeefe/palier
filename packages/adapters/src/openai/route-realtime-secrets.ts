import type { RealtimeSecret, RealtimeSecretSource } from "@palier/app";

import {
  InvalidApiKeyError,
  InvalidResponseError,
  ProviderRequestError,
  ProviderUnavailableError,
  RateLimitError,
} from "./errors.js";
import type { FetchLike, FetchResponse } from "./http.js";
import { platformFetch, timedExchange } from "./http.js";

/** The route's refusals, by the code its body names (apps/web `realtime-handlers.ts`). */
const REFUSALS: Readonly<Record<string, () => Error>> = {
  "missing-key": () => new InvalidApiKeyError("The realtime route received no key."),
  "invalid-key": () => new InvalidApiKeyError("OpenAI rejected the API key."),
  "rate-limited": () => new RateLimitError("OpenAI rate limit or quota reached."),
  upstream: () => new ProviderUnavailableError("Could not reach OpenAI for a realtime secret."),
};

/** The mint plus a little: the route makes one call to OpenAI, under its own limit. */
const DEFAULT_TIMEOUT_MS = 15_000;

export type RouteRealtimeSecretsConfig = {
  /** This origin's route, `/api/realtime/secret` (ADR 3). */
  readonly path: string;
  readonly fetchImpl?: FetchLike;
  readonly timeoutMs?: number;
};

const errorCodeOf = async (res: FetchResponse): Promise<string | null> => {
  const raw = await res.json().catch(() => null);
  const code = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>).error : null;
  return typeof code === "string" ? code : null;
};

/**
 * The browser's `RealtimeSecretSource` (ADR 3, D169): it posts the key, in `Authorization` and
 * nowhere else, to this origin's one route that may see it, and reads back only the secret. A
 * refusal becomes the openai adapter's own error by name, so the screen says why in the same
 * words a key check does.
 */
export const routeRealtimeSecrets = (config: RouteRealtimeSecretsConfig): RealtimeSecretSource => {
  const doFetch = config.fetchImpl ?? platformFetch;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const read = async (res: FetchResponse): Promise<RealtimeSecret> => {
    if (!res.ok) {
      const refusal = REFUSALS[(await errorCodeOf(res)) ?? ""];
      throw refusal === undefined ? new ProviderRequestError(res.status, "the realtime route refused.") : refusal();
    }
    const raw = await res.json().catch(() => null);
    const { value, expiresAt } = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    if (typeof value !== "string" || value === "" || typeof expiresAt !== "string" || Number.isNaN(Date.parse(expiresAt))) {
      throw new InvalidResponseError("The realtime route's answer was not a secret.");
    }
    return { value, expiresAt };
  };
  return {
    mint: (apiKey) =>
      timedExchange(doFetch, config.path, { method: "POST", headers: { authorization: `Bearer ${apiKey}` } }, timeoutMs, read),
  };
};

/** A warm-up is a courtesy: past this it has done what it could. */
const WARM_TIMEOUT_MS = 5_000;

/**
 * Wake this origin's realtime route before the candidate taps Start (progress.md D190), so the mint after the tap
 * meets a warm function. It posts **with no key and no body**, so the route answers `401 missing-key` without
 * reaching OpenAI, and the key never leaves the browser for it. It never rejects: whatever the route answers, or
 * if it cannot be reached, the dial after it is unchanged.
 */
export const warmRealtimeRoute = (config: RouteRealtimeSecretsConfig): (() => Promise<void>) => {
  const doFetch = config.fetchImpl ?? platformFetch;
  return () =>
    timedExchange(doFetch, config.path, { method: "POST", headers: {} }, WARM_TIMEOUT_MS, () => Promise.resolve()).catch(
      () => undefined,
    );
};

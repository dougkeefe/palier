import type { RealtimeSecret, RealtimeSecretSource } from "@palier/app";

import { InvalidApiKeyError, InvalidResponseError, ProviderRequestError, RateLimitError } from "./errors.js";
import type { FetchLike, FetchResponse } from "./http.js";
import { platformFetch, timedExchange } from "./http.js";

/**
 * How long a minted secret opens a connection for (progress.md D165, D169): long enough to post
 * one SDP offer, short enough that a leaked one is worthless. OpenAI allows 10 s to 2 h.
 */
export const REALTIME_SECRET_SECONDS = 60;

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
/** One cheap call; an operational limit, not an exam rule. */
const DEFAULT_TIMEOUT_MS = 10_000;

export type OpenAiRealtimeSecretsConfig = {
  /** The Realtime model, from `ai-models.json`: never taken from the request (ADR 3). */
  readonly model: string;
  /** The examiner's voice, from `ai-models.json`. OpenAI fixes it for the session at the mint. */
  readonly voice: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: FetchLike;
  readonly timeoutMs?: number;
};

/** `/realtime/client_secrets`' answer, structure-checked at the edge (D55): the secret and its expiry in Unix seconds. */
const secretOf = (raw: unknown): RealtimeSecret => {
  const { value, expires_at: expiresAt } = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (typeof value !== "string" || value === "" || typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
    throw new InvalidResponseError("OpenAI's realtime secret was not a value and an expiry.");
  }
  return { value, expiresAt: new Date(expiresAt * 1000).toISOString() };
};

/**
 * The server's `RealtimeSecretSource` (ADR 3, architecture.md §6.3, D169): the one call that
 * spends the user's key off their device, made by `POST /api/realtime/secret`. It holds nothing:
 * the key is an argument, used for one request, and no answer or error it gives carries it. A
 * refusal's body is never read, so nothing OpenAI echoes can reach a message.
 */
export const openAiRealtimeSecrets = (config: OpenAiRealtimeSecretsConfig): RealtimeSecretSource => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const doFetch = config.fetchImpl ?? platformFetch;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const body = JSON.stringify({
    expires_after: { anchor: "created_at", seconds: REALTIME_SECRET_SECONDS },
    session: { type: "realtime", model: config.model, audio: { output: { voice: config.voice } } },
  });
  const read = async (res: FetchResponse): Promise<RealtimeSecret> => {
    if (res.status === 401) throw new InvalidApiKeyError("OpenAI rejected the API key.");
    if (res.status === 429) throw new RateLimitError("OpenAI rate limit or quota reached.");
    if (!res.ok) throw new ProviderRequestError(res.status, "the realtime secret was refused.");
    let raw: unknown;
    try {
      raw = await res.json();
    } catch (cause) {
      throw new InvalidResponseError("OpenAI's answer was not JSON.", { cause });
    }
    return secretOf(raw);
  };
  return {
    mint: (apiKey) =>
      timedExchange(
        doFetch,
        `${baseUrl}/realtime/client_secrets`,
        { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body },
        timeoutMs,
        read,
      ),
  };
};

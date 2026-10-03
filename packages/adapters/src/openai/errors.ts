/**
 * Our error types at the edge. An OpenAI HTTP status, a malformed body or a
 * network fault is translated into one of these before it leaves the adapter,
 * so no vendor payload or shape crosses the boundary (adapters/CLAUDE.md,
 * §2.4). The use cases above catch these, not an `openai` error.
 *
 * **Each class names itself with a string literal**, as every other error in the repo does. The
 * UI tells them apart by `name` (the error crosses the lazily loaded container's chunk), and a
 * production build minifies class names, so `new.target.name` read as `"a"` there. Every key
 * check failure fell through to a generic message until a live key found it (progress.md D158).
 */
export class OpenAiError extends Error {
  override name = "OpenAiError";
}

/** The key was rejected (HTTP 401). The UI must not blame the user's spelling. */
export class InvalidApiKeyError extends OpenAiError {
  override name = "InvalidApiKeyError";
}

/** The account is rate-limited or out of quota (HTTP 429). */
export class RateLimitError extends OpenAiError {
  override name = "RateLimitError";
}

/** Any other non-2xx response from the provider. */
export class ProviderRequestError extends OpenAiError {
  override name = "ProviderRequestError";

  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(`OpenAI request failed with status ${String(status)}: ${detail}`);
  }
}

/** The provider was unreachable — a network fault, not an HTTP status. */
export class ProviderUnavailableError extends OpenAiError {
  override name = "ProviderUnavailableError";
}

/**
 * The provider did not answer within the adapter's time limit (progress.md D99). Never
 * retried: a slow provider is not made faster by asking again, and a retried generation
 * could bill twice.
 */
export class ProviderTimeoutError extends OpenAiError {
  override name = "ProviderTimeoutError";
}

/**
 * The response was well-formed HTTP but the body did not survive re-validation
 * against our schema, even after the one retry the structured-output contract
 * allows (architecture.md §8.2). This is the failure that protects the bank from
 * a model that returns plausible-looking garbage.
 */
export class InvalidResponseError extends OpenAiError {
  override name = "InvalidResponseError";
}

/**
 * Palier's realtime secret route refused this network for a while (`throttled`, progress.md D195): its own
 * rate limit per IP hash, not OpenAI's. Never `RateLimitError`, which says the user's key is out of quota.
 */
export class RouteThrottledError extends OpenAiError {
  override name = "RouteThrottledError";
}

/** Why the user's own realtime secret endpoint gave no secret (progress.md D192). */
export type SelfHostedEndpointFailure = "blocked" | "closed" | "timeout" | "refused" | "malformed";

/**
 * The user's own realtime secret endpoint gave no secret (ADR 3's self-hosted escape, progress.md D192): the
 * browser blocked its window, the window was closed, it never answered, it refused for a reason of its own
 * (an origin it was not deployed for, say), or its answer was not a secret. A refusal that is the route's own
 * code (a rejected key, a rate limit) is that code's error instead, so the screen says it in the same words.
 */
export class SelfHostedEndpointError extends OpenAiError {
  override name = "SelfHostedEndpointError";

  constructor(
    readonly reason: SelfHostedEndpointFailure,
    detail: string,
  ) {
    super(`The realtime endpoint failed: ${detail}`);
  }
}

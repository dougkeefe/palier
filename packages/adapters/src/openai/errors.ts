/**
 * Our error types at the edge. An OpenAI HTTP status, a malformed body or a
 * network fault is translated into one of these before it leaves the adapter,
 * so no vendor payload or shape crosses the boundary (adapters/CLAUDE.md,
 * §2.4). The use cases above catch these, not an `openai` error.
 */
export class OpenAiError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** The key was rejected (HTTP 401). The UI must not blame the user's spelling. */
export class InvalidApiKeyError extends OpenAiError {}

/** The account is rate-limited or out of quota (HTTP 429). */
export class RateLimitError extends OpenAiError {}

/** Any other non-2xx response from the provider. */
export class ProviderRequestError extends OpenAiError {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(`OpenAI request failed with status ${String(status)}: ${detail}`);
  }
}

/** The provider was unreachable — a network fault, not an HTTP status. */
export class ProviderUnavailableError extends OpenAiError {}

/**
 * The response was well-formed HTTP but the body did not survive re-validation
 * against our schema, even after the one retry the structured-output contract
 * allows (architecture.md §8.2). This is the failure that protects the bank from
 * a model that returns plausible-looking garbage.
 */
export class InvalidResponseError extends OpenAiError {}

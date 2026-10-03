import { describe, expect, it } from "vitest";

import {
  InvalidApiKeyError,
  InvalidResponseError,
  OpenAiError,
  ProviderRequestError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  RateLimitError,
  RouteThrottledError,
} from "./errors.js";

/**
 * The UI tells these apart by `name`, so each must be its literal class name, not one read
 * off the constructor at run time: a production build minifies class names (D158). This
 * cannot see minification itself; `key-states-production.spec.ts` does, on the built app.
 */
describe("the openai adapter's errors", () => {
  it.each([
    [new OpenAiError("x"), "OpenAiError"],
    [new InvalidApiKeyError("x"), "InvalidApiKeyError"],
    [new RateLimitError("x"), "RateLimitError"],
    [new ProviderRequestError(500, "x"), "ProviderRequestError"],
    [new ProviderUnavailableError("x"), "ProviderUnavailableError"],
    [new ProviderTimeoutError("x"), "ProviderTimeoutError"],
    [new InvalidResponseError("x"), "InvalidResponseError"],
    [new RouteThrottledError("x"), "RouteThrottledError"],
  ] as const)("names %o as %s, and is an OpenAiError", (error, name) => {
    expect(error.name).toBe(name);
    expect(error).toBeInstanceOf(OpenAiError);
    expect(error).toBeInstanceOf(Error);
  });

  it("keeps a cause and a status", () => {
    const cause = new TypeError("Failed to fetch");
    expect(new ProviderUnavailableError("x", { cause }).cause).toBe(cause);
    expect(new ProviderRequestError(503, "busy").status).toBe(503);
    expect(new ProviderRequestError(503, "busy").message).toBe("OpenAI request failed with status 503: busy");
  });
});

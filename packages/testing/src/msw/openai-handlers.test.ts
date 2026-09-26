import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { mswServer } from "./node.js";
import { type OpenAiMode, openAiHandlers } from "./openai-handlers.js";

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  mswServer.resetHandlers();
});
afterAll(() => {
  mswServer.close();
});

const models = (signal?: AbortSignal) =>
  fetch("https://api.openai.com/v1/models", {
    headers: { authorization: "Bearer sk-handler-test" },
    ...(signal === undefined ? {} : { signal }),
  });

describe("openAiHandlers — the models endpoint in each state a key check can end in", () => {
  it("answers a model list when the key works, and reports the authorization it saw", async () => {
    const seen: (string | null)[] = [];
    mswServer.use(...openAiHandlers({ mode: "ok", onAuthorization: (a) => seen.push(a) }));

    const response = await models();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ object: "list", data: [{ id: "gpt-stub", object: "model" }] });
    expect(seen).toEqual(["Bearer sk-handler-test"]);
  });

  it.each([
    ["invalid-key", 401],
    ["rate-limited", 429],
    ["server-error", 500],
  ] as const)("answers %s with %i and OpenAI's error shape", async (mode: OpenAiMode, status) => {
    mswServer.use(...openAiHandlers({ mode }));

    const response = await models();

    expect(response.status).toBe(status);
    expect(await response.json()).toHaveProperty("error.code");
  });

  it("answers malformed with a 200 that is not a model list", async () => {
    mswServer.use(...openAiHandlers({ mode: "malformed" }));

    const response = await models();

    expect(response.status).toBe(200);
    expect(await response.json()).not.toHaveProperty("data");
  });

  it("never answers when slow, so only the caller's abort ends the request", async () => {
    mswServer.use(...openAiHandlers({ mode: "slow" }));

    await expect(models(AbortSignal.timeout(20))).rejects.toThrow();
  });

  it("serves a configured base URL", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", baseUrl: "http://openai.test/v1" }));

    expect((await fetch("http://openai.test/v1/models")).status).toBe(200);
  });
});

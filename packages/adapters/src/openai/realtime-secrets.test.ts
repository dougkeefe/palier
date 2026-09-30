import { CONTRACT_REALTIME_KEYS, realtimeSecretSourceContract } from "@palier/testing";
import { describe, expect, it, vi } from "vitest";

import type { FetchLike } from "./http.js";
import { REALTIME_SECRET_SECONDS, openAiRealtimeSecrets } from "./realtime-secrets.js";

/** The server's realtime secret source (ADR 3, progress.md D169), over a canned OpenAI. */

type Sent = { url: string; headers: Record<string, string>; body: string };

const reply = (status: number, body: unknown, text = JSON.stringify(body)) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => (typeof body === "undefined" ? Promise.reject(new SyntaxError("html")) : Promise.resolve(body)),
  text: () => Promise.resolve(text),
});

/** An OpenAI that mints `ek_` secrets for any key but the contract's refused one, recording each request. */
const openAi = (answer?: (sent: Sent) => ReturnType<typeof reply>) => {
  const sent: Sent[] = [];
  let minted = 0;
  const fetchImpl: FetchLike = (url, init) => {
    const request = { url, headers: init.headers, body: typeof init.body === "string" ? init.body : "" };
    sent.push(request);
    if (answer !== undefined) return Promise.resolve(answer(request));
    if (init.headers.authorization === `Bearer ${CONTRACT_REALTIME_KEYS.refused}`) {
      return Promise.resolve(reply(401, { error: { message: `Incorrect API key provided: ${CONTRACT_REALTIME_KEYS.refused}` } }));
    }
    minted += 1;
    return Promise.resolve(reply(200, { value: `ek_${String(minted)}abc`, expires_at: 1_790_000_000, session: { id: "sess_1" } }));
  };
  return { fetchImpl, sent };
};

const source = (fetchImpl: FetchLike) => openAiRealtimeSecrets({ model: "gpt-realtime-test", voice: "marin", fetchImpl });

realtimeSecretSourceContract("openai", () => Promise.resolve(source(openAi().fetchImpl)));

describe("openAiRealtimeSecrets", () => {
  it("asks OpenAI for a secret with the key as a bearer token, the configured model and voice, and a short expiry", async () => {
    const { fetchImpl, sent } = openAi();
    await source(fetchImpl).mint("sk-user");

    expect(sent).toHaveLength(1);
    expect(sent[0]?.url).toBe("https://api.openai.com/v1/realtime/client_secrets");
    expect(sent[0]?.headers.authorization).toBe("Bearer sk-user");
    expect(JSON.parse(sent[0]?.body ?? "{}")).toEqual({
      expires_after: { anchor: "created_at", seconds: REALTIME_SECRET_SECONDS },
      session: { type: "realtime", model: "gpt-realtime-test", audio: { output: { voice: "marin" } } },
    });
    expect(REALTIME_SECRET_SECONDS).toBe(60);
  });

  it("answers the secret and its expiry as an instant, and nothing of the session", async () => {
    const { fetchImpl } = openAi();

    expect(await source(fetchImpl).mint("sk-user")).toEqual({ value: "ek_1abc", expiresAt: new Date(1_790_000_000_000).toISOString() });
  });

  it.each([
    [429, "RateLimitError"],
    [500, "ProviderRequestError"],
  ])("turns a %s into %s, never echoing OpenAI's body", async (status, name) => {
    const { fetchImpl } = openAi(() => reply(status, { error: { message: "sk-user was here" } }));
    const refusal = await source(fetchImpl).mint("sk-user").catch((error: unknown) => error);

    expect(refusal).toMatchObject({ name });
    expect(String(refusal)).not.toContain("sk-user");
  });

  it.each([
    ["no value", { expires_at: 1 }],
    ["an empty value", { value: "", expires_at: 1 }],
    ["no expiry", { value: "ek_1" }],
    ["an expiry that is not a number", { value: "ek_1", expires_at: "soon" }],
    ["not an object", "ek_1"],
  ])("refuses an answer with %s as InvalidResponseError", async (_, body) => {
    const { fetchImpl } = openAi(() => reply(200, body));

    await expect(source(fetchImpl).mint("sk-user")).rejects.toMatchObject({ name: "InvalidResponseError" });
  });

  it("refuses a 200 that is not JSON as InvalidResponseError", async () => {
    const { fetchImpl } = openAi(() => reply(200, undefined, "<html>"));

    await expect(source(fetchImpl).mint("sk-user")).rejects.toMatchObject({ name: "InvalidResponseError" });
  });

  it("names a network failure as the provider being unreachable", async () => {
    const down: FetchLike = () => Promise.reject(new TypeError("fetch failed"));

    await expect(source(down).mint("sk-user")).rejects.toMatchObject({ name: "ProviderUnavailableError" });
  });

  it("gives up on an OpenAI that does not answer, as a timeout", async () => {
    vi.useFakeTimers();
    try {
      const silent: FetchLike = () => new Promise(() => undefined);
      const minting = openAiRealtimeSecrets({ model: "m", voice: "v", fetchImpl: silent, timeoutMs: 1_000 }).mint("sk-user");
      const settled = expect(minting).rejects.toMatchObject({ name: "ProviderTimeoutError" });
      await vi.advanceTimersByTimeAsync(1_000);
      await settled;
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses the base URL it is given", async () => {
    const { fetchImpl, sent } = openAi();
    await openAiRealtimeSecrets({ model: "m", voice: "v", fetchImpl, baseUrl: "http://localhost:9/v1" }).mint("sk-user");

    expect(sent[0]?.url).toBe("http://localhost:9/v1/realtime/client_secrets");
  });
});

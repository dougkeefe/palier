import type { RealtimeSecretSource } from "@palier/app";
import { memoryRealtimeSecretSource } from "@palier/testing";
import { describe, expect, it } from "vitest";

import { createRealtimeSecretApi } from "./realtime-handlers";

/**
 * The one route that sees the user's key (ADR 3, progress.md D169), one test per branch. The
 * key is a sentinel, looked for in everything the route answers.
 */

const KEY = "sk-palier-realtime-sentinel-3f9c2d";

const post = (headers: Record<string, string> = { authorization: `Bearer ${KEY}` }, body?: string) =>
  new Request("http://palier.test/api/realtime/secret", { method: "POST", headers, ...(body === undefined ? {} : { body }) });

/** A source that fails the way the openai adapter would, by the error's name, with the key in its message. */
const failing = (name: string): RealtimeSecretSource => ({
  mint: (key) => {
    const error = new Error(`OpenAI said no to ${key}`);
    error.name = name;
    return Promise.reject(error);
  },
});

const answer = async (response: Response) => ({ status: response.status, text: await response.text(), cache: response.headers.get("cache-control") });

describe("createRealtimeSecretApi", () => {
  it("mints with the key from Authorization and answers only the secret and its expiry, uncached", async () => {
    const secrets = memoryRealtimeSecretSource({ now: () => "2026-09-29T12:00:00.000Z" });
    const { status, text, cache } = await answer(await createRealtimeSecretApi({ secrets }).mint(post()));

    expect(status).toBe(200);
    expect(JSON.parse(text)).toEqual({ value: "ek_memory_1", expiresAt: "2026-09-29T12:01:00.000Z" });
    expect(cache).toBe("no-store");
    expect(secrets.keys()).toEqual([KEY]);
  });

  it("keeps nothing of the upstream's answer but the secret and its expiry", async () => {
    const secrets: RealtimeSecretSource = {
      mint: () => Promise.resolve({ value: "ek_1", expiresAt: "2026-09-29T12:01:00.000Z", session: { key: KEY } } as never),
    };
    const { text } = await answer(await createRealtimeSecretApi({ secrets }).mint(post()));

    expect(JSON.parse(text)).toEqual({ value: "ek_1", expiresAt: "2026-09-29T12:01:00.000Z" });
  });

  it("never reads the body, so a key sent there is neither used nor accepted", async () => {
    const secrets = memoryRealtimeSecretSource();
    const response = await createRealtimeSecretApi({ secrets }).mint(post({}, JSON.stringify({ key: KEY })));

    expect(response.status).toBe(401);
    expect(secrets.keys()).toEqual([]);
  });

  it.each([
    ["no Authorization", {}],
    ["a scheme that is not Bearer", { authorization: `Basic ${KEY}` }],
    ["an empty bearer", { authorization: "Bearer " }],
    ["a key with a space in it", { authorization: `Bearer ${KEY} ${KEY}` }],
    ["a key longer than any key", { authorization: `Bearer sk-${"x".repeat(600)}` }],
  ])("refuses %s as missing-key, 401, and mints nothing", async (_, headers) => {
    const secrets = memoryRealtimeSecretSource();
    const { status, text } = await answer(await createRealtimeSecretApi({ secrets }).mint(post(headers)));

    expect(status).toBe(401);
    expect(JSON.parse(text)).toEqual({ error: "missing-key" });
    expect(secrets.keys()).toEqual([]);
  });

  it.each([
    ["InvalidApiKeyError", 401, "invalid-key"],
    ["RateLimitError", 429, "rate-limited"],
    ["ProviderUnavailableError", 502, "upstream"],
    ["ProviderTimeoutError", 502, "upstream"],
    ["InvalidResponseError", 502, "upstream"],
  ])("answers the upstream's %s as %s %s, never its text", async (name, status, code) => {
    const { status: got, text } = await answer(await createRealtimeSecretApi({ secrets: failing(name) }).mint(post()));

    expect(got).toBe(status);
    expect(JSON.parse(text)).toEqual({ error: code });
    expect(text).not.toContain(KEY);
  });

  it("answers a rejection that is not an error, here the key itself, as upstream, 502", async () => {
    const secrets: RealtimeSecretSource = { mint: (key) => Promise.reject(key) };
    const { status, text } = await answer(await createRealtimeSecretApi({ secrets }).mint(post()));

    expect(status).toBe(502);
    expect(text).not.toContain(KEY);
  });
});

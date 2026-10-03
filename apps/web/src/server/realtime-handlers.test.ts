import type { RealtimeSecretSource } from "@palier/app";
import { memoryRealtimeSecretSource } from "@palier/testing";
import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { RATE_LIMITS } from "./handlers";
import { type RealtimeRateLimit, createRealtimeSecretApi } from "./realtime-handlers";
import { rateLimitKey } from "./secrets";

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

  /**
   * The route's half of its log exclusion (architecture.md §16, progress.md D193): Vercel records each request's method,
   * path and status, and whatever the function writes to the console. So the route writes nothing, and no failure
   * escapes it for the framework to log with its message, which an adapter's might carry the key in.
   */
  it("writes nothing to the console on any answer, the key-bearing failures included", async () => {
    const written = vi.spyOn(console, "log");
    const errored = vi.spyOn(console, "error");
    const warned = vi.spyOn(console, "warn");
    try {
      const answers = [
        await createRealtimeSecretApi({ secrets: memoryRealtimeSecretSource() }).mint(post()),
        await createRealtimeSecretApi({ secrets: failing("InvalidApiKeyError") }).mint(post()),
        await createRealtimeSecretApi({ secrets: failing("TypeError") }).mint(post()),
        await createRealtimeSecretApi({ secrets: { mint: (key) => Promise.reject(key) } }).mint(post()),
        await createRealtimeSecretApi({ secrets: memoryRealtimeSecretSource() }).mint(post({})),
      ];

      expect(answers.map((response) => response.status)).toEqual([200, 401, 502, 502, 401]);
      expect([...written.mock.calls, ...errored.mock.calls, ...warned.mock.calls]).toEqual([]);
    } finally {
      written.mockRestore();
      errored.mockRestore();
      warned.mockRestore();
    }
  });

  describe("the rate limit (D195)", () => {
    const NOW = new Date("2026-10-03T12:34:56.000Z");
    const IP = "203.0.113.7";
    const from = (headers: Record<string, string> = { authorization: `Bearer ${KEY}` }) => post({ "x-forwarded-for": IP, ...headers });

    /** A store whose next count is `count`, recording what it was asked. */
    const store = (count: number) => {
      const hits: [string, string][] = [];
      const limit: RealtimeRateLimit = {
        hit: (key, windowStart) => {
          hits.push([key, windowStart]);
          return Promise.resolve(count);
        },
        salt: "salt",
        now: () => NOW,
      };
      return { limit, hits };
    };

    it("counts the post under the caller's IP hash, in the hour's window", async () => {
      const { limit, hits } = store(1);
      await createRealtimeSecretApi({ secrets: memoryRealtimeSecretSource(), limit }).mint(from());

      expect(hits).toEqual([[rateLimitKey("salt", "realtime", IP, NOW), "2026-10-03T12:00:00.000Z"]]);
    });

    it.each([
      ["under", RATE_LIMITS.realtime.max - 1],
      ["at", RATE_LIMITS.realtime.max],
    ])("mints %s the limit", async (_, count) => {
      const secrets = memoryRealtimeSecretSource();
      const response = await createRealtimeSecretApi({ secrets, limit: store(count).limit }).mint(from());

      expect(response.status).toBe(200);
      expect(secrets.keys()).toEqual([KEY]);
    });

    it("refuses a post over the limit as throttled, 429, never rate-limited, and mints nothing", async () => {
      const secrets = memoryRealtimeSecretSource();
      const { status, text } = await answer(
        await createRealtimeSecretApi({ secrets, limit: store(RATE_LIMITS.realtime.max + 1).limit }).mint(from()),
      );

      expect(status).toBe(429);
      expect(JSON.parse(text)).toEqual({ error: "throttled" });
      expect(secrets.keys()).toEqual([]);
    });

    it("counts before it reads the key, so a warm-up over the limit is throttled, not missing-key", async () => {
      const { limit, hits } = store(RATE_LIMITS.realtime.max + 1);
      const { status, text } = await answer(await createRealtimeSecretApi({ secrets: memoryRealtimeSecretSource(), limit }).mint(from({})));

      expect(status).toBe(429);
      expect(JSON.parse(text)).toEqual({ error: "throttled" });
      expect(hits).toHaveLength(1);
    });

    it("lets the mint through when the store fails, since the spend is the user's own key", async () => {
      const secrets = memoryRealtimeSecretSource();
      const limit: RealtimeRateLimit = { hit: () => Promise.reject(new Error("database down")), salt: "salt", now: () => NOW };
      const response = await createRealtimeSecretApi({ secrets, limit }).mint(from());

      expect(response.status).toBe(200);
      expect(secrets.keys()).toEqual([KEY]);
    });
  });

  it.each([["realtime-handlers.ts"], ["realtime.ts"]])("holds no console call in %s", (file) => {
    expect(readFileSync(new URL(file, import.meta.url), "utf8")).not.toMatch(/\bconsole\s*\./);
  });
});

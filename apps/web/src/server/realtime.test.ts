import { afterEach, describe, expect, it, vi } from "vitest";

import { resetSyncApi } from "./db";

import aiModels from "../lib/ai-models.json";
import { buildRealtimeSecretApi, realtimeSecretApi } from "./realtime";

/** The realtime route's composition (D169): which source mints, and for which model. */

const post = () =>
  new Request("http://palier.test/api/realtime/secret", { method: "POST", headers: { authorization: "Bearer sk-user" } });

afterEach(() => {
  vi.unstubAllGlobals();
  resetSyncApi();
});

describe("buildRealtimeSecretApi", () => {
  it("mints from memory in the hermetic lane, calling nobody", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await buildRealtimeSecretApi({ PALIER_HERMETIC: "1" }).mint(post());

    expect(await response.json()).toMatchObject({ value: "ek_memory_1" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("asks OpenAI otherwise, for ai-models.json's realtime model and voice, never the request's", async () => {
    const fetchSpy = vi.fn((_url: string, _init: { body: string }) =>
      Promise.resolve(Response.json({ value: "ek_live", expires_at: 1_790_000_000 })),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const response = await buildRealtimeSecretApi({}).mint(post());

    expect(await response.json()).toEqual({ value: "ek_live", expiresAt: new Date(1_790_000_000_000).toISOString() });
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://api.openai.com/v1/realtime/client_secrets");
    expect(JSON.parse(init?.body ?? "{}")).toMatchObject({
      session: { model: aiModels.realtime, audio: { output: { voice: aiModels.realtimeVoice } } },
    });
  });
});

describe("buildRealtimeSecretApi's rate limit (D195)", () => {
  it("has none in the hermetic lane, so the E2E lanes are never throttled", async () => {
    const api = buildRealtimeSecretApi({ PALIER_HERMETIC: "1", DATABASE_URL: "postgres://palier:palier@127.0.0.1:1/palier" });
    const statuses = [];
    for (let i = 0; i < 70; i += 1) statuses.push((await api.mint(post())).status);

    expect(new Set(statuses)).toEqual(new Set([200]));
  });

  it("counts in the configured database, and mints anyway when it cannot be reached", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(Response.json({ value: "ek_live", expires_at: 1_790_000_000 })));

    const response = await buildRealtimeSecretApi({ DATABASE_URL: "postgres://palier:palier@127.0.0.1:1/palier" }).mint(post());

    expect(response.status).toBe(200);
  });
});

describe("realtimeSecretApi", () => {
  it("is built once, so the hermetic source's secrets stay distinct across requests", () => {
    expect(realtimeSecretApi({ PALIER_HERMETIC: "1" })).toBe(realtimeSecretApi({ PALIER_HERMETIC: "1" }));
  });
});

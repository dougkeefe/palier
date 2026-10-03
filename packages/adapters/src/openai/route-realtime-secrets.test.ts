import { describe, expect, it } from "vitest";

import type { FetchLike } from "./http.js";
import { routeRealtimeSecrets, warmRealtimeRoute } from "./route-realtime-secrets.js";

/**
 * The browser's realtime secret source (ADR 3, progress.md D169), over a canned route. The
 * shared contract runs against it in apps/web, through the real route handler.
 */

const reply = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => (body === undefined ? Promise.reject(new SyntaxError("html")) : Promise.resolve(body)),
  text: () => Promise.resolve(JSON.stringify(body)),
});

const route = (status: number, body: unknown) => {
  const sent: { url: string; method: string; headers: Record<string, string>; body: unknown }[] = [];
  const fetchImpl: FetchLike = (url, init) => {
    sent.push({ url, method: init.method, headers: init.headers, body: init.body });
    return Promise.resolve(reply(status, body));
  };
  return { fetchImpl, sent, source: routeRealtimeSecrets({ path: "/api/realtime/secret", fetchImpl }) };
};

describe("routeRealtimeSecrets", () => {
  it("posts the key to this origin's route in Authorization only, with no body, and reads back the secret", async () => {
    const { source, sent } = route(200, { value: "ek_1", expiresAt: "2026-09-29T12:01:00.000Z" });

    expect(await source.mint("sk-user")).toEqual({ value: "ek_1", expiresAt: "2026-09-29T12:01:00.000Z" });
    expect(sent).toEqual([{ url: "/api/realtime/secret", method: "POST", headers: { authorization: "Bearer sk-user" }, body: undefined }]);
  });

  it("keeps only the secret and its expiry from the route's answer", async () => {
    const { source } = route(200, { value: "ek_1", expiresAt: "2026-09-29T12:01:00.000Z", extra: "x" });

    expect(await source.mint("sk-user")).toEqual({ value: "ek_1", expiresAt: "2026-09-29T12:01:00.000Z" });
  });

  it.each([
    ["missing-key", 401, "InvalidApiKeyError"],
    ["invalid-key", 401, "InvalidApiKeyError"],
    ["rate-limited", 429, "RateLimitError"],
    ["throttled", 429, "RouteThrottledError"],
    ["upstream", 502, "ProviderUnavailableError"],
  ])("turns the route's %s refusal into %s by name", async (code, status, name) => {
    const { source } = route(status, { error: code });

    await expect(source.mint("sk-user")).rejects.toMatchObject({ name });
  });

  it.each([
    ["a code it does not know", { error: "teapot" }],
    ["no code", {}],
    ["a body that is not JSON", undefined],
    ["a code that is not a string", { error: 7 }],
  ])("names a refusal with %s by its status", async (_, body) => {
    const { source } = route(503, body);

    await expect(source.mint("sk-user")).rejects.toMatchObject({ name: "ProviderRequestError", status: 503 });
  });

  it.each([
    ["no value", { expiresAt: "2026-09-29T12:01:00.000Z" }],
    ["an empty value", { value: "", expiresAt: "2026-09-29T12:01:00.000Z" }],
    ["an expiry that is not an instant", { value: "ek_1", expiresAt: "soon" }],
    ["no expiry", { value: "ek_1" }],
    ["a body that is not JSON", undefined],
  ])("refuses an answer with %s as InvalidResponseError", async (_, body) => {
    const { source } = route(200, body);

    await expect(source.mint("sk-user")).rejects.toMatchObject({ name: "InvalidResponseError" });
  });
});

describe("warmRealtimeRoute (D190)", () => {
  it("posts to this origin's route with no key, no header and no body", async () => {
    const { fetchImpl, sent } = route(401, { error: "missing-key" });

    await warmRealtimeRoute({ path: "/api/realtime/secret", fetchImpl })();

    expect(sent).toEqual([{ url: "/api/realtime/secret", method: "POST", headers: {}, body: undefined }]);
  });

  it("resolves whatever the route answers", async () => {
    const { fetchImpl } = route(502, undefined);

    await expect(warmRealtimeRoute({ path: "/api/realtime/secret", fetchImpl })()).resolves.toBeUndefined();
  });

  it("resolves when the route cannot be reached", async () => {
    const fetchImpl: FetchLike = () => Promise.reject(new TypeError("offline"));

    await expect(warmRealtimeRoute({ path: "/api/realtime/secret", fetchImpl })()).resolves.toBeUndefined();
  });
});

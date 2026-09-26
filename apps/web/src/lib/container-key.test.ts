import { type OpenAiMode, mswServer, openAiHandlers } from "@palier/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createContainer } from "./container";

/**
 * The key, through both graphs' real wiring (Phase 4 Slice 1, progress.md D98–D99): the
 * vault behind the key use cases, and the real `@palier/adapters/openai` provider made per
 * call inside `withApiKey`, against OpenAI's models endpoint stood in for by MSW in each
 * state a key check can end in (implementation-plan.md §6.2 tier 4).
 */

vi.mock("../server/db", () => ({ syncApi: () => Promise.resolve(null) }));

const KEY = "sk-palier-container-test-7f3a";

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });
});
afterEach(async () => {
  mswServer.resetHandlers();
  vi.useRealTimers();
  // Every production container shares the one IndexedDB database, so leave it empty.
  await createContainer({ hermetic: false }).useCases.wipeData();
});
afterAll(() => {
  mswServer.close();
});

describe("the key check through the real OpenAI adapter", () => {
  it("sends the key to api.openai.com as a bearer token, and nowhere else, when it works", async () => {
    const seen: (string | null)[] = [];
    mswServer.use(...openAiHandlers({ mode: "ok", onAuthorization: (a) => seen.push(a) }));
    const c = createContainer({ hermetic: true });
    await c.useCases.saveApiKey({ key: KEY, remember: true });

    await expect(c.useCases.checkApiKey()).resolves.toBeUndefined();

    // `onUnhandledRequest: "error"` fails any request to another origin.
    expect(seen).toEqual([`Bearer ${KEY}`]);
  });

  it.each([
    ["invalid-key", "InvalidApiKeyError"],
    ["rate-limited", "RateLimitError"],
    ["server-error", "ProviderRequestError"],
    ["malformed", "InvalidResponseError"],
  ] as const)("rejects a %s answer with the adapter's %s, which the key screen names", async (mode: OpenAiMode, name) => {
    mswServer.use(...openAiHandlers({ mode }));
    const c = createContainer({ hermetic: true });
    await c.useCases.saveApiKey({ key: KEY, remember: true });

    const error: unknown = await c.useCases.checkApiKey().catch((e: unknown) => e);

    expect((error as Error).name).toBe(name);
    expect((error as Error).message).not.toContain(KEY);
  });

  it("gives up on a key check OpenAI never answers, as a timeout", async () => {
    mswServer.use(...openAiHandlers({ mode: "slow" }));
    const c = createContainer({ hermetic: true });
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    const check = c.useCases.checkApiKey().catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(((await check) as Error).name).toBe("ProviderTimeoutError");
  });

  it("says there is no key rather than calling OpenAI without one", async () => {
    const c = createContainer({ hermetic: true });
    const error: unknown = await c.useCases.checkApiKey().catch((e: unknown) => e);
    expect((error as Error).name).toBe("NoApiKeyError");
  });
});

describe("the key in the production graph, over real IndexedDB (fake-indexeddb)", () => {
  it("keeps a remembered key across a reload, and describes it by its last four only", async () => {
    await createContainer({ hermetic: false }).useCases.saveApiKey({ key: KEY, remember: true });

    const reloaded = createContainer({ hermetic: false });

    expect(await reloaded.useCases.apiKeyStatus()).toEqual({ storage: "device", lastFour: "7f3a" });
  });

  it("forgets a tab-only key on a reload: it never reached IndexedDB", async () => {
    const tab = createContainer({ hermetic: false });
    await tab.useCases.saveApiKey({ key: KEY, remember: false });
    expect(await tab.useCases.apiKeyStatus()).toEqual({ storage: "tab", lastFour: "7f3a" });

    expect(await createContainer({ hermetic: false }).useCases.apiKeyStatus()).toBeNull();
  });

  it("removes the key in either mode, and a wipe does too", async () => {
    const c = createContainer({ hermetic: false });
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    await c.useCases.removeApiKey();
    expect(await c.useCases.apiKeyStatus()).toBeNull();

    await c.useCases.saveApiKey({ key: KEY, remember: false });
    await c.useCases.wipeData();
    expect(await c.useCases.apiKeyStatus()).toBeNull();
  });

  it("never puts the key in an export, in either mode [R12]", async () => {
    const c = createContainer({ hermetic: false });
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    expect(JSON.stringify(await c.useCases.exportData())).not.toContain(KEY);
    await c.useCases.saveApiKey({ key: KEY, remember: false });
    expect(JSON.stringify(await c.useCases.exportData())).not.toContain(KEY);
  });
});

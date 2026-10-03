import { CONTRACT_REALTIME_KEYS, realtimeSecretSourceContract } from "@palier/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { EndpointMessage, EndpointPopup, EndpointWindowHost, EndpointWindows } from "./self-hosted-secrets.js";
import {
  SELF_HOSTED_MESSAGES,
  SELF_HOSTED_VERSION,
  browserEndpointWindows,
  selfHostedRealtimeSecrets,
} from "./self-hosted-secrets.js";

/**
 * The self-hosted realtime secret source (ADR 3's escape, progress.md D192), over a simulated popup: the page the
 * repository's `selfhost/` Worker serves, reduced to the protocol. Whether a real browser opens and carries it is
 * the end-to-end test's (`studio-selfhost-production.spec.ts`) and the manual realtime checklist's.
 */

const ENDPOINT = "https://secret.example.org/";
const ENDPOINT_ORIGIN = "https://secret.example.org";
const MODEL = "gpt-realtime-test";
const VOICE = "cedar";
const EXPIRES = "2026-10-02T12:01:00.000Z";

type Posted = { readonly data: Record<string, unknown>; readonly targetOrigin: string };

type PageBehaviour = {
  /** Never open a popup, as a blocking browser would. */
  readonly blocked?: boolean;
  /** Say `ready`, from where. Default: from the popup, at the endpoint's origin. */
  readonly ready?: false | { readonly origin: string; readonly fromPopup: boolean; readonly version?: number };
  /** How the page answers a mint, or nothing at all. Default: a fresh secret, or `invalid-key` for the refused key. */
  readonly answer?: (mint: Record<string, unknown>) => Record<string, unknown> | null;
};

/** A browser with one simulated endpoint page behind its popups. */
const fakeWindows = (behaviour: PageBehaviour = {}) => {
  const handlers = new Set<(message: EndpointMessage) => void>();
  const opened: string[] = [];
  const posted: Posted[] = [];
  const popups: { closed: boolean }[] = [];
  let minted = 0;
  const deliver = (message: EndpointMessage): void => {
    for (const handler of [...handlers]) handler(message);
  };
  const defaultAnswer = (mint: Record<string, unknown>): Record<string, unknown> =>
    mint.key === CONTRACT_REALTIME_KEYS.refused
      ? { type: SELF_HOSTED_MESSAGES.refused, version: SELF_HOSTED_VERSION, id: mint.id, error: "invalid-key" }
      : { type: SELF_HOSTED_MESSAGES.minted, version: SELF_HOSTED_VERSION, id: mint.id, value: `ek_self_${String(++minted)}`, expiresAt: EXPIRES };

  const windows: EndpointWindows = {
    open: (url) => {
      opened.push(url);
      if (behaviour.blocked === true) return null;
      const state = { closed: false };
      popups.push(state);
      const popup: EndpointPopup = {
        post: (data, targetOrigin) => {
          posted.push({ data: data as Record<string, unknown>, targetOrigin });
          // A real browser delivers only to a document at `targetOrigin`; the page is at the endpoint's.
          if (targetOrigin !== ENDPOINT_ORIGIN || state.closed) return;
          const mint = data as Record<string, unknown>;
          const reply = (behaviour.answer ?? defaultAnswer)(mint);
          if (reply !== null) setTimeout(() => deliver({ origin: ENDPOINT_ORIGIN, fromPopup: true, data: reply }), 0);
        },
        closed: () => state.closed,
        close: () => {
          state.closed = true;
        },
      };
      const ready = behaviour.ready ?? { origin: ENDPOINT_ORIGIN, fromPopup: true };
      if (ready !== false) {
        setTimeout(
          () =>
            deliver({
              origin: ready.origin,
              fromPopup: ready.fromPopup,
              data: { type: SELF_HOSTED_MESSAGES.ready, version: ready.version ?? SELF_HOSTED_VERSION },
            }),
          0,
        );
      }
      return popup;
    },
    listen: (_popup, handler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
  return { windows, opened, posted, popups, deliver, listening: () => handlers.size };
};

let ids = 0;
const source = (windows: EndpointWindows, extra: { signal?: AbortSignal; timeoutMs?: number } = {}) =>
  selfHostedRealtimeSecrets({ endpoint: ENDPOINT, model: MODEL, voice: VOICE, windows, newId: () => `mint-${String(++ids)}`, ...extra });

const failureOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => null,
    (error: unknown) => error,
  );

afterEach(() => {
  vi.useRealTimers();
});

realtimeSecretSourceContract("selfHostedRealtimeSecrets", () => Promise.resolve(source(fakeWindows().windows)));

describe("selfHostedRealtimeSecrets", () => {
  it("opens the endpoint, posts the key to its origin only once the page is ready, and reads back the secret", async () => {
    const page = fakeWindows();

    expect(await source(page.windows).mint("sk-user")).toEqual({ value: "ek_self_1", expiresAt: EXPIRES });
    expect(page.opened).toEqual([ENDPOINT]);
    expect(page.posted).toEqual([
      {
        data: { type: SELF_HOSTED_MESSAGES.mint, version: SELF_HOSTED_VERSION, id: expect.any(String), key: "sk-user", model: MODEL, voice: VOICE },
        targetOrigin: ENDPOINT_ORIGIN,
      },
    ]);
  });

  it("uses the popup opened at the tap for the mint after it, and opens no other", async () => {
    const page = fakeWindows();
    const secrets = source(page.windows);

    secrets.open();
    secrets.open();
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(await secrets.mint("sk-user")).toMatchObject({ value: "ek_self_1" });
    expect(page.opened).toEqual([ENDPOINT]);
  });

  it("closes the popup and stops listening once the secret is back", async () => {
    const page = fakeWindows();

    await source(page.windows).mint("sk-user");

    expect(page.popups.map((popup) => popup.closed)).toEqual([true]);
    expect(page.listening()).toBe(0);
  });

  it("opens a new popup for each mint, so a reconnect asks the page again", async () => {
    const page = fakeWindows();
    const secrets = source(page.windows);

    const first = await secrets.mint("sk-user");
    const second = await secrets.mint("sk-user");

    expect(second.value).not.toBe(first.value);
    expect(page.opened).toEqual([ENDPOINT, ENDPOINT]);
  });

  it.each([
    ["another origin, from the popup", { origin: "https://elsewhere.example.net", fromPopup: true }],
    ["the endpoint's origin, from another window", { origin: ENDPOINT_ORIGIN, fromPopup: false }],
    ["the endpoint's origin, on another version", { origin: ENDPOINT_ORIGIN, fromPopup: true, version: 2 }],
  ])("never posts the key on a ready from %s, and fails at the timeout", async (_label, ready) => {
    vi.useFakeTimers();
    const page = fakeWindows({ ready });
    const minting = failureOf(source(page.windows, { timeoutMs: 1_000 }).mint("sk-user"));

    await vi.advanceTimersByTimeAsync(1_000);

    expect(await minting).toMatchObject({ name: "SelfHostedEndpointError", reason: "timeout" });
    expect(page.posted).toEqual([]);
    expect(page.popups.map((popup) => popup.closed)).toEqual([true]);
  });

  it("reads an answer only from the popup, at the endpoint's origin, for this mint's id", async () => {
    vi.useFakeTimers();
    const page = fakeWindows({ answer: () => null });
    const minting = source(page.windows).mint("sk-user");
    await vi.advanceTimersByTimeAsync(0);
    const id = page.posted[0]?.data.id;
    const minted = (value: string, mintId: unknown) => ({
      type: SELF_HOSTED_MESSAGES.minted,
      version: SELF_HOSTED_VERSION,
      id: mintId,
      value,
      expiresAt: EXPIRES,
    });

    page.deliver({ origin: "https://elsewhere.example.net", fromPopup: true, data: minted("ek_wrong_origin", id) });
    page.deliver({ origin: ENDPOINT_ORIGIN, fromPopup: false, data: minted("ek_wrong_window", id) });
    page.deliver({ origin: ENDPOINT_ORIGIN, fromPopup: true, data: minted("ek_wrong_id", "mint-earlier") });
    page.deliver({ origin: ENDPOINT_ORIGIN, fromPopup: true, data: "not an object" });
    page.deliver({ origin: ENDPOINT_ORIGIN, fromPopup: true, data: minted("ek_right", id) });

    expect(await minting).toEqual({ value: "ek_right", expiresAt: EXPIRES });
  });

  it("posts the key only once, though the page says ready twice", async () => {
    vi.useFakeTimers();
    const page = fakeWindows({ answer: () => null });
    void failureOf(source(page.windows, { timeoutMs: 1_000 }).mint("sk-user"));
    await vi.advanceTimersByTimeAsync(0);

    page.deliver({ origin: ENDPOINT_ORIGIN, fromPopup: true, data: { type: SELF_HOSTED_MESSAGES.ready, version: SELF_HOSTED_VERSION } });

    expect(page.posted).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_000);
  });

  it("fails as blocked when the browser opens no popup", async () => {
    const page = fakeWindows({ blocked: true });

    const failure = await failureOf(source(page.windows).mint("sk-user"));

    expect(failure).toMatchObject({ name: "SelfHostedEndpointError", reason: "blocked" });
    expect(page.posted).toEqual([]);
  });

  it("fails as closed soon after the user closes the popup, once it has been seen closed twice running", async () => {
    vi.useFakeTimers();
    const page = fakeWindows({ ready: false });
    let failure: unknown = null;
    void failureOf(source(page.windows, { timeoutMs: 30_000 }).mint("sk-user")).then((error) => {
      failure = error;
    });
    const popup = page.popups[0];
    if (popup === undefined) throw new Error("no popup");

    popup.closed = true;
    await vi.advanceTimersByTimeAsync(250);
    expect(failure).toBeNull();
    await vi.advanceTimersByTimeAsync(250);

    expect(failure).toMatchObject({ name: "SelfHostedEndpointError", reason: "closed" });
  });

  it("still takes the answer when the page closes itself a moment before its answer is delivered", async () => {
    vi.useFakeTimers();
    const page = fakeWindows({ answer: () => null });
    const minting = source(page.windows).mint("sk-user");
    await vi.advanceTimersByTimeAsync(0);
    const id = page.posted[0]?.data.id;
    const popup = page.popups[0];
    if (popup === undefined) throw new Error("no popup");

    // The page posts and closes itself; this side reads it closed on one look before the message arrives.
    popup.closed = true;
    await vi.advanceTimersByTimeAsync(250);
    page.deliver({
      origin: ENDPOINT_ORIGIN,
      fromPopup: true,
      data: { type: SELF_HOSTED_MESSAGES.minted, version: SELF_HOSTED_VERSION, id, value: "ek_late", expiresAt: EXPIRES },
    });

    expect(await minting).toEqual({ value: "ek_late", expiresAt: EXPIRES });
  });

  it.each([
    ["invalid-key", "InvalidApiKeyError"],
    ["missing-key", "InvalidApiKeyError"],
    ["rate-limited", "RateLimitError"],
    ["upstream", "ProviderUnavailableError"],
  ])("names the page's %s refusal as the route's would be named, %s", async (code, name) => {
    const page = fakeWindows({ answer: (mint) => ({ type: SELF_HOSTED_MESSAGES.refused, version: SELF_HOSTED_VERSION, id: mint.id, error: code }) });

    expect(await failureOf(source(page.windows).mint("sk-user"))).toMatchObject({ name });
  });

  it.each([["forbidden-origin"], [""]])("names a refusal of the page's own, %j, as the endpoint's", async (code) => {
    const page = fakeWindows({ answer: (mint) => ({ type: SELF_HOSTED_MESSAGES.refused, version: SELF_HOSTED_VERSION, id: mint.id, error: code }) });

    expect(await failureOf(source(page.windows).mint("sk-user"))).toMatchObject({ name: "SelfHostedEndpointError", reason: "refused" });
  });

  it("refuses an answer that is not a secret and its expiry", async () => {
    const page = fakeWindows({
      answer: (mint) => ({ type: SELF_HOSTED_MESSAGES.minted, version: SELF_HOSTED_VERSION, id: mint.id, value: "ek_1", expiresAt: "soon" }),
    });

    expect(await failureOf(source(page.windows).mint("sk-user"))).toMatchObject({ name: "SelfHostedEndpointError", reason: "malformed" });
  });

  it("keeps only the secret and its expiry from the page's answer", async () => {
    const page = fakeWindows({
      answer: (mint) => ({ type: SELF_HOSTED_MESSAGES.minted, version: SELF_HOSTED_VERSION, id: mint.id, value: "ek_1", expiresAt: EXPIRES, key: "sk-echo" }),
    });

    expect(await source(page.windows).mint("sk-user")).toEqual({ value: "ek_1", expiresAt: EXPIRES });
  });

  it("closes the popup and fails when the dial is cancelled, before or after it opens", async () => {
    const page = fakeWindows({ ready: false });
    const dial = new AbortController();
    const minting = failureOf(source(page.windows, { signal: dial.signal }).mint("sk-user"));

    dial.abort();

    expect(await minting).toMatchObject({ name: "SelfHostedEndpointError", reason: "closed" });
    expect(page.popups.map((popup) => popup.closed)).toEqual([true]);

    const cancelled = new AbortController();
    cancelled.abort();
    expect(await failureOf(source(fakeWindows().windows, { signal: cancelled.signal }).mint("sk-user"))).toMatchObject({ reason: "closed" });
  });

  it("closes a popup opened for a mint that never came, and posts nothing to it", async () => {
    const page = fakeWindows();
    const secrets = source(page.windows);
    secrets.open();

    secrets.cancel();
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(page.popups.map((popup) => popup.closed)).toEqual([true]);
    expect(page.posted).toEqual([]);
    expect(page.listening()).toBe(0);
  });

  it("after a cancel, refuses every mint without opening a window, so no popup appears for a session that is over", async () => {
    const page = fakeWindows();
    const secrets = source(page.windows);
    secrets.open();

    secrets.cancel();
    secrets.open();
    const failure = await failureOf(secrets.mint("sk-user"));

    expect(failure).toMatchObject({ name: "SelfHostedEndpointError", reason: "closed" });
    expect(page.opened).toEqual([ENDPOINT]);
    expect(page.posted).toEqual([]);
  });

  it("abandons a mint in flight on a cancel: its popup closes and its key is never posted", async () => {
    vi.useFakeTimers();
    const page = fakeWindows({ ready: false });
    const secrets = source(page.windows);
    const minting = failureOf(secrets.mint("sk-user"));

    secrets.cancel();

    expect(await minting).toMatchObject({ name: "SelfHostedEndpointError", reason: "closed" });
    expect(page.popups.map((popup) => popup.closed)).toEqual([true]);
    page.deliver({ origin: ENDPOINT_ORIGIN, fromPopup: true, data: { type: SELF_HOSTED_MESSAGES.ready, version: SELF_HOSTED_VERSION } });
    expect(page.posted).toEqual([]);
  });

  it("does nothing on a cancel with no popup open", () => {
    const page = fakeWindows();

    source(page.windows).cancel();

    expect(page.opened).toEqual([]);
  });

  it("keeps the key out of every error it gives", async () => {
    vi.useFakeTimers();
    const page = fakeWindows({ answer: () => null });
    const minting = failureOf(source(page.windows, { timeoutMs: 1_000 }).mint("sk-secret-in-flight"));

    await vi.advanceTimersByTimeAsync(1_000);
    const failure = await minting;

    expect(String((failure as Error).message)).not.toContain("sk-secret-in-flight");
    expect(JSON.stringify(failure)).not.toContain("sk-secret-in-flight");
  });
});

describe("browserEndpointWindows", () => {
  type Listener = (event: MessageEvent) => void;

  const host = (opened: Window | null) => {
    const listeners = new Set<Listener>();
    const calls: unknown[][] = [];
    const page: EndpointWindowHost = {
      open: (...args) => {
        calls.push(args);
        return opened;
      },
      addEventListener: (_type, listener) => listeners.add(listener),
      removeEventListener: (_type, listener) => listeners.delete(listener),
    };
    const fire = (event: Partial<MessageEvent>) => {
      for (const listener of listeners) listener(event as MessageEvent);
    };
    return { page, calls, fire, listeners };
  };

  const fakeWindow = () => {
    const sent: unknown[][] = [];
    const win = {
      closed: false,
      postMessage: (...args: unknown[]) => sent.push(args),
      close: () => {
        win.closed = true;
      },
    };
    return { win, asWindow: win as unknown as Window, sent };
  };

  it("opens a new popup each time, never a named one a stale popup could share, and it keeps its opener", () => {
    const { asWindow } = fakeWindow();
    const { page, calls } = host(asWindow);

    expect(browserEndpointWindows(page).open(ENDPOINT)).not.toBeNull();
    expect(calls).toEqual([[ENDPOINT, "_blank", "popup,width=480,height=400"]]);
    expect(String(calls[0]?.[2])).not.toContain("noopener");
  });

  it("answers null when the browser blocks the popup", () => {
    expect(browserEndpointWindows(host(null).page).open(ENDPOINT)).toBeNull();
  });

  it("posts to the popup at the origin asked for, and reads and closes it", () => {
    const { win, asWindow, sent } = fakeWindow();
    const popup = browserEndpointWindows(host(asWindow).page).open(ENDPOINT);
    if (popup === null) throw new Error("no popup");

    popup.post({ a: 1 }, ENDPOINT_ORIGIN);
    expect(sent).toEqual([[{ a: 1 }, ENDPOINT_ORIGIN]]);
    expect(popup.closed()).toBe(false);

    popup.close();

    expect(win.closed).toBe(true);
    expect(popup.closed()).toBe(true);
  });

  it("marks a message as the popup's by the window that sent it, and stops hearing on stop", () => {
    const { asWindow } = fakeWindow();
    const other = fakeWindow().asWindow;
    const { page, fire, listeners } = host(asWindow);
    const windows = browserEndpointWindows(page);
    const popup = windows.open(ENDPOINT);
    if (popup === null) throw new Error("no popup");
    const heard: EndpointMessage[] = [];

    const stop = windows.listen(popup, (message) => heard.push(message));
    fire({ origin: ENDPOINT_ORIGIN, source: asWindow, data: { n: 1 } });
    fire({ origin: ENDPOINT_ORIGIN, source: other, data: { n: 2 } });
    stop();
    fire({ origin: ENDPOINT_ORIGIN, source: asWindow, data: { n: 3 } });

    expect(heard).toEqual([
      { origin: ENDPOINT_ORIGIN, fromPopup: true, data: { n: 1 } },
      { origin: ENDPOINT_ORIGIN, fromPopup: false, data: { n: 2 } },
    ]);
    expect(listeners.size).toBe(0);
  });

  it("never marks a message as from a popup it did not open", () => {
    const { page, fire } = host(null);
    const windows = browserEndpointWindows(page);
    const stranger: EndpointPopup = { post: () => undefined, closed: () => false, close: () => undefined };
    const heard: EndpointMessage[] = [];

    windows.listen(stranger, (message) => heard.push(message));
    fire({ origin: ENDPOINT_ORIGIN, source: null, data: {} });

    expect(heard).toEqual([{ origin: ENDPOINT_ORIGIN, fromPopup: false, data: {} }]);
  });
});

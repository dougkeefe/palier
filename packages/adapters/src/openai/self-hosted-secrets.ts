import type { RealtimeSecret, RealtimeSecretSource } from "@palier/app";

import { SelfHostedEndpointError } from "./errors.js";
import { realtimeRefusal } from "./route-realtime-secrets.js";

/**
 * The message protocol between Palier and the user's own secret endpoint (ADR 3's self-hosted escape,
 * architecture.md §6.3, progress.md D165, D192). The repository's `selfhost/` Worker and function speak the
 * other side, and a test holds both to these names.
 *
 * 1. The endpoint's page, opened by Palier in a popup, says `ready` to its opener, at the one origin it was
 *    deployed for.
 * 2. Palier, hearing `ready` from that popup at the endpoint's origin, posts `mint` with the key, the model
 *    and the voice, **to that origin only**, so a popup that navigated anywhere else never receives it.
 * 3. The page mints on its own origin and answers `minted` with the secret, or `refused` with the route's
 *    code, then closes itself.
 */
export const SELF_HOSTED_MESSAGES = {
  ready: "palier-realtime-secret:ready",
  mint: "palier-realtime-secret:mint",
  minted: "palier-realtime-secret:minted",
  refused: "palier-realtime-secret:refused",
} as const;

/** The protocol's version, in every message, so a page from a later repository can refuse an old Palier. */
export const SELF_HOSTED_VERSION = 1;

/**
 * Long enough for the page to load and mint on a slow connection, and short enough that a popup nobody
 * answers does not hold the dial. An operational limit, not an exam rule.
 */
const DEFAULT_TIMEOUT_MS = 30_000;
/**
 * How often the popup is looked at, so one the user closed fails soon, not at the timeout. It must be seen closed on
 * two looks running: the page closes itself right after posting its answer, and a popup in another process can read
 * as closed a moment before that answer is delivered here.
 */
const CLOSED_POLL_MS = 250;

/** A message this page received, as the browser delivered it. */
export type EndpointMessage = {
  readonly origin: string;
  /** Whether it came from the popup the source opened, and not another window. */
  readonly fromPopup: boolean;
  readonly data: unknown;
};

/** The popup, as the source sees it: no `Window` type crosses the seam. */
export type EndpointPopup = {
  /** Post to the popup, delivered only if its document is at `targetOrigin`. */
  readonly post: (data: unknown, targetOrigin: string) => void;
  readonly closed: () => boolean;
  readonly close: () => void;
};

/** The browser's windows, behind a seam, so the protocol is tested without one (`browserEndpointWindows`). */
export type EndpointWindows = {
  /** Open `url` in a popup, or `null` when the browser refused. Only works inside the user's gesture. */
  readonly open: (url: string) => EndpointPopup | null;
  /** Hear the messages this page receives, each marked with whether `popup` sent it. Answers a stop. */
  readonly listen: (popup: EndpointPopup, handler: (message: EndpointMessage) => void) => () => void;
};

export type SelfHostedRealtimeSecretsConfig = {
  /** The user's endpoint, as `@palier/app`'s `parseRealtimeEndpoint` kept it. */
  readonly endpoint: string;
  /** The Realtime model and voice, from `ai-models.json`: the endpoint mints what Palier's route would. */
  readonly model: string;
  readonly voice: string;
  readonly windows: EndpointWindows;
  /** Abandons the popup: the dial was cancelled (D185). */
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  /** A fresh id per mint, so a late answer to an earlier one is never read as this one's. */
  readonly newId?: () => string;
};

/**
 * The self-hosted source, with the step a popup needs: `open` must run inside the tap that starts the session,
 * because a browser opens a popup only from a user's gesture, and the mint after it waits on the vault.
 */
export type SelfHostedRealtimeSecrets = RealtimeSecretSource & {
  /** Open the endpoint's popup now, for the next `mint`. Call it synchronously in the tap's handler. */
  readonly open: () => void;
  /**
   * The session failed: close the popup opened for it, abandon a mint in flight, and refuse every later mint without
   * opening anything, so no window the user did not tap for is opened and no key is posted for a session that is over.
   */
  readonly cancel: () => void;
};

type Pending = {
  readonly popup: EndpointPopup | null;
  readonly settle: (key: string) => Promise<RealtimeSecret>;
  readonly abandon: () => void;
};

const recordOf = (data: unknown): Record<string, unknown> | null =>
  typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;

/** The page's answer, structure-checked at the edge (D55): a secret and its expiry, or a refusal's code. */
const answerOf = (data: Record<string, unknown>): RealtimeSecret | Error => {
  if (data.type === SELF_HOSTED_MESSAGES.refused) {
    const code = typeof data.error === "string" ? data.error : "";
    return realtimeRefusal(code) ?? new SelfHostedEndpointError("refused", `the endpoint refused: ${code || "no code"}.`);
  }
  const { value, expiresAt } = data;
  if (typeof value !== "string" || value === "" || typeof expiresAt !== "string" || Number.isNaN(Date.parse(expiresAt))) {
    return new SelfHostedEndpointError("malformed", "the endpoint's answer was not a secret.");
  }
  return { value, expiresAt };
};

/**
 * The third `RealtimeSecretSource` (ADR 3, architecture.md §6.3, progress.md D192): the user's own endpoint, so
 * the key never reaches Palier's route. **Not a `fetch`**: the strict CSP's `connect-src` is this origin and
 * OpenAI for everyone (D133), and a user's endpoint is known only to their browser. So Palier opens it in a
 * popup and passes the key by `postMessage`, which is not a connection and leaves the policy unchanged (D165).
 *
 * - **The key is posted only after the endpoint's page said `ready`**, from the popup Palier opened and from the
 *   endpoint's origin, and only **to** that origin: a popup redirected anywhere else never receives it.
 * - **The answer is read only from that popup and that origin**, for this mint's id.
 * - **A popup the browser blocked, the user closed, or that never answers** fails with `SelfHostedEndpointError`,
 *   by its reason; the page's refusals are the route's codes, so the screen names them in the same words.
 * - **A reconnect mints with no gesture**, so the browser may block its popup. The transport then closes
 *   `failed` with every turn kept, as exit criterion 2 allows.
 * - It holds the key only as an argument, for one message.
 */
export const selfHostedRealtimeSecrets = (config: SelfHostedRealtimeSecretsConfig): SelfHostedRealtimeSecrets => {
  const origin = new URL(config.endpoint).origin;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const newId = config.newId ?? (() => globalThis.crypto.randomUUID());
  let prepared: Pending | null = null;

  /** Open the popup and listen for its page at once, so a fast `ready` is never missed. */
  const begin = (): Pending => {
    const popup = config.windows.open(config.endpoint);
    if (popup === null) {
      return {
        popup,
        settle: () => Promise.reject(new SelfHostedEndpointError("blocked", "the browser blocked the endpoint's window.")),
        abandon: () => undefined,
      };
    }
    let ready = false;
    let key: string | null = null;
    let id: string | null = null;
    let done = false;
    let resolveAnswer: (secret: RealtimeSecret) => void = () => undefined;
    let rejectAnswer: (error: Error) => void = () => undefined;
    const answer = new Promise<RealtimeSecret>((resolve, reject) => {
      resolveAnswer = resolve;
      rejectAnswer = reject;
    });
    // Nothing may be left unhandled if the mint never comes: `settle` returns the promise itself.
    answer.catch(() => undefined);

    const postKey = (): void => {
      if (!ready || key === null || id !== null) return;
      id = newId();
      popup.post(
        { type: SELF_HOSTED_MESSAGES.mint, version: SELF_HOSTED_VERSION, id, key, model: config.model, voice: config.voice },
        origin,
      );
      key = null;
    };
    const finish = (outcome: RealtimeSecret | Error): void => {
      if (done) return;
      done = true;
      key = null;
      stop();
      clearInterval(poll);
      clearTimeout(timer);
      config.signal?.removeEventListener("abort", onAbort);
      popup.close();
      if (outcome instanceof Error) rejectAnswer(outcome);
      else resolveAnswer(outcome);
    };
    const stop = config.windows.listen(popup, (message) => {
      if (!message.fromPopup || message.origin !== origin) return;
      const data = recordOf(message.data);
      if (data === null || data.version !== SELF_HOSTED_VERSION) return;
      if (data.type === SELF_HOSTED_MESSAGES.ready) {
        ready = true;
        postKey();
        return;
      }
      if (id === null || data.id !== id) return;
      if (data.type === SELF_HOSTED_MESSAGES.minted || data.type === SELF_HOSTED_MESSAGES.refused) finish(answerOf(data));
    });
    let seenClosed = false;
    const poll = setInterval(() => {
      const closed = popup.closed();
      if (closed && seenClosed) finish(new SelfHostedEndpointError("closed", "the endpoint's window was closed."));
      seenClosed = closed;
    }, CLOSED_POLL_MS);
    const timer = setTimeout(() => {
      finish(new SelfHostedEndpointError("timeout", "the endpoint did not answer in time."));
    }, timeoutMs);
    const onAbort = (): void => {
      finish(new SelfHostedEndpointError("closed", "the dial was cancelled."));
    };
    config.signal?.addEventListener("abort", onAbort);
    if (config.signal?.aborted === true) onAbort();

    return {
      popup,
      settle: (apiKey) => {
        key = done ? null : apiKey;
        postKey();
        return answer;
      },
      abandon: () => {
        finish(new SelfHostedEndpointError("closed", "the session ended before the mint."));
      },
    };
  };

  let cancelled = false;
  const inFlight = new Set<Pending>();

  return {
    open: () => {
      if (!cancelled) prepared ??= begin();
    },
    cancel: () => {
      cancelled = true;
      prepared?.abandon();
      prepared = null;
      for (const pending of inFlight) pending.abandon();
      inFlight.clear();
    },
    mint: (apiKey) => {
      if (cancelled) return Promise.reject(new SelfHostedEndpointError("closed", "the session ended before the mint."));
      const pending = prepared ?? begin();
      prepared = null;
      inFlight.add(pending);
      const settled = pending.settle(apiKey);
      const done = (): void => {
        inFlight.delete(pending);
      };
      settled.then(done, done);
      return settled;
    },
  };
};

/** What `browserEndpointWindows` needs of the page: `window`, in the browser. */
export type EndpointWindowHost = {
  readonly open: (url: string, target: string, features: string) => Window | null;
  readonly addEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
  readonly removeEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
};

/** A popup, not a tab where the browser allows the choice; small, since its page only says what it is doing. */
const POPUP_FEATURES = "popup,width=480,height=400";

/**
 * The browser's `EndpointWindows` (D192): `window.open` for the popup, **without `noopener`**, since the page
 * there must post back to its opener, and the page's `message` events, each compared with the popup by
 * identity. Palier sends no `Cross-Origin-Opener-Policy`, which would sever the two. Each popup is a new window
 * (`_blank`): a named one would be reused, so a stale popup's end could close a newer session's.
 */
export const browserEndpointWindows = (host: EndpointWindowHost = window): EndpointWindows => {
  const raw = new WeakMap<EndpointPopup, Window>();
  return {
    open: (url) => {
      const opened = host.open(url, "_blank", POPUP_FEATURES);
      if (opened === null) return null;
      const popup: EndpointPopup = {
        post: (data, targetOrigin) => {
          opened.postMessage(data, targetOrigin);
        },
        closed: () => opened.closed,
        close: () => {
          opened.close();
        },
      };
      raw.set(popup, opened);
      return popup;
    },
    listen: (popup, handler) => {
      const opened = raw.get(popup);
      const listener = (event: MessageEvent): void => {
        handler({ origin: event.origin, fromPopup: opened !== undefined && event.source === opened, data: event.data as unknown });
      };
      host.addEventListener("message", listener);
      return () => {
        host.removeEventListener("message", listener);
      };
    },
  };
};

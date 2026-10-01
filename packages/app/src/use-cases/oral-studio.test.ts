import { describe, expect, it, vi } from "vitest";

import type { CostLedger, OralTransportEvent, RealtimeSecretSource } from "../ports/index.js";
import { NoApiKeyError } from "./api-key.js";
import { UnknownScenarioError } from "./oral.js";
import {
  SCENARIO,
  SESSION_ID,
  handTransport,
  liveSessions,
  oralStore,
  scenarioBank,
  settableClock,
  vaultWith,
} from "./__tests__/oral-fakes.js";
import { costLedger } from "./__tests__/spend-fakes.js";
import type { StudioTransport, StudioTransportHooks } from "./oral-studio.js";
import { startOralStudioRun } from "./oral-studio.js";

const MIN = 60_000;
const request = { sessionId: SESSION_ID, scenarioId: SCENARIO.id };
const SECRET = { value: "ek_test_1", expiresAt: "2026-09-27T10:01:00.000Z" };

/** A secret source that records the keys it was handed, as the route's would. */
const secretSource = (): RealtimeSecretSource & { readonly keys: string[] } => {
  const keys: string[] = [];
  return {
    keys,
    mint: (key) => {
      keys.push(key);
      return Promise.resolve(SECRET);
    },
  };
};

/**
 * A studio transport still dialling, as the realtime one is between `open` and its channel opening: `open` waits
 * until the call connects or is closed, and a transport closed before `open` refuses to open.
 */
const dialler = () => {
  let sink: ((event: OralTransportEvent) => void) | null = null;
  let connected: (() => void) | null = null;
  let closed = false;
  let closes = 0;
  const transport: StudioTransport = {
    open: (_request, listener) => {
      if (closed) return Promise.reject(new Error("A realtime transport opens once."));
      sink = listener;
      return new Promise<void>((resolve) => {
        connected = resolve;
      });
    },
    direct: () => Promise.resolve(),
    close: () => {
      closes += 1;
      closed = true;
      sink?.({ kind: "closed", failed: false });
      connected?.();
      return Promise.resolve();
    },
    lastError: () => null,
    repeat: () => Promise.resolve(),
  };
  return { transport, dialling: () => sink !== null, closes: () => closes };
};

const setUp = (options: { key?: string | null; ledger?: CostLedger } = {}) => {
  const clock = settableClock();
  const hand = handTransport();
  const secrets = secretSource();
  const ledger = costLedger();
  let hooks: StudioTransportHooks | null = null;
  let repeats = 0;
  const lastError = new Error("the far end dropped");
  const deps = {
    vault: vaultWith(options.key === undefined ? "sk-test" : options.key),
    secrets,
    studioTransport: (given: StudioTransportHooks) => {
      hooks = given;
      return {
        ...hand.transport,
        lastError: () => lastError,
        repeat: () => {
          repeats += 1;
          return Promise.resolve();
        },
      };
    },
    ledger: options.ledger ?? ledger,
    clock,
    items: scenarioBank(),
    oral: oralStore(),
    liveness: liveSessions(),
    capMs: 25 * MIN,
  };
  const hooked = (): StudioTransportHooks => {
    if (hooks === null) throw new Error("the transport was never made");
    return hooks;
  };
  return { clock, hand, secrets, ledger, deps, hooked, lastError, repeats: () => repeats };
};

describe("startOralStudioRun (D165, D169)", () => {
  it("mints a secret with the held key, and hands the transport the secret, never the key", async () => {
    const { secrets, deps, hooked } = setUp();
    await startOralStudioRun(request, deps);

    expect(await hooked().secret()).toEqual(SECRET);
    expect(secrets.keys).toEqual(["sk-test"]);
  });

  it("mints the first secret at the start, before the transport asks, and a fresh one for a reconnect (D190)", async () => {
    const { secrets, deps, hooked } = setUp();
    await startOralStudioRun(request, deps);

    // The memory transport never dials, so this mint is the one asked for at the tap.
    await vi.waitFor(() => {
      expect(secrets.keys).toEqual(["sk-test"]);
    });
    expect(await hooked().secret()).toEqual(SECRET);
    expect(secrets.keys).toEqual(["sk-test"]);
    expect(await hooked().secret()).toEqual(SECRET);
    expect(secrets.keys).toEqual(["sk-test", "sk-test"]);
  });

  it("mints nothing when its signal was aborted before it began", async () => {
    const { secrets, deps } = setUp();
    const abort = new AbortController();
    abort.abort();

    await expect(startOralStudioRun(request, { ...deps, studioTransport: () => dialler().transport }, abort.signal)).rejects.toThrow();
    expect(secrets.keys).toEqual([]);
  });

  it("fails as the session's own setup failed, not as the early secret did, when the session cannot start", async () => {
    const { deps } = setUp({ key: null });

    await expect(startOralStudioRun({ ...request, scenarioId: "absent" as never }, deps)).rejects.toThrow(
      UnknownScenarioError,
    );
  });

  it("names a missing key and mints nothing", async () => {
    const { secrets, deps, hooked } = setUp({ key: null });
    await startOralStudioRun(request, deps);

    await expect(hooked().secret()).rejects.toThrow(NoApiKeyError);
    expect(secrets.keys).toEqual([]);
  });

  it("records each response's usage as oral-studio, under the session, before `ended` settles (D125)", async () => {
    const { clock, hand, ledger, deps, hooked } = setUp();
    const run = await startOralStudioRun(request, deps);
    clock.at(1);
    hooked().usage({ model: "rt", inputTokens: 900, outputTokens: 400, costUsd: 0.05 });
    hooked().usage({ model: "stt", inputTokens: 0, outputTokens: 0, audioSeconds: 12 });
    hand.hangUp(false);
    await run.ended;

    expect(ledger.entries()).toEqual([
      { ts: "2026-09-27T10:01:00.000Z", feature: "oral-studio", model: "rt", inputTokens: 900, outputTokens: 400, costUsd: 0.05, sessionId: SESSION_ID },
      { ts: "2026-09-27T10:01:00.000Z", feature: "oral-studio", model: "stt", inputTokens: 0, outputTokens: 0, costUsd: null, sessionId: SESSION_ID },
    ]);
  });

  it("still ends the session when the ledger cannot record a usage", async () => {
    const broken: CostLedger = {
      append: () => Promise.reject(new Error("the disk is full")),
      since: () => Promise.resolve([]),
      clear: () => Promise.resolve(),
    };
    const { hand, deps, hooked } = setUp({ ledger: broken });
    const run = await startOralStudioRun(request, deps);
    hooked().usage({ model: "rt", inputTokens: 1, outputTokens: 1 });
    hand.hangUp(false);

    expect((await run.ended).endReason).toBe("transport-closed");
  });

  it("ends the session at studio mode's cap as time-cap (D166)", async () => {
    const { clock, deps } = setUp();
    const run = await startOralStudioRun(request, { ...deps, capMs: 8 * MIN });
    clock.at(8);
    await run.tick();

    expect((await run.ended).endReason).toBe("time-cap");
  });

  it("stores the session as held in studio mode (D181)", async () => {
    const { hand, deps } = setUp();
    const run = await startOralStudioRun(request, deps);
    expect((await deps.oral.get(SESSION_ID))?.mode).toBe("studio");
    hand.hangUp(false);

    expect((await run.ended).mode).toBe("studio");
  });

  it("asks the transport to repeat when the candidate does (D180)", async () => {
    const { deps, repeats } = setUp();
    const run = await startOralStudioRun(request, deps);
    await run.repeat();

    expect(repeats()).toBe(1);
  });

  it("closes a call still dialling when its signal is aborted, and the session ends (D185)", async () => {
    const { deps } = setUp();
    const dial = dialler();
    const abort = new AbortController();
    const starting = startOralStudioRun(request, { ...deps, studioTransport: () => dial.transport }, abort.signal);
    await vi.waitFor(() => {
      expect(dial.dialling()).toBe(true);
    });
    abort.abort();
    // The abort closed it; the driver may close it again on hearing `closed`, which a real transport ignores.
    expect(dial.closes()).toBeGreaterThan(0);
    const run = await starting;
    expect((await run.ended).endReason).toBe("transport-closed");
  });

  it("never dials when its signal was aborted before it began", async () => {
    const { deps } = setUp();
    const dial = dialler();
    const abort = new AbortController();
    abort.abort();

    await expect(startOralStudioRun(request, { ...deps, studioTransport: () => dial.transport }, abort.signal)).rejects.toThrow("opens once");
    expect(dial.closes()).toBe(1);
    expect(dial.dialling()).toBe(false);
  });

  it("names the transport's failure, as the practice run does", async () => {
    const { deps, lastError } = setUp();
    const run = await startOralStudioRun(request, deps);

    expect(run.failure()).toBe(lastError);
  });
});

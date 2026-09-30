import { describe, expect, it } from "vitest";

import type { CostLedger, RealtimeSecretSource } from "../ports/index.js";
import { NoApiKeyError } from "./api-key.js";
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
import type { StudioTransportHooks } from "./oral-studio.js";
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

const setUp = (options: { key?: string | null; ledger?: CostLedger } = {}) => {
  const clock = settableClock();
  const hand = handTransport();
  const secrets = secretSource();
  const ledger = options.ledger ?? costLedger();
  let hooks: StudioTransportHooks | null = null;
  const lastError = new Error("the far end dropped");
  const deps = {
    vault: vaultWith(options.key === undefined ? "sk-test" : options.key),
    secrets,
    studioTransport: (given: StudioTransportHooks) => {
      hooks = given;
      return { ...hand.transport, lastError: () => lastError };
    },
    ledger,
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
  return { clock, hand, secrets, ledger, deps, hooked, lastError };
};

describe("startOralStudioRun (D165, D169)", () => {
  it("mints a secret with the held key, and hands the transport the secret, never the key", async () => {
    const { secrets, deps, hooked } = setUp();
    await startOralStudioRun(request, deps);

    expect(await hooked().secret()).toEqual(SECRET);
    expect(secrets.keys).toEqual(["sk-test"]);
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

  it("names the transport's failure, as the practice run does", async () => {
    const { deps, lastError } = setUp();
    const run = await startOralStudioRun(request, deps);

    expect(run.failure()).toBe(lastError);
  });
});

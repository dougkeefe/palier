import type { Clock, SyncTransport } from "@palier/app";
import { describe, expect, it } from "vitest";

import { memorySyncServer } from "../memory/index.js";
import { psc } from "./__tests__/profile.js";
import { RELIABLE } from "./network.js";
import { memorySimulatedServer, runSyncSimulation } from "./run.js";
import { REGRESSION_SEEDS, SEEDS_PER_LANE, simulationSeeds } from "./seeds.js";

/**
 * The fast lane's share of the sync simulator (§6.2 tier 5): a handful of seeds, the
 * regression seeds, and proof that the checks bite. The medium and nightly lanes run
 * the same simulation over many more seeds (`simulator.integration.test.ts`).
 */

const run = (seed: number, devices: 2 | 3) =>
  runSyncSimulation({ seed, devices, profile: psc, server: memorySimulatedServer() });

/** A server that acknowledges one attempt push and silently never stores it. */
const losingOneWrite = (clock: Clock) => {
  const server = memorySyncServer({ clock });
  let lost = false;
  return {
    transport: (secret: string): SyncTransport => {
      const transport = server.transport(secret);
      return {
        ...transport,
        push: async (items) => {
          const victim = lost ? undefined : items.find((i) => i.type === "attempt");
          if (victim === undefined) return transport.push(items);
          lost = true;
          const result = await transport.push(items.filter((i) => i !== victim));
          return { ...result, accepted: [...result.accepted, { type: victim.type, id: victim.id, revision: 1_000_000 }] };
        },
      };
    },
  };
};

/** A server whose every pull brings a newer copy of one setting, so no sync is ever quiet. */
const neverSettling = (clock: Clock) => {
  const server = memorySyncServer({ clock });
  let revision = 1_000_000;
  return {
    transport: (secret: string): SyncTransport => {
      const transport = server.transport(secret);
      return {
        ...transport,
        pull: async (watermark) => {
          const page = await transport.pull(watermark);
          revision++;
          return { ...page, docs: [...page.docs, { type: "setting", id: "churn", revision, payload: { key: "churn", value: revision } }] };
        },
      };
    },
  };
};

/** A server with a defect: asking it for a pairing code throws something no network does. */
const brokenPairing = (clock: Clock) => {
  const server = memorySyncServer({ clock });
  return {
    transport: (secret: string): SyncTransport => ({
      ...server.transport(secret),
      requestPairCode: () => Promise.reject(new Error("defect in pairing")),
    }),
  };
};

describe("runSyncSimulation", () => {
  it.each(simulationSeeds(SEEDS_PER_LANE.fast))("converges two devices with every property held, seed %i", async (seed) => {
    expect((await run(seed, 2)).violations).toEqual([]);
  });

  it.each(simulationSeeds(SEEDS_PER_LANE.fast))("converges three devices with every property held, seed %i", async (seed) => {
    expect((await run(seed, 3)).violations).toEqual([]);
  });

  it.each(REGRESSION_SEEDS)("holds on regression seed $seed ($devices devices)", async ({ seed, devices }) => {
    expect((await run(seed, devices)).violations).toEqual([]);
  });

  it("replays a seed exactly", async () => {
    expect((await run(5, 3)).trace).toEqual((await run(5, 3)).trace);
  });

  it("reports lost attempts when two devices mint ids from one stream (the D71 collision)", async () => {
    const report = await runSyncSimulation({ seed: 1, devices: 2, profile: psc, server: memorySimulatedServer(), idSpacing: 1 });

    expect(report.violations.map((v) => v.check)).toContain("lost-attempt");
  });

  it("reports a lost attempt when the server acknowledges a write it never stored", async () => {
    const report = await runSyncSimulation({ seed: 1, devices: 2, profile: psc, server: losingOneWrite, faults: RELIABLE });

    expect(report.violations.map((v) => v.check)).toContain("lost-attempt");
  });

  it("reports devices that never settle, rather than syncing forever", async () => {
    const report = await runSyncSimulation({ seed: 1, devices: 3, profile: psc, server: neverSettling, faults: RELIABLE });

    expect(report.violations.map((v) => `${v.check} ${v.device}`)).toEqual(
      expect.arrayContaining(["no-quiescence all", "no-quiescence home"]),
    );
  });

  it("raises a defect in the code under test, instead of logging it as a failure a user would see", async () => {
    await expect(
      runSyncSimulation({ seed: 1, devices: 2, profile: psc, server: brokenPairing, faults: RELIABLE }),
    ).rejects.toThrow("defect in pairing");
  });
});

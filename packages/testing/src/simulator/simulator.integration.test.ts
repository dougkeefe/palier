import { describe, expect, it } from "vitest";

import { psc } from "./__tests__/profile.js";
import { memorySimulatedServer, runSyncSimulation } from "./run.js";
import { SEEDS_PER_LANE, simulationSeeds } from "./seeds.js";

/**
 * The sync simulator at volume (implementation-plan.md §6.2 tier 5, §6.5): a few hundred
 * seeds in the medium lane, many thousands nightly, alternating two and three devices.
 * `PALIER_SIM_SEEDS` overrides the count for a local run.
 */
const count = Number(process.env.PALIER_SIM_SEEDS ?? SEEDS_PER_LANE[process.env.CI_LANE === "nightly" ? "nightly" : "medium"]);

describe("sync simulator over the in-memory server", () => {
  it(`holds every convergence property on ${String(count)} seeds`, async () => {
    const failing: string[] = [];
    for (const seed of simulationSeeds(count)) {
      const devices = seed % 2 === 0 ? 2 : 3;
      const { violations } = await runSyncSimulation({ seed, devices, profile: psc, server: memorySimulatedServer() });
      for (const v of violations) failing.push(`seed ${String(seed)} (${String(devices)} devices): ${v.check} on ${v.device}, ${v.detail}`);
    }

    expect(failing).toEqual([]);
  }, 0);
});

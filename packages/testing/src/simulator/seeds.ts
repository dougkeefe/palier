/**
 * How many seeds each CI lane runs (implementation-plan.md §6.5: "sync simulation with a
 * few hundred seeds" in medium, "at scale" nightly), and the seeds that have failed.
 */

export type Lane = "fast" | "medium" | "nightly";

export const SEEDS_PER_LANE: Readonly<Record<Lane, number>> = {
  fast: 16,
  medium: 400,
  nightly: 100_000,
};

/** Seeds 1..count: seed 0 is avoided so a seed never equals a default. */
export const simulationSeeds = (count: number): number[] => Array.from({ length: count }, (_, i) => i + 1);

export type RegressionSeed = {
  readonly seed: number;
  readonly devices: 2 | 3;
  /** What the seed found, and its one-line reproduction. */
  readonly found: string;
};

/**
 * Every seed that ever failed, run in every lane as a permanent case (§6.2 tier 5: "any
 * failing seed is committed as a regression case with a one-line reproduction"). A seed
 * replays the chaos script as it stood when the seed failed; if the script changes, the
 * fixed defect keeps its own unit test in `@palier/app`, named in the deviation.
 */
export const REGRESSION_SEEDS: readonly RegressionSeed[] = [
  {
    seed: 74,
    devices: 3,
    found:
      "D74 — a pair redeem whose answer was lost left the device syncing into its new account from its old watermark. " +
      "runSyncSimulation({ seed: 74, devices: 3, profile, server: memorySimulatedServer() })",
  },
  {
    seed: 7,
    devices: 2,
    found:
      "D75 — an answer made while the device's own sync was in flight was overwritten by the pull. " +
      "runSyncSimulation({ seed: 7, devices: 2, profile, server: memorySimulatedServer() })",
  },
  {
    seed: 54693,
    devices: 3,
    found:
      "D157 — a code requested before the device's first registration was answered overwrote the account a lost redeem had moved it to, so its ledger never reset. " +
      "runSyncSimulation({ seed: 54693, devices: 3, profile, server: memorySimulatedServer() })",
  },
  {
    seed: 72951,
    devices: 3,
    found:
      "D157 — a code requested before the device's first registration was answered overwrote the account a lost redeem had moved it to, so its ledger never reset. " +
      "runSyncSimulation({ seed: 72951, devices: 3, profile, server: memorySimulatedServer() })",
  },
  {
    seed: 91998,
    devices: 2,
    found:
      "D157 — a code requested before the device's first registration was answered overwrote the account a lost redeem had moved it to, so its ledger never reset. " +
      "runSyncSimulation({ seed: 91998, devices: 2, profile, server: memorySimulatedServer() })",
  },
];

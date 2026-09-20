import type {
  AttemptStore,
  Clock,
  ItemRepository,
  KeyVault,
  Random,
  ScheduleStore,
  SettingsStore,
} from "@palier/app";
import {
  fakeClock,
  isHermetic,
  memoryAttemptStore,
  memoryItemRepository,
  memoryKeyVault,
  memoryScheduleStore,
  memorySettingsStore,
  seededRandom,
} from "@palier/testing";

/**
 * The one composition root (implementation-plan.md §3.5, principle 7): the only
 * place that names concrete adapters. Everything else is handed what it needs.
 *
 * Phase 0 state, stated plainly: the real adapters (Dexie, bank, vault, sync)
 * and the use cases they feed do not exist yet — they land in Phase 2. So today
 * this wires only the in-memory ports from `@palier/testing`, and only for the
 * hermetic path that Playwright drives (playwright.config.ts sets
 * `PALIER_HERMETIC=1`; the flag name lives in `@palier/testing` so the two
 * cannot disagree). `@palier/app` exposes no `buildUseCases` yet, so this
 * returns the raw ports; the use-case graph is added here when it exists.
 *
 * apps/web is explicitly allowed to import `@palier/testing` (the
 * `no-test-tooling-outside-testing` cruiser rule allows `^apps/web/`); this is
 * the sanctioned home for that import.
 */

export type Env = {
  readonly hermetic: boolean;
};

export type Container = {
  readonly clock: Clock;
  readonly random: Random;
  readonly items: ItemRepository;
  readonly attempts: AttemptStore;
  readonly schedule: ScheduleStore;
  readonly settings: SettingsStore;
  readonly vault: KeyVault;
};

/** Read the environment the container branches on. */
export function readEnv(
  env: Record<string, string | undefined> = process.env,
): Env {
  return { hermetic: isHermetic(env) };
}

/**
 * Build the port graph for the given environment. Until the real adapters land,
 * only the hermetic in-memory container exists; the production path fails loudly
 * rather than silently wiring test doubles into a real deployment.
 */
export function createContainer(env: Env): Container {
  if (!env.hermetic) {
    throw new Error(
      "No real adapters yet: the Dexie, bank, vault and sync adapters land in " +
        "Phase 2 (implementation-plan.md §7). Only the hermetic in-memory " +
        "container exists today — set PALIER_HERMETIC=1 to use it.",
    );
  }

  return {
    clock: fakeClock(),
    random: seededRandom(1),
    items: memoryItemRepository(),
    attempts: memoryAttemptStore(),
    schedule: memoryScheduleStore(),
    settings: memorySettingsStore(),
    vault: memoryKeyVault(),
  };
}

import type {
  AttemptStore,
  Clock,
  ItemRepository,
  KeyVault,
  PlanDailySessionRequest,
  Random,
  ScheduleStore,
  SettingsStore,
} from "@palier/app";
import { planDailySession } from "@palier/app";
import type { DayPlan } from "@palier/engine";
import {
  fakeClock,
  fixtureBankRepository,
  isHermetic,
  memoryAttemptStore,
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
 *
 * The first use case has landed ahead of Phase 2, as a content-agnostic
 * sequencing move (the same one that built the engine core early). So this now
 * also assembles the use-case graph via `buildUseCases` and seeds the item
 * repository from the canonical fixture bank (progress.md D36); the real
 * adapters still arrive in Phase 2.
 */

export type Env = {
  readonly hermetic: boolean;
};

/** The application use cases the UI drives, bound to the container's ports. */
export type UseCases = {
  readonly planDailySession: (request: PlanDailySessionRequest) => Promise<DayPlan>;
};

export type Ports = {
  readonly clock: Clock;
  readonly random: Random;
  readonly items: ItemRepository;
  readonly attempts: AttemptStore;
  readonly schedule: ScheduleStore;
  readonly settings: SettingsStore;
  readonly vault: KeyVault;
};

export type Container = Ports & {
  readonly useCases: UseCases;
};

/**
 * Bind the use cases to the ports. Everything a use case needs is handed to it
 * here (implementation-plan.md §3.5); nothing else in the app constructs a port.
 */
function buildUseCases(ports: Ports): UseCases {
  return {
    planDailySession: (request) =>
      planDailySession(request, {
        clock: ports.clock,
        random: ports.random,
        items: ports.items,
        schedule: ports.schedule,
        attempts: ports.attempts,
      }),
  };
}

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

  const ports: Ports = {
    clock: fakeClock(),
    random: seededRandom(1),
    items: fixtureBankRepository(),
    attempts: memoryAttemptStore(),
    schedule: memoryScheduleStore(),
    settings: memorySettingsStore(),
    vault: memoryKeyVault(),
  };

  return { ...ports, useCases: buildUseCases(ports) };
}

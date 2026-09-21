import type {
  AnswerItemRequest,
  AnswerItemResult,
  AttemptStore,
  Clock,
  CompleteSessionRequest,
  CompleteSessionResult,
  DiagnosticReadoutRequest,
  ItemRepository,
  KeyVault,
  PlanDailySessionRequest,
  Random,
  RunDiagnosticRequest,
  RunDiagnosticResult,
  ScheduleStore,
  SessionStore,
  SettingsStore,
  StartSessionRequest,
  StartSessionResult,
} from "@palier/app";
import {
  answerItem,
  completeSession,
  diagnosticReadout,
  planDailySession,
  runDiagnostic,
  startSession,
} from "@palier/app";
import pscSleProfile from "@palier/content/profiles/psc-sle.json";
import type { ExamProfile } from "@palier/domain";
import { parseExamProfileOrThrow } from "@palier/domain";
import type { DayPlan, SkillTrend } from "@palier/engine";
import {
  fakeClock,
  fixtureBankRepository,
  isHermetic,
  memoryAttemptStore,
  memoryKeyVault,
  memoryScheduleStore,
  memorySessionStore,
  memorySettingsStore,
  seededRandom,
} from "@palier/testing";

/**
 * The one composition root (implementation-plan.md §3.5, principle 7): the only
 * place that names concrete adapters. Everything else is handed what it needs.
 *
 * Phase 0 state, stated plainly: the real adapters (Dexie, bank, vault, sync)
 * do not exist yet — they land in Phase 2. So today this wires only the
 * in-memory ports from `@palier/testing`, and only for the hermetic path that
 * Playwright drives (playwright.config.ts sets `PALIER_HERMETIC=1`; the flag
 * name lives in `@palier/testing` so the two cannot disagree). The production
 * path throws rather than silently wiring test doubles into a real deployment.
 *
 * apps/web is explicitly allowed to import `@palier/testing` (the
 * `no-test-tooling-outside-testing` cruiser rule allows `^apps/web/`); this is
 * the sanctioned home for that import.
 *
 * Two use cases have landed ahead of Phase 2, as a content-agnostic sequencing
 * move (the same one that built the engine core early), so this assembles the
 * use-case graph via `buildUseCases` and seeds the item repository from the
 * canonical fixture bank (progress.md D36, D38).
 */

/**
 * The exam profile, parsed once here. Parsing at the composition root is the same
 * boundary discipline every other artefact gets: the file is validated before any
 * use case can act on it, and `parseExamProfileOrThrow` is the only thing that
 * turns the raw JSON into an `ExamProfile` (ADR 9).
 *
 * It arrives through `@palier/content`'s exports map rather than a relative path.
 * A relative import out of `apps/web` is exactly what `.dependency-cruiser.cjs`'s
 * `no-relative-escape` rule forbids — "cross-package imports go through the
 * package name, so they resolve through the exports map" (ADR 18, progress.md D42).
 *
 * In Phase 2 the bank adapter fetches content over HTTP and caches it in a service
 * worker (architecture.md §5.3); this bundled copy is what the hermetic path and
 * the static build use until then.
 */
const PROFILE: ExamProfile = parseExamProfileOrThrow(pscSleProfile);

export type Env = {
  readonly hermetic: boolean;
};

/** The application use cases the UI drives, bound to the container's ports. */
export type UseCases = {
  readonly planDailySession: (request: PlanDailySessionRequest) => Promise<DayPlan>;
  readonly startSession: (request: StartSessionRequest) => Promise<StartSessionResult>;
  readonly answerItem: (request: AnswerItemRequest) => Promise<AnswerItemResult>;
  readonly completeSession: (request: CompleteSessionRequest) => Promise<CompleteSessionResult>;
  readonly runDiagnostic: (request: RunDiagnosticRequest) => Promise<RunDiagnosticResult>;
  readonly diagnosticReadout: (request: DiagnosticReadoutRequest) => Promise<SkillTrend>;
};

export type Ports = {
  readonly clock: Clock;
  readonly random: Random;
  readonly items: ItemRepository;
  readonly attempts: AttemptStore;
  readonly schedule: ScheduleStore;
  readonly sessions: SessionStore;
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
    startSession: (request) =>
      startSession(request, {
        clock: ports.clock,
        sessions: ports.sessions,
        random: ports.random,
        items: ports.items,
        schedule: ports.schedule,
        attempts: ports.attempts,
      }),
    answerItem: (request) =>
      answerItem(request, {
        clock: ports.clock,
        items: ports.items,
        attempts: ports.attempts,
        schedule: ports.schedule,
        profile: PROFILE,
      }),
    completeSession: (request) =>
      completeSession(request, {
        clock: ports.clock,
        sessions: ports.sessions,
      }),
    runDiagnostic: (request) =>
      runDiagnostic(request, {
        clock: ports.clock,
        random: ports.random,
        items: ports.items,
        attempts: ports.attempts,
      }),
    diagnosticReadout: (request) =>
      diagnosticReadout(request, {
        items: ports.items,
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
    sessions: memorySessionStore(),
    settings: memorySettingsStore(),
    vault: memoryKeyVault(),
  };

  return { ...ports, useCases: buildUseCases(ports) };
}

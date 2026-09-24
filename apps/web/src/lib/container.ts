import type {
  AnswerItemRequest,
  AnswerItemResult,
  AttemptStore,
  Clock,
  CompleteSessionRequest,
  CompleteSessionResult,
  DiagnosticReadoutRequest,
  ExportDocument,
  IdGenerator,
  ImportDataRequest,
  ImportDataResult,
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
  exportData,
  importData,
  planDailySession,
  runDiagnostic,
  startSession,
  wipeData,
} from "@palier/app";
import { httpBankRepository } from "@palier/adapters/bank";
import { dexieStores } from "@palier/adapters/dexie";
import { webCryptoIdGenerator } from "@palier/adapters/ids";
import pscSleProfile from "@palier/content/profiles/psc-sle.json";
import type { ExamProfile } from "@palier/domain";
import { parseExamProfileOrThrow } from "@palier/domain";
import type { DayPlan, SkillTrend } from "@palier/engine";
import {
  counterIdGenerator,
  fakeClock,
  fixtureBankRepository,
  isHermetic,
  memoryAttemptStore,
  memoryKeyVault,
  memoryScheduleStore,
  memorySessionStore,
  memorySettingsStore,
  seededRandom,
} from "@palier/testing/in-memory";

import { selectionSeedFor, systemClock } from "./system-clock";

/**
 * The one composition root (implementation-plan.md §3.5, principle 7): the only
 * place that names concrete adapters. Everything else is handed what it needs.
 *
 * Two graphs, chosen by `Env`:
 *
 * - **Production** wires the real adapters: the HTTP bank over the statically served
 *   shards (`@palier/adapters/bank`), the five local stores over IndexedDB
 *   (`@palier/adapters/dexie`), Web Crypto ULIDs (`@palier/adapters/ids`), the wall
 *   clock, and a per-day-seeded selection `Random` (D58). **It is browser-only**:
 *   Dexie needs IndexedDB and the bank's base URL is origin-relative, so it is built
 *   in the browser by `ContainerProvider`, never during server rendering (D59).
 * - **Hermetic** wires the in-memory ports and the fixture bank, for the Playwright
 *   lane (playwright.config.ts sets `PALIER_HERMETIC=1`; the flag name lives in
 *   `@palier/testing` so the two cannot disagree).
 *
 * apps/web is explicitly allowed to import `@palier/testing` (the
 * `no-test-tooling-outside-testing` cruiser rule allows `^apps/web/`); this is the
 * sanctioned home for that import. It comes through the browser-safe
 * `@palier/testing/in-memory` subpath, because the root entry point re-exports the
 * contract suites (vitest), `msw/node` and PGlite, none of which a browser bundle can
 * take (D59). Production reuses exactly one thing from it: `seededRandom`, which
 * §3.5 wires in production on purpose.
 */

/**
 * Where the committed bank is served and which version this build reads. The
 * `content/bank/` tree is copied under `public/content/` at build (scripts/
 * prepare-public.mjs), and every manifest `path` already starts `bank/v{n}/`, so
 * the adapter's base is the directory that *contains* `bank/`. Bank versions are
 * additive (architecture.md §5.5): a new one is a new path, so moving this number
 * is the whole of a bank migration on the client.
 */
export const BANK_BASE_PATH = "/content";
export const BANK_VERSION = 1;

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
 * The *bank* is no longer bundled — the production path fetches it over HTTP and the
 * service worker keeps it (architecture.md §5.5). The profile still is: it is small,
 * every use case that needs it needs it synchronously, and ADR 18's revisit clause
 * (move it onto the bank's path) has not yet been exercised.
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
  /** The data-rights trio [R11]: one action each (progress.md D61, D62). */
  readonly exportData: () => Promise<ExportDocument>;
  readonly importData: (request: ImportDataRequest) => Promise<ImportDataResult>;
  readonly wipeData: () => Promise<void>;
};

export type Ports = {
  readonly clock: Clock;
  readonly random: Random;
  /**
   * Identifier minting (progress.md D39, D48). The UI mints the attempt and session
   * ids `answerItem` and `startSession` take — a use case never mints one. The
   * hermetic path wires the deterministic counter for reproducibility; production
   * wires `@palier/adapters/ids`'s Web Crypto generator.
   */
  readonly ids: IdGenerator;
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
    exportData: () =>
      exportData({
        clock: ports.clock,
        attempts: ports.attempts,
        schedule: ports.schedule,
        sessions: ports.sessions,
        settings: ports.settings,
      }),
    importData: (request) =>
      importData(request, {
        attempts: ports.attempts,
        schedule: ports.schedule,
        sessions: ports.sessions,
        settings: ports.settings,
      }),
    wipeData: () =>
      wipeData({
        attempts: ports.attempts,
        schedule: ports.schedule,
        sessions: ports.sessions,
        settings: ports.settings,
        vault: ports.vault,
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
 * Build the port graph for the given environment: the real adapters in production,
 * the in-memory ports under `PALIER_HERMETIC`. Construction does no I/O — Dexie
 * opens its database and the bank fetches its manifest on first use — so building
 * the container is cheap and cannot fail on a network or storage fault.
 */
export function createContainer(env: Env): Container {
  const ports = env.hermetic ? hermeticPorts() : productionPorts();
  return { ...ports, useCases: buildUseCases(ports) };
}

/** The real adapters. Browser-only — see the file comment (D59). */
function productionPorts(): Ports {
  const clock = systemClock();
  const stores = dexieStores();
  return {
    clock,
    random: seededRandom(selectionSeedFor(clock.now())),
    ids: webCryptoIdGenerator(),
    items: httpBankRepository({ baseUrl: BANK_BASE_PATH, version: BANK_VERSION }),
    attempts: stores.attempts,
    schedule: stores.schedule,
    sessions: stores.sessions,
    settings: stores.settings,
    // The Dexie adapter names this port `keyVault`; the graph calls it `vault`.
    vault: stores.keyVault,
  };
}

/** The in-memory ports and the fixture bank, for the hermetic Playwright lane. */
function hermeticPorts(): Ports {
  return {
    clock: fakeClock(),
    random: seededRandom(1),
    ids: counterIdGenerator(),
    items: fixtureBankRepository(),
    attempts: memoryAttemptStore(),
    schedule: memoryScheduleStore(),
    sessions: memorySessionStore(),
    settings: memorySettingsStore(),
    vault: memoryKeyVault(),
  };
}

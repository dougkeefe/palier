import type {
  AiProviderFactory,
  ApiKeyStatus,
  AnswerItemRequest,
  AnswerItemResult,
  AttemptStore,
  Clock,
  CompleteSessionRequest,
  CompleteSessionResult,
  AnswerExamItemRequest,
  CheckpointExamRequest,
  DiagnosticReadoutRequest,
  ExamReport,
  ExamReportRequest,
  ExamRun,
  ExamRunStore,
  ExportDocument,
  FlagExamItemRequest,
  IdGenerator,
  ImportDataRequest,
  ImportDataResult,
  ItemRepository,
  KeyVault,
  LatestExamResult,
  PlanDailySessionRequest,
  PracticeTrendRequest,
  ProgressReport,
  ProgressReportRequest,
  QueueForReviewRequest,
  Random,
  RescoreExamRequest,
  ResumeExamRequest,
  ResumeExamResult,
  ReviewQueueRequest,
  ReviewQueueResult,
  RunDiagnosticRequest,
  RunDiagnosticResult,
  ScheduleStore,
  SessionStore,
  SettingsStore,
  StartExamRequest,
  StartExamResult,
  StartSessionRequest,
  StartSessionResult,
  DeviceId,
  DeviceSummary,
  SyncNowRequest,
  SyncOutcome,
  SyncState,
  SyncStateStore,
  SubmitExamRequest,
  SubmitExamResult,
  SyncTransport,
  FlushTelemetryResult,
  SaveApiKeyRequest,
  SetTelemetryConsentRequest,
  TelemetryConsent,
  TelemetrySink,
  TelemetryStore,
} from "@palier/app";
import {
  apiKeyStatus,
  checkApiKey,
  removeApiKey,
  saveApiKey,
  answerExamItem,
  answerItem,
  checkpointExam,
  completeSession,
  deleteEverywhere,
  diagnosticReadout,
  examForms,
  examInProgress,
  examReport,
  exportData,
  flagExamItem,
  flushTelemetry,
  importData,
  latestExamResult,
  listDevices,
  pairDevice,
  planDailySession,
  practiceTrend,
  practiceTrendEvidence,
  progressReport,
  queueForReview,
  removeDevice,
  requestPairCode,
  rescoreExam,
  resumeExam,
  reviewQueue,
  runDiagnostic,
  setSyncEnabled,
  setTelemetryConsent,
  startExam,
  startSession,
  submitExam,
  syncNow,
  telemetryConsent,
  wipeData,
} from "@palier/app";
import { httpBankRepository } from "@palier/adapters/bank";
import { dexieStores } from "@palier/adapters/dexie";
import { webCryptoIdGenerator } from "@palier/adapters/ids";
import { openAiProvider } from "@palier/adapters/openai";
import { httpSyncTransport } from "@palier/adapters/sync";
import { httpTelemetrySink } from "@palier/adapters/telemetry";
import pscSleProfile from "@palier/content/profiles/psc-sle.json";
import type { ExamForm, ExamProfile } from "@palier/domain";
import { parseExamProfileOrThrow } from "@palier/domain";
import type { DayPlan, ExamResult, SkillTrend, TrendEvidence } from "@palier/engine";
import {
  counterIdGenerator,
  fakeClock,
  fixtureBankRepository,
  isHermetic,
  memoryAttemptStore,
  memoryExamRunStore,
  memoryKeyVault,
  memoryScheduleStore,
  memorySessionStore,
  memorySettingsStore,
  memorySyncStateStore,
  memoryTelemetryStore,
  seededRandom,
} from "@palier/testing/in-memory";

import aiModels from "./ai-models.json";
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
 * is the whole of a bank migration on the client. The service worker precaches
 * this version only (progress.md D82).
 */
export const BANK_BASE_PATH = "/content";
export const BANK_VERSION = 2;

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

/**
 * How the browser makes an `AiProvider`: from the key, inside `KeyVault.withApiKey`, once
 * per call (`withAiProvider` in `@palier/app` is the only caller), so no provider holding
 * the key outlives the call (implementation-plan.md §3.3, ADR 2, progress.md D99). It calls
 * `api.openai.com` directly from the browser; the key never reaches our server
 * (architecture.md §6.3). Both graphs wire the real adapter, as they do the sync transport:
 * the hermetic lane stubs OpenAI with `page.route`, never with a fake here.
 */
export const openAiFor: AiProviderFactory = (apiKey) =>
  openAiProvider({
    apiKey,
    models: { passage: aiModels.passage, draft: aiModels.draft, review: aiModels.review },
  });

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
  /** The readiness card's practice trend (D64). */
  readonly practiceTrend: (request: PracticeTrendRequest) => Promise<SkillTrend>;
  /** What the trend rests on, for the readiness card's disclosure (PRD §13.0, D94). */
  readonly practiceTrendEvidence: (request: PracticeTrendRequest) => Promise<TrendEvidence>;
  readonly reviewQueue: (request: ReviewQueueRequest) => Promise<ReviewQueueResult>;
  readonly progressReport: (request: ProgressReportRequest) => Promise<ProgressReport>;
  /** The data-rights trio [R11]: one action each (progress.md D61, D62). */
  readonly exportData: () => Promise<ExportDocument>;
  readonly importData: (request: ImportDataRequest) => Promise<ImportDataResult>;
  readonly wipeData: () => Promise<void>;
  /** Sync (architecture.md §9.3–§9.4, progress.md D69): one exchange, and the account around it. */
  readonly syncNow: (request: SyncNowRequest) => Promise<SyncOutcome>;
  readonly syncState: () => Promise<SyncState>;
  readonly requestPairCode: (request: { readonly label: string }) => Promise<{ readonly code: string; readonly expiresAt: string }>;
  readonly pairDevice: (request: SyncNowRequest & { readonly code: string }) => Promise<SyncOutcome>;
  readonly listDevices: () => Promise<readonly DeviceSummary[]>;
  readonly removeDevice: (request: { readonly id: DeviceId }) => Promise<void>;
  readonly setSyncEnabled: (request: { readonly enabled: boolean; readonly deleteFromServer?: boolean }) => Promise<void>;
  /** Delete everything, on the server and here [R11]; the server first. */
  readonly deleteEverywhere: () => Promise<void>;
  /** Mock exams (Phase 3 Slice 3, progress.md D80, D85): the runner's half. */
  readonly examForms: () => Promise<readonly ExamForm[]>;
  readonly examInProgress: () => Promise<ResumeExamResult | null>;
  readonly startExam: (request: StartExamRequest) => Promise<StartExamResult>;
  readonly resumeExam: (request: ResumeExamRequest) => Promise<ResumeExamResult | null>;
  readonly answerExamItem: (request: AnswerExamItemRequest) => Promise<ExamRun>;
  readonly flagExamItem: (request: FlagExamItemRequest) => Promise<ExamRun>;
  readonly checkpointExam: (request: CheckpointExamRequest) => Promise<ExamRun>;
  readonly submitExam: (request: SubmitExamRequest) => Promise<SubmitExamResult>;
  /** And the results' half: every result is rescored from the stored run (ADR 16). */
  readonly rescoreExam: (request: RescoreExamRequest) => Promise<ExamResult>;
  readonly examReport: (request: ExamReportRequest) => Promise<ExamReport>;
  readonly latestExamResult: () => Promise<LatestExamResult | null>;
  readonly queueForReview: (request: QueueForReviewRequest) => Promise<boolean>;
  /** Opt-in anonymous item telemetry (PRD §15, progress.md D92): this device's choice, and the flush. */
  readonly telemetryConsent: () => Promise<TelemetryConsent>;
  readonly setTelemetryConsent: (request: SetTelemetryConsentRequest) => Promise<void>;
  readonly flushTelemetry: () => Promise<FlushTelemetryResult>;
  /** The user's OpenAI key (PRD §8.10, progress.md D98–D99): kept, described, checked, removed. */
  readonly saveApiKey: (request: SaveApiKeyRequest) => Promise<void>;
  readonly apiKeyStatus: () => Promise<ApiKeyStatus | null>;
  readonly checkApiKey: () => Promise<void>;
  readonly removeApiKey: () => Promise<void>;
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
  /** The mock-exam runs, behind the exam use cases below (Phase 3 Slice 3). */
  readonly examRuns: ExamRunStore;
  readonly settings: SettingsStore;
  readonly vault: KeyVault;
  /** The HTTP sync transport, same-origin, presenting the vault's device secret. */
  readonly sync: SyncTransport;
  readonly syncState: SyncStateStore;
  /** The device-local telemetry consent and queue, never synced (D92). */
  readonly telemetry: TelemetryStore;
  /** The HTTP telemetry sink, same-origin, with no credential and no cookie. */
  readonly telemetrySink: TelemetrySink;
  /** Makes a provider from the key; only `withAiProvider` calls it (D99). */
  readonly aiProvider: AiProviderFactory;
};

export type Container = Ports & {
  readonly useCases: UseCases;
  /**
   * The exam profile, for the screens that show its rules: the exam picker lists
   * its variants (ADR 9). The same parsed value every use case receives.
   */
  readonly profile: ExamProfile;
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
    practiceTrend: (request) =>
      practiceTrend(request, {
        items: ports.items,
        attempts: ports.attempts,
      }),
    practiceTrendEvidence: (request) =>
      practiceTrendEvidence(request, {
        items: ports.items,
        attempts: ports.attempts,
        profile: PROFILE,
      }),
    reviewQueue: (request) =>
      reviewQueue(request, {
        clock: ports.clock,
        schedule: ports.schedule,
        items: ports.items,
      }),
    progressReport: (request) =>
      progressReport(request, {
        items: ports.items,
        attempts: ports.attempts,
      }),
    exportData: () =>
      exportData({
        clock: ports.clock,
        attempts: ports.attempts,
        schedule: ports.schedule,
        sessions: ports.sessions,
        examRuns: ports.examRuns,
        settings: ports.settings,
      }),
    importData: (request) =>
      importData(request, {
        attempts: ports.attempts,
        schedule: ports.schedule,
        sessions: ports.sessions,
        examRuns: ports.examRuns,
        settings: ports.settings,
      }),
    wipeData: () =>
      wipeData({
        attempts: ports.attempts,
        schedule: ports.schedule,
        sessions: ports.sessions,
        examRuns: ports.examRuns,
        settings: ports.settings,
        vault: ports.vault,
        telemetry: ports.telemetry,
      }),
    syncNow: (request) => syncNow(request, syncDeps(ports)),
    syncState: () => ports.syncState.state(),
    requestPairCode: (request) => requestPairCode(request, { transport: ports.sync, syncState: ports.syncState }),
    pairDevice: (request) => pairDevice(request, syncDeps(ports)),
    listDevices: () => listDevices({ transport: ports.sync, syncState: ports.syncState }),
    removeDevice: (request) => removeDevice(request, { transport: ports.sync, syncState: ports.syncState }),
    setSyncEnabled: (request) => setSyncEnabled(request, { transport: ports.sync, syncState: ports.syncState }),
    deleteEverywhere: () => deleteEverywhere({ ...syncDeps(ports), vault: ports.vault, telemetry: ports.telemetry }),
    examForms: () => examForms({ items: ports.items }),
    examInProgress: () => examInProgress({ items: ports.items, examRuns: ports.examRuns }),
    startExam: (request) => startExam(request, examDeps(ports)),
    resumeExam: (request) => resumeExam(request, examDeps(ports)),
    answerExamItem: (request) => answerExamItem(request, examDeps(ports)),
    flagExamItem: (request) => flagExamItem(request, examDeps(ports)),
    checkpointExam: (request) => checkpointExam(request, examDeps(ports)),
    submitExam: (request) =>
      submitExam(request, {
        ...examDeps(ports),
        attempts: ports.attempts,
        schedule: ports.schedule,
        profile: PROFILE,
        telemetry: ports.telemetry,
      }),
    rescoreExam: (request) => rescoreExam(request, { items: ports.items, examRuns: ports.examRuns }),
    examReport: (request) =>
      examReport(request, { items: ports.items, examRuns: ports.examRuns }),
    latestExamResult: () => latestExamResult({ items: ports.items, examRuns: ports.examRuns }),
    queueForReview: (request) =>
      queueForReview(request, {
        clock: ports.clock,
        items: ports.items,
        schedule: ports.schedule,
        profile: PROFILE,
      }),
    telemetryConsent: () => telemetryConsent({ telemetry: ports.telemetry }),
    setTelemetryConsent: (request) =>
      setTelemetryConsent(request, { telemetry: ports.telemetry, items: ports.items, examRuns: ports.examRuns }),
    flushTelemetry: () => flushTelemetry({ telemetry: ports.telemetry, sink: ports.telemetrySink }),
    saveApiKey: (request) => saveApiKey(request, { vault: ports.vault }),
    apiKeyStatus: () => apiKeyStatus({ vault: ports.vault }),
    checkApiKey: () => checkApiKey({ vault: ports.vault, aiProvider: ports.aiProvider }),
    removeApiKey: () => removeApiKey({ vault: ports.vault }),
  };
}

const examDeps = (ports: Ports) => ({
  clock: ports.clock,
  items: ports.items,
  examRuns: ports.examRuns,
});

const syncDeps = (ports: Ports) => ({
  clock: ports.clock,
  transport: ports.sync,
  syncState: ports.syncState,
  attempts: ports.attempts,
  schedule: ports.schedule,
  sessions: ports.sessions,
  examRuns: ports.examRuns,
  settings: ports.settings,
});

/**
 * The sync API is same-origin (architecture.md §9.3: "sent only over TLS to our own
 * origin"), so the transport's base URL is empty and every request is relative.
 */
export const SYNC_BASE_URL = "";

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
  return { ...ports, useCases: buildUseCases(ports), profile: PROFILE };
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
    examRuns: stores.examRuns,
    settings: stores.settings,
    // The Dexie adapter names this port `keyVault`; the graph calls it `vault`.
    vault: stores.keyVault,
    sync: httpSyncTransport({ baseUrl: SYNC_BASE_URL, credentials: () => stores.keyVault.deviceSecret() }),
    syncState: stores.syncState,
    telemetry: stores.telemetry,
    telemetrySink: httpTelemetrySink({ baseUrl: SYNC_BASE_URL }),
    aiProvider: openAiFor,
  };
}

/**
 * The in-memory ports and the fixture bank, for the hermetic Playwright lane.
 *
 * Sync and the telemetry sink are the exceptions to "in memory": each is the **real** HTTP
 * adapter against the dev server's routes, which run on an in-process PGlite (`src/server/db.ts`),
 * so E2E journey 8 drives the real route handlers (implementation-plan.md §6.2 tier 6).
 * For that, each hermetic page load is its own device. It gets a device secret the
 * server will accept (64 hex characters) and an id counter started far from any other
 * device's. Two devices sharing one id stream would lose attempts to the store's
 * duplicate no-op, the very collision D39 exists to rule out. Within one device the
 * counter is still deterministic (progress.md D71).
 */
function hermeticPorts(): Ports {
  const device = hermeticDevice();
  const vault = memoryKeyVault(device.secret);
  return {
    clock: fakeClock(),
    random: seededRandom(1),
    ids: counterIdGenerator(device.idSeed),
    items: fixtureBankRepository(),
    attempts: memoryAttemptStore(),
    schedule: memoryScheduleStore(),
    sessions: memorySessionStore(),
    examRuns: memoryExamRunStore(),
    settings: memorySettingsStore(),
    vault,
    sync: httpSyncTransport({ baseUrl: SYNC_BASE_URL, credentials: () => vault.deviceSecret() }),
    syncState: memorySyncStateStore(),
    telemetry: memoryTelemetryStore(),
    // The real HTTP adapter against the dev server's route on PGlite, as sync is.
    telemetrySink: httpTelemetrySink({ baseUrl: SYNC_BASE_URL }),
    // The real OpenAI adapter too; the journeys stub api.openai.com with `page.route`.
    aiProvider: openAiFor,
  };
}

/** A fresh hermetic device: a 256-bit hex secret, and an id seed 2^20 ids from its neighbours. */
export function hermeticDevice(random: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)) {
  const bytes = random(new Uint8Array(36));
  const secret = [...bytes.subarray(0, 32)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const idSeed = new DataView(bytes.buffer, 32, 4).getUint32(0) * 2 ** 20;
  return { secret, idSeed };
}

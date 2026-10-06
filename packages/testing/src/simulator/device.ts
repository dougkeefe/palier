import type {
  Clock,
  ItemRepository,
  ScheduleEntry,
  ScheduleStore,
  SyncNowDeps,
  SyncOutcome,
  SyncRecord,
  SyncTransport,
} from "@palier/app";
import {
  answerExamItem,
  answerItem,
  completeSession,
  exportData,
  importData,
  pairDevice,
  practiceTrend,
  requestPairCode,
  rescoreExam,
  setSyncEnabled,
  startExam,
  startSession,
  submitExam,
  syncNow,
} from "@palier/app";
import type { ExamProfile, FormId, ItemId, OptionId, ScoredSkill, SessionId } from "@palier/domain";
import { OPTION_IDS, attemptId, sessionId } from "@palier/domain";

import { counterIdGenerator } from "../ids/counter-id-generator.js";
import {
  memoryAttemptStore,
  memoryExamRunStore,
  memoryScheduleStore,
  memorySessionStore,
  memorySettingsStore,
  memorySyncStateStore,
} from "../memory/index.js";
import { seededRandom } from "../random/seeded-random.js";

/**
 * One virtual device for the sync simulator: the whole practice-and-sync graph a browser
 * runs (the shape of `apps/web`'s hermetic container), over the in-memory stores, driven
 * only through the real `@palier/app` use cases — so what the simulator proves, it proves
 * about the code the app ships, not about a model of it.
 *
 * Like the app's `SyncRunner`, a device runs **at most one sync at a time**, but study
 * may carry on while that sync is in flight: `syncInBackground` starts one without
 * waiting, and `idle` waits for it.
 */

export type SimulatedDeviceOptions = {
  readonly name: string;
  /** Where this device's ULID counter starts; devices must not overlap (D39, D71). */
  readonly idSeed: number;
  readonly clock: Clock;
  readonly transport: SyncTransport;
  readonly items: ItemRepository;
  readonly profile: ExamProfile;
  /** Told of every schedule entry an answer writes — the simulator's record of real state. */
  readonly onScheduleWrite?: (entry: ScheduleEntry) => void;
};

/** One answer in a study burst. */
export type Answer = {
  readonly itemId: ItemId;
  readonly correct: boolean;
  readonly changedAnswer: boolean;
};

export type SimulatedDevice = {
  readonly name: string;
  readonly deps: SyncNowDeps;
  /** Open a session, answer, and optionally complete it. Returns the attempts recorded. */
  readonly study: (answers: readonly Answer[], complete: boolean) => Promise<readonly SyncRecord[]>;
  readonly setSetting: (key: string, value: unknown) => Promise<void>;
  /** Start a mock exam on a form. Returns the run's id. */
  readonly startExam: (form: FormId) => Promise<SessionId>;
  /** Answer items of a run, each answer a checkpoint at the given elapsed time. */
  readonly answerExam: (run: SessionId, answers: readonly Answer[], elapsedMs: number) => Promise<void>;
  /** Submit a run. Returns the attempts the submission recorded. */
  readonly submitExam: (run: SessionId, elapsedMs: number) => Promise<readonly SyncRecord[]>;
  /** The result of every submitted run the device holds, as stable JSON. */
  readonly examResults: () => Promise<string>;
  /** Sync now and wait for it; a sync already running is waited for instead. */
  readonly sync: () => Promise<SyncOutcome>;
  /** Start a sync without waiting for it, unless one is already running. */
  readonly syncInBackground: () => void;
  /** Wait for any sync this device has running. */
  readonly idle: () => Promise<void>;
  readonly requestCode: () => Promise<string>;
  readonly pair: (code: string) => Promise<SyncOutcome>;
  readonly setSync: (enabled: boolean) => Promise<void>;
  readonly exportJson: () => Promise<string>;
  readonly importJson: (json: string) => Promise<void>;
  /** Every progress record on the device, keyed `type:id`. */
  readonly records: () => Promise<Map<string, SyncRecord>>;
  readonly trend: (skill: ScoredSkill) => ReturnType<typeof practiceTrend>;
};

const LABEL = "Simulated browser";

export const simulatedDevice = (options: SimulatedDeviceOptions): SimulatedDevice => {
  const deps: SyncNowDeps = {
    clock: options.clock,
    transport: options.transport,
    syncState: memorySyncStateStore(),
    attempts: memoryAttemptStore(),
    schedule: memoryScheduleStore(),
    sessions: memorySessionStore(),
    examRuns: memoryExamRunStore(),
    settings: memorySettingsStore(),
  };
  const ids = counterIdGenerator(options.idSeed);
  // Only answers go through this: a sync or import writing a merged copy is not new state.
  const answered: ScheduleStore = {
    ...deps.schedule,
    put: async (entry) => {
      await deps.schedule.put(entry);
      options.onScheduleWrite?.(entry);
    },
  };
  const { items, profile } = options;
  let running: Promise<SyncOutcome> | null = null;
  // A background sync that throws is a defect, not an outcome: kept, and raised by `idle`.
  let failure: unknown = null;

  const sync = (): Promise<SyncOutcome> => {
    running ??= syncNow({ label: LABEL }, deps).finally(() => {
      running = null;
    });
    return running;
  };

  const study = async (answers: readonly Answer[], complete: boolean): Promise<readonly SyncRecord[]> => {
    const id = sessionId(ids.ulid());
    await startSession(
      { sessionId: id, mode: "drill", plan: { skill: "reading", lang: "fr", targetBand: "C", sessionSize: 5 } },
      // A simulated browser runs no spoken session, so no oral report biases its plan (D124).
      {
        ...deps,
        items,
        random: seededRandom(options.idSeed),
        oral: { all: () => Promise.resolve([]) },
        rules: profile.diagnostic,
      },
    );
    const recorded: SyncRecord[] = [];
    for (const answer of answers) {
      const [item] = await items.byIds([answer.itemId]);
      if (item === undefined) continue;
      const { attempt } = await answerItem(
        {
          attemptId: attemptId(ids.ulid()),
          itemId: answer.itemId,
          response: answer.correct ? item.key : wrongOption(item.key),
          sessionId: id,
          mode: "drill",
          msToFirstSelect: 1000,
          msToConfirm: 2000,
          changedAnswer: answer.changedAnswer,
          slow: false,
        },
        { ...deps, schedule: answered, items, profile },
      );
      recorded.push({ type: "attempt", id: attempt.id, value: attempt });
    }
    if (complete) await completeSession({ sessionId: id }, deps);
    return recorded;
  };

  const answerExam = async (run: SessionId, answers: readonly Answer[], elapsedMs: number): Promise<void> => {
    for (const answer of answers) {
      const [item] = await items.byIds([answer.itemId]);
      if (item === undefined) continue;
      await answerExamItem(
        {
          runId: run,
          itemId: answer.itemId,
          response: answer.correct ? item.key : wrongOption(item.key),
          msToFirstSelect: 1000,
          msToConfirm: 2000,
          changedAnswer: answer.changedAnswer,
          elapsedMs,
        },
        { ...deps, items },
      );
    }
  };

  const submit = async (run: SessionId, elapsedMs: number): Promise<readonly SyncRecord[]> => {
    await submitExam({ runId: run, elapsedMs }, { ...deps, schedule: answered, items, profile });
    return (await deps.attempts.all())
      .filter((a) => a.sessionId === run)
      .map((value): SyncRecord => ({ type: "attempt", id: value.id, value }));
  };

  const examResults = async (): Promise<string> => {
    // Sorted by id, code unit by code unit, so two devices holding the same runs agree (D73).
    const submitted = (await deps.examRuns.all())
      .filter((r) => r.submittedAt !== null)
      .map((r) => r.id)
      .sort();
    const results = await Promise.all(
      submitted.map(async (id) => [id, await rescoreExam({ runId: id }, { items, examRuns: deps.examRuns })]),
    );
    return JSON.stringify(results);
  };

  const records = async (): Promise<Map<string, SyncRecord>> => {
    const [attempts, schedule, sessions, examRuns, settings] = await Promise.all([
      deps.attempts.all(),
      deps.schedule.all(),
      deps.sessions.all(),
      deps.examRuns.all(),
      deps.settings.all(),
    ]);
    const all: SyncRecord[] = [
      ...attempts.map((value): SyncRecord => ({ type: "attempt", id: value.id, value })),
      ...schedule.map((value): SyncRecord => ({ type: "schedule", id: value.itemId, value })),
      ...sessions.map((value): SyncRecord => ({ type: "session", id: value.id, value })),
      ...examRuns.map((value): SyncRecord => ({ type: "examRun", id: value.id, value })),
      ...settings.map((value): SyncRecord => ({ type: "setting", id: value.key, value })),
    ];
    return new Map(all.map((r) => [`${r.type}:${r.id}`, r]));
  };

  return {
    name: options.name,
    deps,
    study,
    setSetting: (key, value) => deps.settings.set(key, value),
    startExam: async (form) => {
      const id = sessionId(ids.ulid());
      await startExam({ runId: id, formId: form }, { ...deps, items });
      return id;
    },
    answerExam,
    submitExam: submit,
    examResults,
    sync,
    syncInBackground: () => {
      sync().catch((error: unknown) => {
        failure ??= error;
      });
    },
    idle: async () => {
      if (running !== null) await running.catch(() => undefined);
      if (failure !== null) throw failure;
    },
    requestCode: async () => (await requestPairCode({ label: LABEL }, deps)).code,
    pair: (code) => pairDevice({ label: LABEL, code }, deps),
    setSync: (enabled) => setSyncEnabled({ enabled }, deps),
    exportJson: async () => JSON.stringify(await exportData(deps)),
    importJson: async (json) => {
      await importData({ json }, deps);
    },
    records,
    trend: (skill) => practiceTrend({ skill }, { items, attempts: deps.attempts }),
  };
};

/** Any option but the key: the first one that is not it. */
const wrongOption = (key: OptionId): OptionId => OPTION_IDS.find((o) => o !== key) as OptionId;

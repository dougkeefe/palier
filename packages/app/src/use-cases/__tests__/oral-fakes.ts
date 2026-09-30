import type { ExaminerTurnRequest, OralScenario, UsageRecord } from "@palier/domain";
import { scenarioId, sessionId } from "@palier/domain";

import type {
  AiProvider,
  AnswerSource,
  CandidateAnswer,
  ExaminerQuestion,
  KeyVault,
  Clock,
  ItemRepository,
  OralDirective,
  OralLiveness,
  OralSession,
  OralStore,
  OralTransport,
  OralTransportEvent,
} from "../../ports/index.js";
import { StorageQuotaError } from "../../ports/index.js";

/**
 * Local oral fakes for the use-case tests (progress.md D37): a store, a transport the
 * test drives by hand, a settable clock, and a bank holding one scenario.
 */

export const SESSION_ID = sessionId("oral-1");

/** Sessions some page is running, fixed at `ids`, counting how often it is asked (D144). */
export const liveSessions = (ids: readonly string[] = []): OralLiveness & { readonly asked: () => number } => {
  let asked = 0;
  return {
    hold: () => () => undefined,
    live: () => {
      asked += 1;
      return Promise.resolve(new Set(ids.map((id) => sessionId(id))));
    },
    asked: () => asked,
  };
};
export const START = "2026-09-27T10:00:00.000Z";
const MIN = 60_000;

/** A 10-minute work discussion in three phases: 2, 5 and 3 minutes. */
export const SCENARIO: OralScenario = {
  id: scenarioId("scn-work-c"),
  lang: "fr",
  sessionType: "work",
  targetBand: "C",
  topic: "project-management",
  phases: [2, 5, 3].map((minutes, i) => ({
    name: `Phase ${String(i + 1)}`,
    minutes,
    intent: "Sonder.",
    seedQuestions: ["Parlez-moi de votre projet."],
    escalation: ["Qu'auriez-vous fait autrement ?"],
    deescalation: ["Décrivez une journée type."],
  })),
};

export const anOralSession = (over: Partial<OralSession> = {}): OralSession => ({
  id: SESSION_ID,
  scenarioId: SCENARIO.id,
  startedAt: START,
  endedAt: null,
  endReason: null,
  turns: [],
  assessment: null,
  ...over,
});

/** A clock the test moves by hand, in minutes past `START`. */
export const settableClock = (): Clock & { readonly at: (minutes: number) => void } => {
  let now = Date.parse(START);
  return {
    now: () => new Date(now).toISOString(),
    at: (minutes) => {
      now = Date.parse(START) + minutes * MIN;
    },
  };
};

export const scenarioBank = (scenarios: readonly OralScenario[] = [SCENARIO]): ItemRepository => ({
  byIds: () => Promise.resolve([]),
  query: () => Promise.resolve([]),
  passage: () => Promise.resolve(null),
  form: () => Promise.resolve(null),
  forms: () => Promise.resolve([]),
  scenario: (id) => Promise.resolve(scenarios.find((s) => s.id === id) ?? null),
  scenarios: () => Promise.resolve(scenarios),
  bankVersion: () => Promise.resolve(3),
});

type StoredAudio = { readonly blob: Blob; readonly startedAt: string };

/**
 * An oral store that keeps the port's rules. `quotaBytes` bounds the recordings'
 * total, so a test can fill the device; `audio` seeds recordings of those sizes.
 */
export const oralStore = (
  seed: readonly OralSession[] = [],
  options: { readonly quotaBytes?: number; readonly audio?: readonly [OralSession["id"], number][] } = {},
): OralStore & { readonly puts: () => number } => {
  const sessions = new Map(seed.map((s) => [s.id, s]));
  const audio = new Map<OralSession["id"], StoredAudio>();
  for (const [id, bytes] of options.audio ?? []) {
    audio.set(id, { blob: new Blob(["x".repeat(bytes)]), startedAt: sessions.get(id)?.startedAt ?? START });
  }
  let puts = 0;
  const used = () => [...audio.values()].reduce((sum, a) => sum + a.blob.size, 0);
  return {
    put: (session) => {
      puts += 1;
      sessions.set(session.id, session);
      return Promise.resolve();
    },
    get: (id) => Promise.resolve(sessions.get(id) ?? null),
    all: () => Promise.resolve([...sessions.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt))),
    putAudio: (id, blob) => {
      const session = sessions.get(id);
      if (session === undefined) return Promise.reject(new Error(`no session ${id}`));
      const without = used() - (audio.get(id)?.blob.size ?? 0);
      if (options.quotaBytes !== undefined && without + blob.size > options.quotaBytes) {
        return Promise.reject(new StorageQuotaError());
      }
      audio.set(id, { blob, startedAt: session.startedAt });
      return Promise.resolve();
    },
    audio: (id) => Promise.resolve(audio.get(id)?.blob ?? null),
    audioIndex: () =>
      Promise.resolve(
        [...audio.entries()]
          .map(([sessionId, a]) => ({ sessionId, bytes: a.blob.size, startedAt: a.startedAt }))
          .sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
      ),
    deleteAudio: (ids) => {
      for (const id of ids) audio.delete(id);
      return Promise.resolve();
    },
    clear: () => {
      sessions.clear();
      audio.clear();
      return Promise.resolve();
    },
    puts: () => puts,
  };
};

/**
 * A transport the test drives: `say` and `flag` push events as the examiner's side
 * would, `hangUp` ends it from the far end. `close` delivers `closed` synchronously,
 * as the port allows, unless `deferClose` holds it back until the test hangs up, as a
 * transport still delivering an answer would. `failOpen` makes `open` reject, and
 * `failDirect` every directive.
 */
export const handTransport = (
  options: { readonly failOpen?: boolean; readonly failDirect?: boolean; readonly deferClose?: boolean } = {},
) => {
  let sink: ((event: OralTransportEvent) => void) | null = null;
  let isClosed = false;
  const directives: OralDirective[] = [];
  let closeCalls = 0;
  const emit = (event: OralTransportEvent) => sink?.(event);
  const end = (failed: boolean) => {
    if (isClosed) return;
    isClosed = true;
    emit({ kind: "closed", failed });
  };
  const transport: OralTransport = {
    open: (_req, listener) => {
      if (options.failOpen === true) return Promise.reject(new Error("no connection"));
      sink = listener;
      return Promise.resolve();
    },
    direct: (directive) => {
      if (options.failDirect === true) return Promise.reject(new Error("the channel dropped"));
      if (!isClosed) directives.push(directive);
      return Promise.resolve();
    },
    close: () => {
      closeCalls += 1;
      if (options.deferClose !== true) end(false);
      return Promise.resolve();
    },
  };
  return {
    transport,
    say: (speaker: "examiner" | "candidate", text: string, startMs: number, endMs: number) =>
      emit({ kind: "turn", speaker, text, startMs, endMs }),
    flag: (direction: "escalate" | "deescalate") => emit({ kind: "difficulty", direction }),
    note: (criterion: "grammar" | "vocabulary", evidence: string) => emit({ kind: "note", criterion, evidence, severity: "moderate" }),
    hangUp: (failed: boolean) => end(failed),
    directives: () => directives,
    closeCalls: () => closeCalls,
  };
};

/** A vault stub that holds a key, or none (D37). */
export const vaultWith = (key: string | null): KeyVault => ({
  putApiKey: () => Promise.resolve(),
  withApiKey: (fn) => (key === null ? Promise.reject(new Error("no key")) : fn(key)),
  hasApiKey: () => Promise.resolve(key !== null),
  apiKeyStorage: () => Promise.resolve(key === null ? null : "device"),
  clear: () => Promise.resolve(),
  deviceSecret: () => Promise.resolve("device-secret"),
});

type ExaminerOptions = {
  /** Whether the provider can voice a question; `true` unless said otherwise. */
  readonly speaks?: boolean;
  /** The difficulty flag each examiner turn carries, in turn; `null` once they run out. */
  readonly flags?: readonly ("escalate" | "deescalate" | null)[];
  /** Make the named method reject with this error. */
  readonly fail?: { readonly method: "examinerTurn" | "speak" | "transcribe"; readonly error: Error };
  /** Hold every examiner turn until the test releases it. */
  readonly holdExaminer?: boolean;
  /** Hold every transcription until the test releases it. */
  readonly holdTranscribe?: boolean;
};

/**
 * An `AiProvider` for the turn loop (progress.md D118), recording what it was asked. Each
 * examiner turn is numbered ("Question 1", …), a voice is the question's words as a blob, and a
 * transcription reads the clip's own bytes. Each call bills something, so metering is visible.
 */
export const examinerProvider = (options: ExaminerOptions = {}) => {
  const examinerRequests: ExaminerTurnRequest[] = [];
  const spoken: string[] = [];
  const transcribed: { readonly lang: string; readonly durationMs: number }[] = [];
  const held: (() => void)[] = [];
  let usage: UsageRecord | null = null;
  const hold = (on: boolean | undefined) =>
    on === true ? new Promise<void>((resolve) => held.push(resolve)) : Promise.resolve();
  const failing = (method: "examinerTurn" | "speak" | "transcribe") =>
    options.fail?.method === method ? Promise.reject(options.fail.error) : Promise.resolve();
  const provider: AiProvider = {
    capabilities: () => ({
      generatePassage: false,
      generateItems: false,
      reviewItem: false,
      assessWriting: false,
      generateScenario: false,
      transcribe: true,
      speak: options.speaks ?? true,
      examinerTurn: true,
      assessOral: false,
    }),
    generatePassage: () => Promise.reject(new Error("unused")),
    generateItems: () => Promise.reject(new Error("unused")),
    reviewItem: () => Promise.reject(new Error("unused")),
    assessWriting: () => Promise.reject(new Error("unused")),
    generateScenario: () => Promise.reject(new Error("unused")),
    assessOral: () => Promise.reject(new Error("unused")),
    examinerTurn: async (req) => {
      examinerRequests.push(req);
      usage = { model: "m-examiner", inputTokens: 100, outputTokens: 10, costUsd: 0.001 };
      await hold(options.holdExaminer);
      await failing("examinerTurn");
      return { text: `Question ${String(examinerRequests.length)}`, difficulty: options.flags?.[examinerRequests.length - 1] ?? null };
    },
    speak: async (req) => {
      spoken.push(req.text);
      usage = { model: "m-speech", inputTokens: 0, outputTokens: 0, characters: req.text.length, costUsd: 0.0001 };
      await failing("speak");
      return new Blob([req.text], { type: "audio/mpeg" });
    },
    transcribe: async (req) => {
      transcribed.push({ lang: req.lang, durationMs: req.durationMs });
      usage = { model: "m-transcribe", inputTokens: 0, outputTokens: 0, audioSeconds: req.durationMs / 1000, costUsd: 0.0002 };
      await hold(options.holdTranscribe);
      await failing("transcribe");
      return { text: await req.audio.text() };
    },
    verifyKey: () => Promise.resolve(),
    lastUsage: () => usage,
  };
  return {
    provider,
    examinerRequests,
    spoken,
    transcribed,
    /** Let every held call go on. */
    release: () => {
      for (const go of held.splice(0)) go();
    },
  };
};

/**
 * An `AnswerSource` the test answers by hand (D118): each question waits until `give` or
 * `refuse`, and rejects when the transport aborts the wait, as the port says.
 */
export const handAnswers = () => {
  const questions: ExaminerQuestion[] = [];
  const signals: AbortSignal[] = [];
  let pending: { resolve: (a: CandidateAnswer) => void; reject: (e: unknown) => void } | null = null;
  const answers: AnswerSource = {
    answer: (question, signal) =>
      new Promise<CandidateAnswer>((resolve, reject) => {
        questions.push(question);
        signals.push(signal);
        pending = { resolve, reject };
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }),
  };
  return {
    answers,
    questions,
    signals,
    waiting: () => pending !== null,
    give: (answer: CandidateAnswer) => {
      const current = pending;
      pending = null;
      current?.resolve(answer);
    },
    refuse: (error: unknown) => {
      const current = pending;
      pending = null;
      current?.reject(error);
    },
  };
};

/** Let every settled promise and queued task run. */
export const settled = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

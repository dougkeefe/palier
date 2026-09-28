import type { OralScenario, OralSessionType, OralSpeaker, TargetBand } from "@palier/domain";
import { ORAL_SESSION_TYPES } from "@palier/domain";

import type {
  AnswerSource,
  CandidateAnswer,
  ItemRepository,
  OralDirective,
  OralStore,
  OralTransport,
  OralTransportEvent,
} from "../ports/index.js";
import { type MeteredAiDeps, withAiProvider } from "./api-key.js";
import { type OralSessionRun, type StartOralSessionRequest, startOralSessionRun } from "./oral.js";

/**
 * Practice mode, the turn-based transport (architecture.md §8.5, progress.md D118). Nothing in
 * it is vendor-specific: it is orchestration over two ports, the `AiProvider` (through
 * `withAiProvider`, so every call is metered as `"oral-practice"`) and the `AnswerSource`, so it
 * lives here rather than in an adapter.
 */

export type TurnBasedTransportDeps = MeteredAiDeps & {
  readonly answers: AnswerSource;
};

/** A turn-based transport, and why it closed failed, for the screen to name (`checkFailure`). */
export type TurnBasedTransport = OralTransport & {
  /** The error that ended the session, or `null` while it has not failed. */
  readonly lastError: () => unknown;
};

type Asked = {
  readonly text: string;
  readonly audio: Blob | null;
  readonly difficulty: "escalate" | "deescalate" | null;
  /** The phase the question was written from, which is the one it is shown and stored in. */
  readonly phase: number;
};

/**
 * An `OralTransport` that takes turns (progress.md D118):
 *
 * 1. **The examiner asks.** One metered call writes the next question from the scenario's
 *    current phase, the register the client asked for and the conversation so far, and voices
 *    it, in that order (D101: a callback's calls are sequential). A provider with no voice gives
 *    the question as text only. A difficulty flag is passed on, then the examiner's turn.
 * 2. **The candidate answers.** The question goes to the `AnswerSource`, which shows it and waits.
 * 3. **A clip is transcribed** in its own metered call, and nowhere else [R12]; typed words go
 *    straight through. Then the candidate's turn.
 *
 * - **`open` starts the loop at phase 0's baseline**, which is where the session machine's
 *   first directive puts it.
 * - **`direct` returns at once.** It sets the phase and register the next question uses, since
 *   the driver awaits it in its own queue. A phase past the scenario's end keeps the last.
 * - **`close` stops waiting for an answer, delivers a turn already in flight, then `closed`.**
 * - **Any failed call closes it failed**, and `lastError` keeps the error. The turns so far are
 *   already the driver's, stored as they arrived.
 *
 * Times are milliseconds since `open`, by the `Clock`. The examiner's turn is the instant it is
 * shown; a clip's ends when it arrived and starts its measured length before, never before its
 * own question was shown (progress.md D121). A typed answer spans the wait for it.
 *
 * - **A question ended mid-writing is not voiced**: once closing, the examiner's words are kept
 *   but no speech is bought for a question nobody will hear (D121).
 * - **Each wait for an answer has its own abort signal**, so nothing a finished wait registered
 *   outlives it (D121).
 */
export const turnBasedTransport = (deps: TurnBasedTransportDeps): TurnBasedTransport => {
  let state: "idle" | "open" | "closing" | "closed" = "idle";
  let sink: (event: OralTransportEvent) => void = () => undefined;
  let phaseCount = 1;
  let openedAt = 0;
  let directive: OralDirective = { phase: 0, register: "baseline" };
  let error: unknown = null;
  let loop: Promise<void> = Promise.resolve();
  const lastStart: Record<OralSpeaker, number> = { examiner: 0, candidate: 0 };
  const transcript: { readonly speaker: OralSpeaker; readonly text: string }[] = [];
  let waiting: AbortController | null = null;

  const nowMs = (): number => Math.max(0, Date.parse(deps.clock.now()) - openedAt);

  const finish = (failed: boolean): void => {
    if (state === "closed") return;
    state = "closed";
    sink({ kind: "closed", failed });
  };

  const say = (speaker: OralSpeaker, text: string, startMs: number, endMs: number): void => {
    const start = Math.max(startMs, lastStart[speaker]);
    lastStart[speaker] = start;
    transcript.push({ speaker, text });
    sink({ kind: "turn", speaker, text, startMs: start, endMs: Math.max(start, endMs) });
  };

  const ask = (current: OralScenario): Promise<Asked> => {
    const phaseIndex = directive.phase;
    const phase = current.phases[phaseIndex];
    if (phase === undefined) throw new Error(`Scenario ${current.id} has no phases.`);
    const request = {
      sessionType: current.sessionType,
      targetBand: current.targetBand,
      lang: current.lang,
      topic: current.topic,
      phase,
      register: directive.register,
      transcript: [...transcript],
    };
    return withAiProvider(deps, "oral-practice", async (ai) => {
      const turn = await ai.examinerTurn(request);
      const voiced = state === "open" && ai.capabilities().speak;
      const audio = voiced ? await ai.speak({ text: turn.text, lang: current.lang }) : null;
      return { text: turn.text, audio, difficulty: turn.difficulty, phase: phaseIndex };
    });
  };

  const hear = async (current: OralScenario, answer: CandidateAnswer): Promise<string> => {
    if (answer.kind === "typed") return answer.text;
    const { audio, durationMs } = answer;
    const transcribed = await withAiProvider(deps, "oral-practice", (ai) =>
      ai.transcribe({ audio, lang: current.lang, durationMs }),
    );
    return transcribed.text;
  };

  const run = async (current: OralScenario): Promise<void> => {
    try {
      while (state === "open") {
        const asked = await ask(current);
        if (asked.difficulty !== null) sink({ kind: "difficulty", direction: asked.difficulty });
        const shownAt = nowMs();
        say("examiner", asked.text, shownAt, shownAt);
        if (state !== "open") return;

        const wait = new AbortController();
        waiting = wait;
        let answer: CandidateAnswer;
        try {
          answer = await deps.answers.answer({ text: asked.text, audio: asked.audio, phase: asked.phase }, wait.signal);
        } catch (refused) {
          if (wait.signal.aborted) return;
          throw refused;
        } finally {
          waiting = null;
        }
        const answeredAt = nowMs();
        const text = await hear(current, answer);
        const startMs = answer.kind === "typed" ? shownAt : Math.max(shownAt, answeredAt - answer.durationMs);
        say("candidate", text, startMs, answeredAt);
      }
    } catch (failure) {
      error = failure;
      finish(true);
    }
  };

  return {
    open: (req, listener) => {
      if (state !== "idle") return Promise.reject(new Error("A turn-based transport opens once."));
      sink = listener;
      phaseCount = req.scenario.phases.length;
      openedAt = Date.parse(deps.clock.now());
      state = "open";
      loop = run(req.scenario);
      return Promise.resolve();
    },

    direct: (next) => {
      if (state === "idle") return Promise.reject(new Error("A directive cannot reach a transport that is not open."));
      if (state === "open") {
        directive = { phase: Math.max(0, Math.min(next.phase, phaseCount - 1)), register: next.register };
      }
      return Promise.resolve();
    },

    close: async () => {
      if (state === "idle") {
        state = "closed";
        return;
      }
      if (state === "open") {
        state = "closing";
        waiting?.abort();
      }
      await loop;
      finish(false);
    },

    lastError: () => error,
  };
};

export type OralPracticeDeps = MeteredAiDeps & {
  readonly items: ItemRepository;
  readonly oral: OralStore;
  readonly answers: AnswerSource;
};

/** A practice session running: the session driver's run, and why it failed when it did. */
export type OralPracticeRun = OralSessionRun & {
  /** The error that closed the session failed, or `null`: the screen names it in words. */
  readonly failure: () => unknown;
};

/**
 * Start a practice-mode session (progress.md D118): the session driver (D116) over a fresh
 * turn-based transport, answered by `answers`, which the screen supplies (a recorder or a
 * text field). The id is the caller's (D39).
 */
export const startOralPracticeRun = async (
  request: StartOralSessionRequest,
  deps: OralPracticeDeps,
): Promise<OralPracticeRun> => {
  const transport = turnBasedTransport(deps);
  const run = await startOralSessionRun(request, { clock: deps.clock, items: deps.items, oral: deps.oral, transport });
  return { ...run, failure: transport.lastError };
};

/** One session type the picker offers: its scenario, and its length in minutes. */
export type OralSessionChoice = {
  readonly sessionType: OralSessionType;
  readonly scenario: OralScenario;
  /** The scenario's length: the sum of its phases' minutes. */
  readonly minutes: number;
};

/** The scenario bands: a study profile aiming at A practises at B, the lowest the bank plans. */
const scenarioBand = (targetBand: TargetBand): "B" | "C" => (targetBand === "C" ? "C" : "B");

/**
 * The practice picker's rows (product-requirements.md §8.6, progress.md D118): one scenario per
 * session type, in the PRD's order, in the language practised and at the study profile's band,
 * or the other band when the bank has none at it. A type the bank has no scenario for is left
 * out rather than offered empty.
 */
export const oralSessionChoices = async (
  request: { readonly targetBand: TargetBand; readonly lang: OralScenario["lang"] },
  deps: { readonly items: ItemRepository },
): Promise<readonly OralSessionChoice[]> => {
  const scenarios = (await deps.items.scenarios()).filter((s) => s.lang === request.lang);
  const band = scenarioBand(request.targetBand);
  return ORAL_SESSION_TYPES.flatMap((sessionType) => {
    const ofType = scenarios.filter((s) => s.sessionType === sessionType);
    const scenario = ofType.find((s) => s.targetBand === band) ?? ofType[0];
    if (scenario === undefined) return [];
    return [{ sessionType, scenario, minutes: scenario.phases.reduce((sum, phase) => sum + phase.minutes, 0) }];
  });
};

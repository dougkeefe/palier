import type { OralSessionChoice } from "@palier/app";
import { scenarioId } from "@palier/domain";
import type { Preflight } from "@palier/engine";
import { describe, expect, it } from "vitest";

import {
  INITIAL_PRACTICE,
  type PracticeState,
  endMessage,
  failureMessage,
  oralFailure,
  phaseProgress,
  practice,
  recordingsMegabytes,
  answerPause,
  canStart,
  sendsTo,
  sessionEstimate,
  studioModeNote,
  studioWarmup,
  turnFocus,
} from "./practice-view";

const phase = (minutes: number) => ({ name: "P", minutes, intent: "i", seedQuestions: ["q"], escalation: [], deescalation: [] });
const CHOICE: OralSessionChoice = {
  sessionType: "work",
  minutes: 10,
  scenario: { id: scenarioId("s"), lang: "fr", sessionType: "work", targetBand: "C", topic: "project-management", phases: [phase(2), phase(5), phase(3)] },
};
const PREFLIGHT: Preflight = { estimateUsd: 0.09, before: "none", after: "none" };
/** The session's price, as the controller dispatches it for `CHOICE` (D237): tagged with what it priced. */
const PRICED = { type: "preflighted", preflight: PREFLIGHT, scenarioId: CHOICE.scenario.id } as const;
const PRICED_STUDIO = { ...PRICED, held: "studio" } as const;
const QUESTION = { text: "Parlez-moi de votre poste.", audio: null, phase: 1 };
const named = (name: string) => Object.assign(new Error(name), { name });

const run = (...actions: Parameters<typeof practice>[1][]): PracticeState => actions.reduce(practice, INITIAL_PRACTICE);
const running = () =>
  run(
    { type: "choose", choice: CHOICE },
    { type: "mic", mic: "ok" },
    PRICED,
    { type: "started", nowMs: 1_000 },
  );

describe("practice, the screen's steps (D119)", () => {
  it("goes from the picker to the microphone check for the chosen session, with no estimate yet", () => {
    expect(run({ type: "choose", choice: CHOICE })).toEqual({ phase: "mic", choice: CHOICE, mic: "idle", preflight: null });
  });

  it("follows the microphone check, and shows the estimate on the same step, beside the start (D237)", () => {
    const checked = run({ type: "choose", choice: CHOICE }, { type: "mic", mic: "quiet" });
    expect(checked).toMatchObject({ phase: "mic", mic: "quiet" });
    expect(practice(checked, PRICED)).toEqual({
      phase: "mic",
      choice: CHOICE,
      mic: "quiet",
      preflight: PREFLIGHT,
    });
  });

  it("keeps the estimate through another microphone check", () => {
    const priced = run({ type: "choose", choice: CHOICE }, { type: "mic", mic: "quiet" }, PRICED);
    expect(practice(practice(priced, { type: "mic", mic: "listening" }), { type: "mic", mic: "ok" })).toMatchObject({
      mic: "ok",
      preflight: PREFLIGHT,
    });
  });

  it("ignores a price for another session or mode, which a slow read can deliver after Back (D237)", () => {
    const chosen = run({ type: "choose", choice: CHOICE }, { type: "mic", mic: "ok" });
    expect(practice(chosen, { ...PRICED, scenarioId: scenarioId("other") })).toBe(chosen);
    expect(practice(chosen, PRICED_STUDIO)).toBe(chosen);
    const studioChosen = run({ type: "choose", choice: CHOICE, held: "studio" }, { type: "mic", mic: "ok" });
    expect(practice(studioChosen, PRICED)).toBe(studioChosen);
    expect(practice(studioChosen, PRICED_STUDIO)).toMatchObject({ preflight: PREFLIGHT });
  });

  it("starts only once the microphone is open and the estimate is shown (D234, D237)", () => {
    const chosen = run({ type: "choose", choice: CHOICE });
    const heard = practice(chosen, { type: "mic", mic: "ok" });
    const priced = practice(heard, PRICED);
    expect(canStart(chosen)).toBe(false);
    expect(canStart(heard)).toBe(false);
    expect(canStart(priced)).toBe(true);
    expect(canStart(practice(priced, { type: "mic", mic: "quiet" }))).toBe(true);
    for (const mic of ["idle", "listening", "denied", "no-mic", "unsupported", "failed"] as const) {
      const refused = practice(priced, { type: "mic", mic });
      expect(canStart(refused)).toBe(false);
      expect(practice(refused, { type: "started", nowMs: 1 })).toBe(refused);
    }
    expect(practice(heard, { type: "started", nowMs: 1 })).toBe(heard);
    expect(canStart(INITIAL_PRACTICE)).toBe(false);
  });

  it("starts the session with nothing asked yet, and back always returns to the picker", () => {
    expect(running()).toEqual({
      phase: "running",
      choice: CHOICE,
      question: null,
      waiting: false,
      turn: "idle",
      recordFailed: false,
      ending: false,
      startedAtMs: 1_000,
    });
    expect(practice(running(), { type: "back" })).toEqual(INITIAL_PRACTICE);
  });

  it("shows each question as it waits, keeps it on screen once answered, and resets the turn for the next", () => {
    const asked = practice(running(), { type: "question", waiting: QUESTION });
    expect(asked).toMatchObject({ question: QUESTION, waiting: true, turn: "idle" });
    const recording = practice(asked, { type: "recording" });
    expect(recording).toMatchObject({ turn: "recording" });
    const sent = practice(practice(recording, { type: "sent" }), { type: "question", waiting: null });
    expect(sent).toMatchObject({ question: QUESTION, waiting: false, turn: "sending" });
    expect(practice(sent, { type: "question", waiting: { ...QUESTION, text: "Et ensuite ?" } })).toMatchObject({ turn: "idle", waiting: true });
  });

  it("stops waiting the moment an answer is sent, before the bridge says so, so no second answer can be recorded to it (D202)", () => {
    const asked = run(
      { type: "choose", choice: CHOICE },
      { type: "mic", mic: "ok" },
      PRICED,
      { type: "started", nowMs: 1 },
      { type: "question", waiting: QUESTION },
      { type: "recording" },
    );
    const sent = practice(asked, { type: "sent" });
    expect(sent).toMatchObject({ waiting: false, turn: "sending" });
    // A recording asked for now is refused: there is no question waiting for it.
    expect(practice(sent, { type: "recording" })).toMatchObject({ turn: "sending" });
  });

  it("keeps the question waiting when its recorder fails, says so, and clears it on the next try (D234)", () => {
    const recording = practice(practice(running(), { type: "question", waiting: QUESTION }), { type: "recording" });
    const failed = practice(recording, { type: "recordFailed" });
    expect(failed).toMatchObject({ turn: "idle", waiting: true, recordFailed: true });
    expect(practice(failed, { type: "recording" })).toMatchObject({ turn: "recording", recordFailed: false });
  });

  it("does not start recording when no question waits", () => {
    expect(practice(running(), { type: "recording" })).toMatchObject({ turn: "idle" });
  });

  it("marks the session ending, then ends it with what was kept", () => {
    const ending = practice(running(), { type: "ending" });
    expect(ending).toMatchObject({ ending: true });
    expect(practice(ending, { type: "ended", session: null, evicted: 2, failure: "timeout", recordingKept: true })).toEqual({
      phase: "ended",
      choice: CHOICE,
      session: null,
      evicted: 2,
      failure: "timeout",
      recordingKept: true,
    });
  });

  it("ignores an action that does not belong to the step it arrives in", () => {
    expect(run({ type: "started", nowMs: 1 })).toEqual(INITIAL_PRACTICE);
    const mic = run({ type: "choose", choice: CHOICE });
    expect(practice(mic, { type: "started", nowMs: 1 })).toBe(mic);
    const priced = practice(practice(mic, { type: "mic", mic: "ok" }), PRICED);
    expect(practice(priced, { type: "question", waiting: QUESTION })).toBe(priced);
    const live = running();
    expect(practice(live, { type: "choose", choice: CHOICE })).toBe(live);
    const ended = practice(live, { type: "ended", session: null, evicted: 0, failure: null, recordingKept: null });
    expect(practice(ended, { type: "question", waiting: QUESTION })).toBe(ended);
  });
});

describe("practice, studio mode's steps (D185)", () => {
  const studioPriced = () =>
    run(
      { type: "choose", choice: CHOICE, held: "studio" },
      { type: "mic", mic: "ok" },
      PRICED_STUDIO,
    );

  it("carries studio mode from the picker through the check and its estimate", () => {
    expect(run({ type: "choose", choice: CHOICE, held: "studio" })).toEqual({
      phase: "mic",
      choice: CHOICE,
      mic: "idle",
      preflight: null,
      held: "studio",
    });
    expect(studioPriced()).toEqual({ phase: "mic", choice: CHOICE, mic: "ok", preflight: PREFLIGHT, held: "studio" });
  });

  it("hands a studio session to the studio view, and never runs it as practice", () => {
    expect(practice(studioPriced(), { type: "studio" })).toEqual({ phase: "studio", choice: CHOICE });
    expect(practice(studioPriced(), { type: "started", nowMs: 1 })).toMatchObject({ phase: "mic" });
  });

  it("never hands a session to the studio view before it can start", () => {
    const unpriced = run({ type: "choose", choice: CHOICE, held: "studio" }, { type: "mic", mic: "ok" });
    expect(practice(unpriced, { type: "studio" })).toBe(unpriced);
  });

  it("never hands a practice session to the studio view", () => {
    const priced = run({ type: "choose", choice: CHOICE }, { type: "mic", mic: "ok" }, PRICED);
    expect(practice(priced, { type: "studio" })).toBe(priced);
  });

  it("comes back from the studio view to the same end card, and ignores anything else meanwhile", () => {
    const studio = practice(studioPriced(), { type: "studio" });
    expect(practice(studio, { type: "question", waiting: QUESTION })).toBe(studio);
    expect(practice(studio, { type: "ended", session: null, evicted: 0, failure: "invalid-key", recordingKept: true })).toEqual({
      phase: "ended",
      choice: CHOICE,
      session: null,
      evicted: 0,
      failure: "invalid-key",
      recordingKept: true,
    });
    expect(practice(studio, { type: "back" })).toEqual(INITIAL_PRACTICE);
  });
});

describe("studioWarmup (D190)", () => {
  it("wakes the route on the microphone check of a studio session, where it also starts (D237)", () => {
    const mic = run({ type: "choose", choice: CHOICE, held: "studio" });
    expect(studioWarmup(mic)).toBe("mic");
    expect(studioWarmup(practice(mic, { type: "mic", mic: "ok" }))).toBe("mic");
    expect(studioWarmup(practice(mic, PRICED_STUDIO))).toBe("mic");
  });

  it("never wakes it for practice mode", () => {
    const practiceMic = run({ type: "choose", choice: CHOICE });
    expect(studioWarmup(practiceMic)).toBeNull();
    expect(studioWarmup(practice(practiceMic, PRICED))).toBeNull();
  });

  it("never wakes it once the tap is made, or before a session is chosen", () => {
    const studioPriced = run(
      { type: "choose", choice: CHOICE, held: "studio" },
      { type: "mic", mic: "ok" },
      PRICED_STUDIO,
    );
    expect(studioWarmup(INITIAL_PRACTICE)).toBeNull();
    expect(studioWarmup(practice(studioPriced, { type: "studio" }))).toBeNull();
  });
});

describe("oralFailure and its words (D119)", () => {
  it.each([
    ["InvalidApiKeyError", "invalid-key", "failInvalidKey"],
    ["RateLimitError", "out-of-credit", "failOutOfCredit"],
    ["ProviderTimeoutError", "timeout", "failTimeout"],
    ["ProviderUnavailableError", "unreachable", "failUnreachable"],
    ["InvalidResponseError", "unexpected", "failUnexpected"],
    ["NoApiKeyError", "no-key", "failNoKey"],
    ["Error", "failed", "failFailed"],
    ["SelfHostedEndpointError", "endpoint", "failEndpoint"],
    ["RouteThrottledError", "throttled", "failThrottled"],
  ] as const)("names %s as %s", (name, failure, key) => {
    expect(oralFailure(named(name))).toBe(failure);
    expect(failureMessage(failure)).toBe(key);
  });
});

describe("where the key goes, in the pre-flight's line and the picker's callout (D186, D192)", () => {
  it("names Palier's route for studio mode, or the user's own endpoint when this device has one", () => {
    expect(sendsTo(true, false)).toBe("sendsToStudio");
    expect(sendsTo(true, true)).toBe("sendsToStudioOwn");
    expect(studioModeNote(false)).toBe("studioMode");
    expect(studioModeNote(true)).toBe("studioModeOwn");
  });

  it("keeps practice mode's lines, endpoint or not, since practice never mints a secret", () => {
    expect(sendsTo(false, false)).toBe("sendsToSpoken");
    expect(sendsTo(false, true)).toBe("sendsToSpoken");
  });
});

describe("endMessage (D119)", () => {
  it.each([
    ["completed", "endCompleted"],
    ["ended-by-user", "endByYou"],
    ["transport-failed", "endFailed"],
    ["time-cap", "endTimeCap"],
    ["interrupted", "endOther"],
    [null, "endOther"],
  ] as const)("says how a session that ended %s ended", (reason, key) => {
    expect(endMessage(reason)).toBe(key);
  });
});

describe("sessionEstimate (D119)", () => {
  it("is the minute's estimate times the session's minutes, or none when the minute is unpriced", () => {
    expect(sessionEstimate(0.01, 22)).toBeCloseTo(0.22, 12);
    expect(sessionEstimate(null, 22)).toBeNull();
  });
});

describe("phaseProgress (D119)", () => {
  it("counts the question's part from one, of the scenario's parts, and starts at the first", () => {
    expect(phaseProgress(QUESTION, CHOICE)).toEqual({ part: 2, of: 3 });
    expect(phaseProgress(null, CHOICE)).toEqual({ part: 1, of: 3 });
  });
});

describe("recordingsMegabytes (D119)", () => {
  it("is nothing for no recordings, at least a tenth for any, and megabytes otherwise", () => {
    expect(recordingsMegabytes(0)).toBe(0);
    expect(recordingsMegabytes(20_000)).toBe(0.1);
    expect(recordingsMegabytes(250 * 1_048_576)).toBe(250);
  });

  it("reads the warning threshold, 200 × 1,024 × 1,024 bytes, as exactly 200 megabytes (D121)", () => {
    expect(recordingsMegabytes(200 * 1024 * 1024)).toBe(200);
  });
});

describe("turnFocus (D121)", () => {
  it("goes to the question when one starts waiting to be answered, the first or the next", () => {
    expect(turnFocus({ waiting: false }, { waiting: true })).toBe("question");
    expect(turnFocus(null, { waiting: true })).toBe("question");
  });

  it("stays put while the same question waits, and while none does", () => {
    expect(turnFocus({ waiting: true }, { waiting: true })).toBeNull();
    expect(turnFocus({ waiting: true }, { waiting: false })).toBeNull();
  });
});

describe("answerPause (D127)", () => {
  it("runs from the question's appearing when it had no voice", () => {
    expect(answerPause({ shownAtMs: 1_000, voiced: false, heardAtMs: null }, 3_500.4)).toBe(2_500);
  });

  it("runs from when the voice stopped, and is none when Record is pressed over it", () => {
    expect(answerPause({ shownAtMs: 1_000, voiced: true, heardAtMs: 6_000 }, 7_200)).toBe(1_200);
    expect(answerPause({ shownAtMs: 1_000, voiced: true, heardAtMs: null }, 7_200)).toBe(0);
  });

  it("is never below zero", () => {
    expect(answerPause({ shownAtMs: 5_000, voiced: false, heardAtMs: null }, 4_000)).toBe(0);
  });
});

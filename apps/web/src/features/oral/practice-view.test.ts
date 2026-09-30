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
  sessionEstimate,
  turnFocus,
} from "./practice-view";

const phase = (minutes: number) => ({ name: "P", minutes, intent: "i", seedQuestions: ["q"], escalation: [], deescalation: [] });
const CHOICE: OralSessionChoice = {
  sessionType: "work",
  minutes: 10,
  scenario: { id: scenarioId("s"), lang: "fr", sessionType: "work", targetBand: "C", topic: "project-management", phases: [phase(2), phase(5), phase(3)] },
};
const PREFLIGHT: Preflight = { estimateUsd: 0.09, before: "none", after: "none" };
const QUESTION = { text: "Parlez-moi de votre poste.", audio: null, phase: 1 };
const named = (name: string) => Object.assign(new Error(name), { name });

const run = (...actions: Parameters<typeof practice>[1][]): PracticeState => actions.reduce(practice, INITIAL_PRACTICE);
const running = () =>
  run({ type: "choose", choice: CHOICE }, { type: "preflighted", mode: "spoken", preflight: PREFLIGHT }, { type: "started", nowMs: 1_000 });

describe("practice, the screen's steps (D119)", () => {
  it("goes from the picker to the microphone check for the chosen session", () => {
    expect(run({ type: "choose", choice: CHOICE })).toEqual({ phase: "mic", choice: CHOICE, mic: "idle" });
  });

  it("follows the microphone check, then confirms the estimate in the mode chosen", () => {
    const checked = run({ type: "choose", choice: CHOICE }, { type: "mic", mic: "denied" });
    expect(checked).toMatchObject({ phase: "mic", mic: "denied" });
    expect(practice(checked, { type: "preflighted", mode: "typed", preflight: PREFLIGHT })).toEqual({
      phase: "confirming",
      choice: CHOICE,
      mode: "typed",
      preflight: PREFLIGHT,
    });
  });

  it("starts the session with nothing asked yet, and back always returns to the picker", () => {
    expect(running()).toEqual({
      phase: "running",
      choice: CHOICE,
      mode: "spoken",
      question: null,
      waiting: false,
      turn: "idle",
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

  it("starts in the mode the controller says, when the recorder could not be made (D121)", () => {
    const typed = run({ type: "choose", choice: CHOICE }, { type: "preflighted", mode: "spoken", preflight: PREFLIGHT }, { type: "started", nowMs: 1, mode: "typed" });
    expect(typed).toMatchObject({ phase: "running", mode: "typed" });
  });

  it("answers by typing for the rest of the session once the recorder fails (D121)", () => {
    const recording = practice(practice(running(), { type: "question", waiting: QUESTION }), { type: "recording" });
    expect(practice(recording, { type: "recordFailed" })).toMatchObject({ mode: "typed", turn: "idle", waiting: true });
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
    const confirming = practice(mic, { type: "preflighted", mode: "spoken", preflight: PREFLIGHT });
    expect(practice(confirming, { type: "question", waiting: QUESTION })).toBe(confirming);
    const live = running();
    expect(practice(live, { type: "choose", choice: CHOICE })).toBe(live);
    const ended = practice(live, { type: "ended", session: null, evicted: 0, failure: null, recordingKept: null });
    expect(practice(ended, { type: "question", waiting: QUESTION })).toBe(ended);
  });
});

describe("practice, studio mode's steps (D185)", () => {
  const studioConfirming = () =>
    run(
      { type: "choose", choice: CHOICE, held: "studio" },
      { type: "mic", mic: "ok" },
      { type: "preflighted", mode: "spoken", preflight: PREFLIGHT, held: "studio" },
    );

  it("carries studio mode from the picker through the check to the pre-flight", () => {
    expect(run({ type: "choose", choice: CHOICE, held: "studio" })).toEqual({ phase: "mic", choice: CHOICE, mic: "idle", held: "studio" });
    expect(studioConfirming()).toEqual({ phase: "confirming", choice: CHOICE, mode: "spoken", preflight: PREFLIGHT, held: "studio" });
  });

  it("prices a studio choice that fell back to typing as practice", () => {
    const mic = run({ type: "choose", choice: CHOICE, held: "studio" });
    expect(practice(mic, { type: "preflighted", mode: "typed", preflight: PREFLIGHT })).not.toHaveProperty("held");
  });

  it("hands a studio session to the studio view, and never runs it as practice", () => {
    expect(practice(studioConfirming(), { type: "studio" })).toEqual({ phase: "studio", choice: CHOICE });
    expect(practice(studioConfirming(), { type: "started", nowMs: 1 })).toMatchObject({ phase: "confirming" });
  });

  it("never hands a practice session to the studio view", () => {
    const confirming = run({ type: "choose", choice: CHOICE }, { type: "preflighted", mode: "spoken", preflight: PREFLIGHT });
    expect(practice(confirming, { type: "studio" })).toBe(confirming);
  });

  it("comes back from the studio view to the same end card, and ignores anything else meanwhile", () => {
    const studio = practice(studioConfirming(), { type: "studio" });
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

describe("oralFailure and its words (D119)", () => {
  it.each([
    ["InvalidApiKeyError", "invalid-key", "failInvalidKey"],
    ["RateLimitError", "out-of-credit", "failOutOfCredit"],
    ["ProviderTimeoutError", "timeout", "failTimeout"],
    ["ProviderUnavailableError", "unreachable", "failUnreachable"],
    ["InvalidResponseError", "unexpected", "failUnexpected"],
    ["NoApiKeyError", "no-key", "failNoKey"],
    ["Error", "failed", "failFailed"],
  ] as const)("names %s as %s", (name, failure, key) => {
    expect(oralFailure(named(name))).toBe(failure);
    expect(failureMessage(failure)).toBe(key);
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
  it("goes to the question when one starts waiting to be answered aloud, and to the field when it is to be typed", () => {
    expect(turnFocus({ waiting: false }, { waiting: true, mode: "spoken" })).toBe("question");
    expect(turnFocus(null, { waiting: true, mode: "typed" })).toBe("answer");
  });

  it("stays put while the same question waits, and while none does", () => {
    expect(turnFocus({ waiting: true }, { waiting: true, mode: "spoken" })).toBeNull();
    expect(turnFocus({ waiting: true }, { waiting: false, mode: "spoken" })).toBeNull();
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

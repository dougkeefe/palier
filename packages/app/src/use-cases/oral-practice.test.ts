import { describe, expect, it } from "vitest";

import type { OralScenario } from "@palier/domain";
import { scenarioId } from "@palier/domain";

import type { OralTransportEvent } from "../ports/index.js";
import { NoApiKeyError } from "./api-key.js";
import { oralSessionChoices, startOralPracticeRun, turnBasedTransport } from "./oral-practice.js";
import {
  SCENARIO,
  SESSION_ID,
  examinerProvider,
  handAnswers,
  oralStore,
  scenarioBank,
  settableClock,
  settled,
  vaultWith,
} from "./__tests__/oral-fakes.js";
import { costLedger } from "./__tests__/spend-fakes.js";

const SEC = 1_000;

const setUp = (options: Parameters<typeof examinerProvider>[0] = {}, key: string | null = "sk-test") => {
  const ai = examinerProvider(options);
  const hand = handAnswers();
  const clock = settableClock();
  const ledger = costLedger();
  const transport = turnBasedTransport({
    vault: vaultWith(key),
    aiProvider: () => ai.provider,
    ledger,
    clock,
    answers: hand.answers,
  });
  const events: OralTransportEvent[] = [];
  const open = (scenario: OralScenario = SCENARIO) => transport.open({ scenario }, (event) => void events.push(event));
  return { ai, hand, clock, ledger, transport, events, open };
};

const turns = (events: readonly OralTransportEvent[]) => events.flatMap((e) => (e.kind === "turn" ? [e] : []));
const closes = (events: readonly OralTransportEvent[]) => events.filter((e) => e.kind === "closed");
const clip = (words: string, durationMs: number) =>
  ({ kind: "audio", audio: new Blob([words], { type: "audio/webm" }), durationMs }) as const;

describe("turnBasedTransport — the turn loop (D118)", () => {
  it("opens by asking phase 0 at its baseline, with nothing said yet, and hands the voiced question to the candidate", async () => {
    const { ai, hand, events, open } = setUp();
    await open();
    await settled();

    expect(ai.examinerRequests).toHaveLength(1);
    expect(ai.examinerRequests[0]).toMatchObject({
      sessionType: "work",
      targetBand: "C",
      lang: "fr",
      topic: "project-management",
      phase: SCENARIO.phases[0],
      register: "baseline",
      transcript: [],
    });
    expect(ai.spoken).toEqual(["Question 1"]);
    expect(turns(events)).toEqual([{ kind: "turn", speaker: "examiner", text: "Question 1", startMs: 0, endMs: 0 }]);
    expect(hand.questions).toHaveLength(1);
    expect(hand.questions[0]?.text).toBe("Question 1");
    expect(hand.questions[0]?.phase).toBe(0);
    expect(await hand.questions[0]?.audio?.text()).toBe("Question 1");
  });

  it("transcribes a clip in the scenario's language, and times the answer from when it arrived back by its length", async () => {
    const { ai, hand, clock, events, open } = setUp();
    await open();
    await settled();
    clock.at(0.5); // 30 s after the question
    hand.give(clip("Je gère un projet.", 20 * SEC));
    await settled();

    expect(ai.transcribed).toEqual([{ lang: "fr", durationMs: 20 * SEC }]);
    expect(turns(events)[1]).toEqual({
      kind: "turn",
      speaker: "candidate",
      text: "Je gère un projet.",
      startMs: 10 * SEC,
      endMs: 30 * SEC,
      input: "voice",
    });
    expect(ai.examinerRequests[1]?.transcript).toEqual([
      { speaker: "examiner", text: "Question 1" },
      { speaker: "candidate", text: "Je gère un projet." },
    ]);
    expect(turns(events)[2]).toMatchObject({ speaker: "examiner", text: "Question 2", startMs: 30 * SEC });
  });

  it("takes typed words as they are, with no transcription, spanning the wait for them", async () => {
    const { ai, hand, clock, events, open } = setUp();
    await open();
    await settled();
    clock.at(1);
    hand.give({ kind: "typed", text: "Je suis analyste." });
    await settled();

    expect(ai.transcribed).toEqual([]);
    expect(turns(events)[1]).toEqual({
      kind: "turn",
      speaker: "candidate",
      text: "Je suis analyste.",
      startMs: 0,
      endMs: 60 * SEC,
      input: "typed",
    });
  });

  it("never starts a clip before its own question was shown, whatever length it claims (D121)", async () => {
    const { hand, clock, events, open } = setUp();
    await open();
    await settled();
    clock.at(0.25); // 15 s in, a clip that claims 40 s, answering the question shown at 0
    hand.give(clip("Un.", 40 * SEC));
    await settled();
    clock.at(0.5); // 30 s in, a clip that claims 60 s, answering the question shown at 15 s
    hand.give(clip("Deux.", 60 * SEC));
    await settled();

    const candidate = turns(events).filter((t) => t.speaker === "candidate");
    expect(candidate.map((t) => [t.startMs, t.endMs])).toEqual([
      [0, 15 * SEC],
      [15 * SEC, 30 * SEC],
    ]);
  });

  it("passes the examiner's difficulty flag on before the question it came with", async () => {
    const { hand, events, open } = setUp({ flags: [null, "escalate"] });
    await open();
    await settled();
    hand.give({ kind: "typed", text: "Oui." });
    await settled();

    expect(events.map((e) => e.kind)).toEqual(["turn", "turn", "difficulty", "turn"]);
    expect(events[2]).toEqual({ kind: "difficulty", direction: "escalate" });
  });

  it("asks the question as text only when the provider has no voice", async () => {
    const { ai, hand, open } = setUp({ speaks: false });
    await open();
    await settled();

    expect(ai.spoken).toEqual([]);
    expect(hand.questions[0]?.audio).toBeNull();
  });

  it("meters every call as oral practice: each question written and voiced, and each clip transcribed", async () => {
    const { hand, ledger, open } = setUp();
    await open();
    await settled();
    hand.give(clip("Oui.", 2 * SEC));
    await settled();

    const rows = ledger.entries();
    expect(rows.map((r) => r.model)).toEqual(["m-examiner", "m-speech", "m-transcribe", "m-examiner", "m-speech"]);
    expect(new Set(rows.map((r) => r.feature))).toEqual(new Set(["oral-practice"]));
    // No session named in the deps, so the rows name none (D125).
    expect(rows.every((r) => !("sessionId" in r))).toBe(true);
  });

  it("records every call under the session it spends on, when the deps name one (D125)", async () => {
    const ai = examinerProvider();
    const hand = handAnswers();
    const ledger = costLedger();
    const transport = turnBasedTransport({
      vault: vaultWith("sk-test"),
      aiProvider: () => ai.provider,
      ledger,
      clock: settableClock(),
      answers: hand.answers,
      sessionId: SESSION_ID,
    });
    await transport.open({ scenario: SCENARIO }, () => undefined);
    await settled();
    hand.give(clip("Oui.", 2 * SEC));
    await settled();

    const rows = ledger.entries();
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.sessionId === SESSION_ID)).toBe(true);
  });
});

describe("turnBasedTransport — directives (D118)", () => {
  it("refuses a directive before it is open", async () => {
    const { transport } = setUp();
    await expect(transport.direct({ phase: 0, register: "baseline" })).rejects.toThrow(/not open/);
  });

  it("asks the next question in the phase and register the client directed, without waiting for it", async () => {
    const { ai, hand, transport, open } = setUp();
    await open();
    await settled();
    await transport.direct({ phase: 1, register: "escalate" });
    expect(ai.examinerRequests).toHaveLength(1);
    hand.give({ kind: "typed", text: "Oui." });
    await settled();

    expect(ai.examinerRequests[1]).toMatchObject({ phase: SCENARIO.phases[1], register: "escalate" });
    expect(hand.questions[1]?.phase).toBe(1);
  });

  it("keeps the last phase for a directive past the scenario's end, and the first for one before it", async () => {
    const { ai, hand, transport, open } = setUp();
    await open();
    await settled();
    await transport.direct({ phase: 9, register: "baseline" });
    hand.give({ kind: "typed", text: "Oui." });
    await settled();
    await transport.direct({ phase: -1, register: "deescalate" });
    hand.give({ kind: "typed", text: "Non." });
    await settled();

    expect(ai.examinerRequests.map((r) => [r.phase.name, r.register])).toEqual([
      ["Phase 1", "baseline"],
      ["Phase 3", "baseline"],
      ["Phase 1", "deescalate"],
    ]);
  });

  it("treats a directive after closing as a no-op", async () => {
    const { ai, transport, open } = setUp();
    await open();
    await settled();
    await transport.close();

    await expect(transport.direct({ phase: 2, register: "escalate" })).resolves.toBeUndefined();
    expect(ai.examinerRequests).toHaveLength(1);
  });
});

describe("turnBasedTransport — closing (D118)", () => {
  it("stops waiting for an answer when closed, and says closed once, last, however often it is asked", async () => {
    const { ai, hand, transport, events, open } = setUp();
    await open();
    await settled();
    await transport.close();
    await transport.close();
    await settled();

    expect(hand.signals[0]?.aborted).toBe(true);
    expect(closes(events)).toEqual([{ kind: "closed", failed: false }]);
    expect(events.at(-1)).toEqual({ kind: "closed", failed: false });
    expect(ai.examinerRequests).toHaveLength(1);
  });

  it("delivers an answer still being transcribed before it says closed", async () => {
    const { ai, hand, transport, events, open } = setUp({ holdTranscribe: true });
    await open();
    await settled();
    hand.give(clip("Presque fini.", 3 * SEC));
    await settled();
    const closing = transport.close();
    ai.release();
    await closing;

    expect(events.slice(-2)).toEqual([
      { kind: "turn", speaker: "candidate", text: "Presque fini.", startMs: 0, endMs: 0, input: "voice" },
      { kind: "closed", failed: false },
    ]);
    expect(ai.examinerRequests).toHaveLength(1);
  });

  it("delivers a question still being written before it says closed, voices none of it, and asks for no answer (D121)", async () => {
    const { ai, hand, transport, events, open } = setUp({ holdExaminer: true });
    await open();
    const closing = transport.close();
    ai.release();
    await closing;

    expect(events.map((e) => e.kind)).toEqual(["turn", "closed"]);
    expect(hand.questions).toEqual([]);
    expect(ai.spoken).toEqual([]);
  });

  it("shows and stores a question in the phase it was written from, though the phase moves while it is written (D121)", async () => {
    const { ai, hand, transport, open } = setUp({ holdExaminer: true });
    await open();
    await settled();
    await transport.direct({ phase: 1, register: "baseline" });
    ai.release();
    await settled();

    expect(ai.examinerRequests[0]?.phase).toBe(SCENARIO.phases[0]);
    expect(hand.questions[0]?.phase).toBe(0);
  });

  it("gives each wait for an answer its own signal, aborting only the one in progress on close (D121)", async () => {
    const { hand, transport, open } = setUp();
    await open();
    await settled();
    hand.give({ kind: "typed", text: "Oui." });
    await settled();
    await transport.close();

    expect(hand.signals).toHaveLength(2);
    expect(hand.signals[0]).not.toBe(hand.signals[1]);
    expect(hand.signals.map((signal) => signal.aborted)).toEqual([false, true]);
  });

  it("closes with nothing to say when it was never opened, and cannot be opened after", async () => {
    const { transport, events, open } = setUp();
    await transport.close();
    expect(events).toEqual([]);
    await expect(open()).rejects.toThrow(/opens once/);
  });

  it("opens once", async () => {
    const { open } = setUp();
    await open();
    await expect(open()).rejects.toThrow(/opens once/);
  });
});

describe("turnBasedTransport — failures close it failed (D118)", () => {
  it.each([
    ["the examiner's call", "examinerTurn"],
    ["the voice", "speak"],
    ["the transcription", "transcribe"],
  ] as const)("closes failed when %s fails, keeping the error for the screen", async (_, method) => {
    const error = Object.assign(new Error("rate limited"), { name: "RateLimitError" });
    const { hand, transport, events, open } = setUp({ fail: { method, error } });
    await open();
    await settled();
    if (hand.waiting()) hand.give(clip("Oui.", SEC));
    await settled();
    await transport.close();

    expect(closes(events)).toEqual([{ kind: "closed", failed: true }]);
    expect(events.at(-1)).toEqual({ kind: "closed", failed: true });
    expect(transport.lastError()).toBe(error);
  });

  it("closes failed when the candidate's side fails without being asked to stop", async () => {
    const { hand, transport, events, open } = setUp();
    await open();
    await settled();
    const broken = new Error("the microphone went away");
    hand.refuse(broken);
    await settled();

    expect(closes(events)).toEqual([{ kind: "closed", failed: true }]);
    expect(transport.lastError()).toBe(broken);
  });

  it("closes failed with no key, naming it", async () => {
    const { transport, events, open } = setUp({}, null);
    await open();
    await settled();

    expect(closes(events)).toEqual([{ kind: "closed", failed: true }]);
    expect(transport.lastError()).toBeInstanceOf(NoApiKeyError);
  });

  it("closes failed on a scenario with no phases, which the schema never lets through", async () => {
    const { transport, events, open } = setUp();
    await open({ ...SCENARIO, phases: [] });
    await settled();

    expect(closes(events)).toEqual([{ kind: "closed", failed: true }]);
    expect(String(transport.lastError())).toMatch(/has no phases/);
  });

  it("has no error while it has not failed", async () => {
    const { transport, open } = setUp();
    await open();
    await settled();
    expect(transport.lastError()).toBeNull();
  });
});

describe("startOralPracticeRun (D118)", () => {
  const start = (options: Parameters<typeof examinerProvider>[0] = {}) => {
    const ai = examinerProvider(options);
    const hand = handAnswers();
    const clock = settableClock();
    const oral = oralStore();
    const ledger = costLedger();
    const deps = {
      vault: vaultWith("sk-test"),
      aiProvider: () => ai.provider,
      ledger,
      clock,
      items: scenarioBank(),
      oral,
      answers: hand.answers,
    };
    return { ai, hand, clock, oral, ledger, run: startOralPracticeRun({ sessionId: SESSION_ID, scenarioId: SCENARIO.id }, deps) };
  };

  it("stores how each answer arrived, records the session's calls under it, and leaves it unassessed (D122, D125)", async () => {
    const { hand, ledger, run } = start();
    const running = await run;
    await settled();
    hand.give(clip("Je gère un projet.", 2 * SEC));
    await settled();
    hand.give({ kind: "typed", text: "Oui." });
    await settled();
    await running.endByUser();
    const ended = await running.ended;

    expect(ended.turns.filter((t) => t.speaker === "candidate").map((t) => t.input)).toEqual(["voice", "typed"]);
    expect(ended.turns.filter((t) => t.speaker === "examiner").every((t) => t.input === undefined)).toBe(true);
    expect(ended.assessment).toBeNull();
    expect(ledger.entries().every((r) => r.sessionId === SESSION_ID)).toBe(true);
  });

  it("runs the session driver over a turn-based transport, keeping each turn as it arrives", async () => {
    const { hand, oral, run } = start();
    const running = await run;
    await settled();
    hand.give({ kind: "typed", text: "Je suis analyste." });
    await settled();
    await running.endByUser();
    const ended = await running.ended;

    expect(ended.endReason).toBe("ended-by-user");
    expect(ended.turns.map((t) => [t.speaker, t.text, t.phase])).toEqual([
      ["examiner", "Question 1", 0],
      ["candidate", "Je suis analyste.", 0],
      ["examiner", "Question 2", 0],
    ]);
    expect((await oral.get(SESSION_ID))?.turns).toHaveLength(3);
    expect(running.failure()).toBeNull();
  });

  it("moves the examiner to the next phase when the screen's tick crosses a boundary", async () => {
    const { ai, hand, clock, run } = start();
    const running = await run;
    await settled();
    clock.at(2.5); // phase 1 runs from 2 to 7 minutes
    await running.tick();
    hand.give({ kind: "typed", text: "Oui." });
    await settled();

    expect(ai.examinerRequests[1]?.phase).toBe(SCENARIO.phases[1]);
  });

  it("ends the session as a failed transport, and names why, when a call fails", async () => {
    const error = Object.assign(new Error("bad key"), { name: "InvalidApiKeyError" });
    const { run } = start({ fail: { method: "examinerTurn", error } });
    const running = await run;
    const ended = await running.ended;

    expect(ended.endReason).toBe("transport-failed");
    expect(running.failure()).toBe(error);
  });
});

describe("oralSessionChoices (D118)", () => {
  const scenario = (sessionType: OralScenario["sessionType"], targetBand: "B" | "C", minutes: readonly number[], lang: "fr" | "en" = "fr") => ({
    ...SCENARIO,
    id: scenarioId(`s-${sessionType}-${targetBand}-${lang}`),
    sessionType,
    targetBand,
    lang,
    phases: minutes.map((m, i) => ({ ...SCENARIO.phases[0]!, name: `P${String(i)}`, minutes: m })),
  });
  const bank = scenarioBank([
    scenario("full", "C", [10, 12]),
    scenario("full", "B", [11, 11]),
    scenario("warmup", "B", [2, 3]),
    scenario("warmup", "C", [2, 3]),
    scenario("opinion", "C", [4, 8]),
    scenario("work", "B", [10], "en"),
  ]);

  it("offers one scenario per session type in the PRD's order, at the study band, with its length", async () => {
    const choices = await oralSessionChoices({ targetBand: "C", lang: "fr" }, { items: bank });
    expect(choices.map((c) => [c.sessionType, c.scenario.targetBand, c.minutes])).toEqual([
      ["warmup", "C", 5],
      ["opinion", "C", 12],
      ["full", "C", 22],
    ]);
  });

  it("practises a study profile aiming at A at band B, the lowest the bank plans", async () => {
    const choices = await oralSessionChoices({ targetBand: "A", lang: "fr" }, { items: bank });
    expect(choices.map((c) => [c.sessionType, c.scenario.targetBand])).toEqual([
      ["warmup", "B"],
      ["opinion", "C"],
      ["full", "B"],
    ]);
  });

  it("leaves out a type with no scenario in the language practised, rather than offer it empty", async () => {
    const choices = await oralSessionChoices({ targetBand: "B", lang: "fr" }, { items: bank });
    expect(choices.map((c) => c.sessionType)).not.toContain("work");
    expect(choices.map((c) => c.sessionType)).not.toContain("situation");
  });
});

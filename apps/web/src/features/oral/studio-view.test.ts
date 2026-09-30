import type { OralSessionChoice } from "@palier/app";
import { scenarioId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { INITIAL_STUDIO, type StudioState, meterWords, spentOf, studio, studioProgress, studioStatus } from "./studio-view";

const phase = (minutes: number) => ({ name: "P", minutes, intent: "i", seedQuestions: ["q"], escalation: [], deescalation: [] });
const CHOICE: OralSessionChoice = {
  sessionType: "work",
  minutes: 10,
  scenario: { id: scenarioId("s"), lang: "fr", sessionType: "work", targetBand: "C", topic: "project-management", phases: [phase(2), phase(5), phase(3)] },
};
const line = (usd: number, calls: number, unpriced = 0) => ({ usd, calls, unpriced });

const live = (): Extract<StudioState, { phase: "live" }> => {
  const state = studio(INITIAL_STUDIO, { type: "started", choice: CHOICE, nowMs: 1_000 });
  if (state.phase !== "live") throw new Error("started is live");
  return state;
};

describe("studio, the conversation's steps (D185)", () => {
  it("starts dialling, at the first phase, with nothing spent yet", () => {
    expect(live()).toEqual({
      phase: "live",
      choice: CHOICE,
      connected: false,
      startedAtMs: 1_000,
      phaseIndex: 0,
      spent: null,
      repeating: false,
      ending: false,
    });
  });

  it("opens, moves through the phases with the cost so far, and keeps the last cost when a read found none", () => {
    const open = studio(live(), { type: "connected" });
    expect(open).toMatchObject({ connected: true });
    const moved = studio(open, { type: "progress", phaseIndex: 1, spent: { usd: 0.1, floor: false } });
    expect(moved).toMatchObject({ phaseIndex: 1, spent: { usd: 0.1, floor: false } });
    expect(studio(moved, { type: "progress", phaseIndex: 2, spent: null })).toMatchObject({ phaseIndex: 2, spent: { usd: 0.1 } });
  });

  it("marks a repeat in flight, and the end asked for", () => {
    expect(studio(live(), { type: "repeating", on: true })).toMatchObject({ repeating: true });
    expect(studio(live(), { type: "ending" })).toMatchObject({ ending: true });
  });

  it("goes back to idle once the end card has the session, and an idle screen ignores a late event", () => {
    expect(studio(live(), { type: "reset" })).toEqual(INITIAL_STUDIO);
    expect(studio(INITIAL_STUDIO, { type: "connected" })).toBe(INITIAL_STUDIO);
    expect(studio(INITIAL_STUDIO, { type: "progress", phaseIndex: 1, spent: null })).toBe(INITIAL_STUDIO);
  });
});

describe("spentOf (D182)", () => {
  it("is the conversation's line, a floor when a call was unpriced", () => {
    expect(spentOf({ practice: line(0, 0), studio: line(0.12, 4), report: line(0, 0) })).toEqual({ usd: 0.12, floor: false });
    expect(spentOf({ practice: line(0, 0), studio: line(0.12, 4, 1), report: line(0, 0) })).toEqual({ usd: 0.12, floor: true });
  });

  it("is nothing before the first row, or for a session the device does not hold", () => {
    expect(spentOf({ practice: line(0, 0), studio: line(0, 0), report: line(0, 0) })).toBeNull();
    expect(spentOf(null)).toBeNull();
  });
});

describe("meterWords (D185)", () => {
  it("says what the conversation has cost so far, as at least that when a call was unpriced", () => {
    expect(meterWords({ usd: 0.42, floor: false }, "en")).toEqual({ key: "meterSoFar", values: { amount: "US$0.42" } });
    expect(meterWords({ usd: 0.42, floor: true }, "en")).toEqual({ key: "meterFloor", values: { amount: "US$0.42" } });
  });

  it("says nothing is counted yet before the first row", () => {
    expect(meterWords(null, "en")).toEqual({ key: "meterNothing" });
  });
});

describe("studioStatus and studioProgress (D185)", () => {
  it("says the conversation is dialling, open, or ending", () => {
    expect(studioStatus(live())).toBe("studioConnecting");
    expect(studioStatus({ ...live(), connected: true })).toBe("studioLive");
    expect(studioStatus({ ...live(), connected: true, ending: true })).toBe("studioEnding");
  });

  it("counts the phase from one, never past the last", () => {
    expect(studioProgress(live())).toEqual({ part: 1, of: 3 });
    expect(studioProgress({ ...live(), phaseIndex: 2 })).toEqual({ part: 3, of: 3 });
    expect(studioProgress({ ...live(), phaseIndex: 7 })).toEqual({ part: 3, of: 3 });
  });
});

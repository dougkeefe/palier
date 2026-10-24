import type { OralHistoryEntry, OralSessionChoice } from "@palier/app";
import { type OralSessionType, scenarioId, sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { oralPlan, suggestedSession } from "./oral-plan";

const choice = (sessionType: OralSessionType, minutes = 10): OralSessionChoice => ({
  sessionType,
  minutes,
  scenario: {
    id: scenarioId(`s-${sessionType}`),
    lang: "fr",
    sessionType,
    targetBand: "C",
    topic: "project-management",
    phases: [{ name: "P", minutes, intent: "i", seedQuestions: ["q"], escalation: [], deescalation: [] }],
  },
});

const PICKER = [choice("warmup", 5), choice("work"), choice("opinion"), choice("situation")];

/** One ended session; give them newest first, as `oralHistory` does. */
const past = (sessionType: OralSessionType | null, n: number): OralHistoryEntry => ({
  id: sessionId(`oral-${String(n)}`),
  scenarioId: scenarioId(`s-${sessionType ?? "gone"}`),
  sessionType,
  startedAt: `2026-10-${String(20 - n).padStart(2, "0")}T12:00:00.000Z`,
  endReason: "completed",
  assessed: false,
  answered: true,
});

const NOTHING_TODAY = { oralSessions: 0, oralMs: 0 };

describe("suggestedSession", () => {
  it("suggests the picker's first session on a device that has never spoken", () => {
    expect(suggestedSession(PICKER, [])?.sessionType).toBe("warmup");
  });

  it("suggests a kind never practised before any already practised, in the picker's order", () => {
    expect(suggestedSession(PICKER, [past("warmup", 1), past("opinion", 2)])?.sessionType).toBe("work");
  });

  it("suggests the kind practised longest ago once every kind has been practised", () => {
    const history = [past("work", 1), past("warmup", 2), past("situation", 3), past("work", 4), past("opinion", 5)];
    expect(suggestedSession(PICKER, history)?.sessionType).toBe("opinion");
  });

  it("passes over a session whose scenario the bank no longer holds", () => {
    const history = [past(null, 1), past("work", 2), past("opinion", 3), past("situation", 4)];
    expect(suggestedSession(PICKER, history)?.sessionType).toBe("warmup");
  });

  it("suggests nothing when the bank offers no session", () => {
    expect(suggestedSession([], [past("work", 1)])).toBeNull();
  });
});

describe("oralPlan", () => {
  it("is done for today once a session has ended today, with the minutes spoken", () => {
    expect(
      oralPlan({ today: { oralSessions: 2, oralMs: 9.6 * 60_000 }, choices: PICKER, history: [], perMinuteUsd: 0.02 }),
    ).toEqual({ status: "done-today", sessions: 2, minutes: 10 });
  });

  it("suggests a session with its practice-mode estimate for its length", () => {
    const plan = oralPlan({ today: NOTHING_TODAY, choices: PICKER, history: [], perMinuteUsd: 0.02 });
    expect(plan).toEqual({ status: "suggest", choice: PICKER[0], estimateUsd: 0.1 });
  });

  it("suggests a session with no estimate when practice mode is unpriced", () => {
    expect(oralPlan({ today: NOTHING_TODAY, choices: PICKER, history: [], perMinuteUsd: null })).toMatchObject({
      status: "suggest",
      estimateUsd: null,
    });
  });

  it("has nothing to suggest when the bank offers no session", () => {
    expect(oralPlan({ today: NOTHING_TODAY, choices: [], history: [], perMinuteUsd: 0.02 })).toEqual({ status: "none" });
  });
});

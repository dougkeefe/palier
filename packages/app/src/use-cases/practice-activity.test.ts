import type { Attempt, AttemptMode, Skill } from "@palier/domain";
import { attemptId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import type { AttemptStore, Clock, OralSession, OralStore } from "../ports/index.js";
import { anOralSession } from "./__tests__/oral-fakes.js";
import { practiceActivity } from "./practice-activity.js";

// Local stubs rather than @palier/testing (progress.md D37).

// Wednesday 7 October 2026, 14:00 in Toronto.
const clock: Clock = { now: () => "2026-10-07T18:00:00.000Z" };
const TORONTO = { timeZone: "America/Toronto" };

const anAttempt = (id: string, skill: Skill, mode: AttemptMode, ts: string): Attempt => ({
  id: attemptId(id),
  itemId: itemId("q1"),
  bankVersion: 4,
  skill,
  sessionId: sessionId(`s-${id}`),
  chosen: "a",
  correct: true,
  msToFirstSelect: 1000,
  msToConfirm: 30_000,
  changedAnswer: false,
  mode,
  ts,
});

/** A store whose `since` answers as Dexie's does, and records what it was asked. */
const attemptsOf = (rows: readonly Attempt[]): AttemptStore & { readonly asked: string[] } => {
  const asked: string[] = [];
  return {
    asked,
    append: () => Promise.resolve(true),
    recent: () => Promise.resolve([]),
    since: (t) => {
      asked.push(t);
      return Promise.resolve(rows.filter((a) => a.ts >= t));
    },
    forItem: () => Promise.resolve([]),
    all: () => Promise.resolve(rows),
    clear: () => Promise.resolve(),
  };
};

const oralOf = (sessions: readonly OralSession[]): OralStore =>
  ({ all: () => Promise.resolve(sessions) }) as unknown as OralStore;

describe("practiceActivity", () => {
  it("counts today's drill and review answers per skill, and leaves out the diagnostic and the exam", async () => {
    const attempts = attemptsOf([
      anAttempt("d", "reading", "drill", "2026-10-07T15:00:00.000Z"),
      anAttempt("r", "writing", "review", "2026-10-07T15:10:00.000Z"),
      anAttempt("g", "reading", "diagnostic", "2026-10-07T15:20:00.000Z"),
      anAttempt("e", "writing", "exam", "2026-10-07T15:30:00.000Z"),
    ]);
    const activity = await practiceActivity(TORONTO, { attempts, oral: oralOf([]), clock });
    expect(activity.today).toMatchObject({ reading: 1, writing: 1 });
    expect(activity.week.answered).toBe(2);
    expect(activity.week.msByDay.at(-1)).toBe(60_000);
  });

  it("asks the store for a day more than the week, so no morning in the window is cut", async () => {
    const attempts = attemptsOf([]);
    await practiceActivity(TORONTO, { attempts, oral: oralOf([]), clock });
    expect(attempts.asked).toEqual(["2026-09-29T18:00:00.000Z"]);
  });

  it("counts an ended spoken session with its spoken time, and never one still running", async () => {
    const spoken = anOralSession({
      endedAt: "2026-10-07T16:00:00.000Z",
      turns: [
        { speaker: "examiner", text: "Parlez-moi de votre projet.", phase: 0, startMs: 0, endMs: 5_000 },
        { speaker: "candidate", text: "Nous livrons en mars.", phase: 0, startMs: 10_000, endMs: 100_000, input: "voice" },
      ],
    });
    const running = anOralSession({ id: sessionId("oral-2") });
    const activity = await practiceActivity(TORONTO, { attempts: attemptsOf([]), oral: oralOf([spoken, running]), clock });
    expect(activity.today.oralSessions).toBe(1);
    expect(activity.today.oralMs).toBe(90_000);
    expect(activity.week.oralSessions).toBe(1);
  });
});

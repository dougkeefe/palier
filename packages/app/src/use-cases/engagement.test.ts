import type { Attempt, AttemptMode, OptionId } from "@palier/domain";
import { attemptId, formId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import type { Clock, ExamAnswer, ExamRun, OralSession, OralStore, Session } from "../ports/index.js";
import { BANK, FORM, ITEM_IDS, aRun, itemsOf } from "./__tests__/exam-fakes.js";
import { anOralSession } from "./__tests__/oral-fakes.js";
import { attemptStore, examRunStore, sessionStore, settingsStore } from "./__tests__/sync-fakes.js";
import {
  MILESTONES_SHOWN_KEY,
  STREAK_FREEZE_NOTICED_KEY,
  markMilestoneShown,
  milestones,
  noteStreakFreeze,
  streakReport,
} from "./engagement.js";

// Local stubs rather than @palier/testing (progress.md D37).

const TORONTO = "America/Toronto";
// Tuesday 29 September 2026, 14:00 in Toronto.
const clock: Clock = { now: () => "2026-09-29T18:00:00.000Z" };
/** Noon in Toronto on a September day. */
const on = (day: number): string => `2026-09-${String(day).padStart(2, "0")}T16:00:00.000Z`;

const oralOf = (sessions: readonly OralSession[]): OralStore =>
  ({ all: () => Promise.resolve(sessions) }) as unknown as OralStore;

const anAttempt = (id: string, mode: AttemptMode, ts: string): Attempt => ({
  id: attemptId(id),
  itemId: itemId("q1"),
  bankVersion: 3,
  skill: "reading",
  sessionId: sessionId(`s-${id}`),
  chosen: "a",
  correct: true,
  msToFirstSelect: 1000,
  msToConfirm: 2000,
  changedAnswer: false,
  mode,
  ts,
});

const aSession = (id: string, completedAt: string | null): Session => ({
  id: sessionId(id),
  mode: "drill",
  startedAt: completedAt ?? on(1),
  completedAt,
});

const world = async (history: {
  sessions?: readonly Session[];
  runs?: readonly ExamRun[];
  oral?: readonly OralSession[];
  attempts?: readonly Attempt[];
}) => {
  const sessions = sessionStore();
  for (const s of history.sessions ?? []) await sessions.create(s);
  const attempts = attemptStore();
  for (const a of history.attempts ?? []) await attempts.append(a);
  return {
    sessions,
    examRuns: examRunStore(history.runs ?? []),
    oral: oralOf(history.oral ?? []),
    attempts,
    settings: settingsStore(),
    clock,
    items: itemsOf(),
  };
};

const REQUEST = { timeZone: TORONTO, freezesPerMonth: 2 };

describe("streakReport", () => {
  it("counts a completed drill, and never one left unfinished", async () => {
    const deps = await world({ sessions: [aSession("d1", on(28)), aSession("d2", on(29)), aSession("d3", null)] });
    const report = await streakReport(REQUEST, deps);
    expect(report).toMatchObject({ length: 2, doneToday: true, frozen: [], freezeToAnnounce: null });
  });

  it("counts a submitted mock exam, an ended spoken session, and a review or diagnostic answer", async () => {
    const deps = await world({
      runs: [aRun({ id: sessionId("run-1"), submittedAt: on(25) }), aRun({ id: sessionId("run-2") })],
      oral: [anOralSession({ endedAt: on(26) }), anOralSession({ id: sessionId("oral-2") })],
      attempts: [anAttempt("r", "review", on(27)), anAttempt("g", "diagnostic", on(28))],
    });
    expect((await streakReport(REQUEST, deps)).length).toBe(4);
  });

  it("does not count a drill's answer or an exam's attempt as a session on their own", async () => {
    const deps = await world({ attempts: [anAttempt("d", "drill", on(29)), anAttempt("e", "exam", on(28))] });
    expect((await streakReport(REQUEST, deps)).length).toBe(0);
  });

  it("lists every day that counted once, oldest first, on the user's clock, for the practice calendar", async () => {
    const deps = await world({
      sessions: [aSession("a", on(28)), aSession("b", on(28)), aSession("late", "2026-09-29T03:30:00.000Z")],
      runs: [aRun({ id: sessionId("run-1"), submittedAt: on(20) })],
    });
    expect((await streakReport(REQUEST, deps)).activeDays).toEqual(["2026-09-20", "2026-09-28"]);
  });

  it("counts the user's day, not UTC's: 23:30 in Toronto is the same evening", async () => {
    // 03:30Z on the 29th is 23:30 on the 28th in Toronto.
    const deps = await world({ sessions: [aSession("late", "2026-09-29T03:30:00.000Z"), aSession("d", on(27))] });
    expect(await streakReport(REQUEST, deps)).toMatchObject({ length: 2, doneToday: false, frozen: [] });
  });

  it("announces the newest frozen day until it is noted, then says nothing", async () => {
    const deps = await world({ sessions: [aSession("a", on(26)), aSession("b", on(29))] });
    const first = await streakReport(REQUEST, deps);
    expect(first).toMatchObject({ length: 2, frozen: ["2026-09-28", "2026-09-27"], freezeToAnnounce: "2026-09-28" });

    await noteStreakFreeze("2026-09-28", deps);
    expect((await streakReport(REQUEST, deps)).freezeToAnnounce).toBeNull();
    expect(await deps.settings.get(STREAK_FREEZE_NOTICED_KEY)).toBe("2026-09-28");
  });

  it("announces a later freeze after an earlier one was noted", async () => {
    const deps = await world({ sessions: [aSession("a", on(26)), aSession("b", on(28))] });
    await deps.settings.set(STREAK_FREEZE_NOTICED_KEY, "2026-09-27");
    // Today, the 29th, is still to do, so the streak holds by freezing the 27th only.
    expect((await streakReport(REQUEST, deps)).freezeToAnnounce).toBeNull();
    await deps.settings.set(STREAK_FREEZE_NOTICED_KEY, "2026-09-20");
    expect((await streakReport(REQUEST, deps)).freezeToAnnounce).toBe("2026-09-27");
  });

  it("treats a stored value that is not a day as never announced", async () => {
    const deps = await world({ sessions: [aSession("a", on(26)), aSession("b", on(29))] });
    await deps.settings.set(STREAK_FREEZE_NOTICED_KEY, 42);
    expect((await streakReport(REQUEST, deps)).freezeToAnnounce).toBe("2026-09-28");
  });
});

describe("noteStreakFreeze", () => {
  it("never moves the mark back, since another device may have announced a later freeze", async () => {
    const { settings } = await world({});
    await noteStreakFreeze("2026-09-28", { settings });
    await noteStreakFreeze("2026-09-20", { settings });
    expect(await settings.get(STREAK_FREEZE_NOTICED_KEY)).toBe("2026-09-28");
  });

  it("refuses a value that is not a local day", async () => {
    const { settings } = await world({});
    await expect(noteStreakFreeze("Tuesday", { settings })).rejects.toThrow(RangeError);
  });
});

describe("milestones", () => {
  const answered = (response: OptionId): readonly ExamAnswer[] =>
    ITEM_IDS.map((id) => ({
      itemId: id,
      response,
      msToFirstSelect: 1,
      msToConfirm: 2,
      changedAnswer: false,
      answeredAt: on(20),
    }));
  const THRESHOLD = { itemsAnswered: 3 };

  it("reaches nothing on a new device", async () => {
    expect(await milestones(THRESHOLD, await world({}))).toEqual({ reached: [], unseen: [] });
  });

  it("reaches the first mock exam on a submission below C, and not the exam at C", async () => {
    const deps = await world({ runs: [aRun({ answers: answered("b"), submittedAt: on(20) })] });
    expect((await milestones(THRESHOLD, deps)).reached).toEqual(["first-exam"]);
  });

  it("reaches the exam at C on a submission scored C, and never on one still running", async () => {
    const deps = await world({
      runs: [
        aRun({ id: sessionId("c"), answers: answered("a"), submittedAt: on(21) }),
        aRun({ id: sessionId("running"), answers: answered("a") }),
      ],
    });
    expect((await milestones(THRESHOLD, deps)).reached).toEqual(["first-exam", "first-exam-at-c"]);
  });

  it("passes over a run whose form or items have left the bank, as the readiness card does", async () => {
    const gone = await world({ runs: [aRun({ formId: formId("gone"), answers: answered("a"), submittedAt: on(21) })] });
    expect((await milestones(THRESHOLD, gone)).reached).toEqual(["first-exam"]);

    const shrunk = { ...(await world({ runs: [aRun({ answers: answered("a"), submittedAt: on(21) })] })) };
    shrunk.items = itemsOf([FORM], BANK.slice(1));
    expect((await milestones(THRESHOLD, shrunk)).reached).toEqual(["first-exam"]);
  });

  it("reaches the first spoken session once one has ended", async () => {
    const running = await world({ oral: [anOralSession()] });
    expect((await milestones(THRESHOLD, running)).reached).toEqual([]);
    const ended = await world({ oral: [anOralSession({ endedAt: on(22) })] });
    expect((await milestones(THRESHOLD, ended)).reached).toEqual(["first-oral"]);
  });

  it("counts every answered item toward the items milestone, exam attempts included", async () => {
    const deps = await world({
      attempts: [anAttempt("1", "drill", on(1)), anAttempt("2", "review", on(2)), anAttempt("3", "exam", on(3))],
    });
    expect((await milestones(THRESHOLD, deps)).reached).toEqual(["items-answered"]);
  });

  it("shows each milestone once: a shown one is reached but no longer unseen", async () => {
    const deps = await world({ runs: [aRun({ answers: answered("a"), submittedAt: on(21) })] });
    await markMilestoneShown("first-exam", deps);
    await markMilestoneShown("first-exam", deps);
    expect(await milestones(THRESHOLD, deps)).toEqual({
      reached: ["first-exam", "first-exam-at-c"],
      unseen: ["first-exam-at-c"],
    });
    expect(await deps.settings.get(MILESTONES_SHOWN_KEY)).toEqual(["first-exam"]);
  });

  it("ignores a stored value that is not a list of milestones, and drops unknown ids from one", async () => {
    const deps = await world({ oral: [anOralSession({ endedAt: on(22) })] });
    await deps.settings.set(MILESTONES_SHOWN_KEY, "first-oral");
    expect((await milestones(THRESHOLD, deps)).unseen).toEqual(["first-oral"]);
    await deps.settings.set(MILESTONES_SHOWN_KEY, ["streak-100", "first-oral"]);
    expect((await milestones(THRESHOLD, deps)).unseen).toEqual([]);
    await markMilestoneShown("first-exam", deps);
    expect(await deps.settings.get(MILESTONES_SHOWN_KEY)).toEqual(["first-oral", "first-exam"]);
  });
});

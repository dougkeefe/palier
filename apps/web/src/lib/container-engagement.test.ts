import { attemptId, itemId, sessionId } from "@palier/domain";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createContainer } from "./container";

/**
 * The streak and the milestones, through the real wiring (Phase 7 Slice 4, progress.md D159):
 * each reads the container's own stores, and the two "said once" flags are settings, so they
 * travel with an export (and sync) like every other setting.
 */

vi.mock("../server/db", () => ({ syncApi: () => Promise.resolve(null) }));

afterEach(async () => {
  // Every production container shares the one IndexedDB database, so leave it empty.
  await createContainer({ hermetic: false }).useCases.wipeData();
});

describe.each([
  ["hermetic", true],
  ["production", false],
] as const)("engagement through the %s graph", (_, hermetic) => {
  it("counts today's completed drill as the streak's first day", async () => {
    const c = createContainer({ hermetic });
    const now = c.clock.now();
    await c.sessions.create({ id: sessionId("drill-today"), mode: "drill", startedAt: now, completedAt: null });
    await c.sessions.complete(sessionId("drill-today"), now);

    const report = await c.useCases.streakReport({ timeZone: "UTC", freezesPerMonth: 2 });
    expect(report).toMatchObject({ length: 1, doneToday: true, frozen: [], freezeToAnnounce: null });
  });

  it("keeps a shown milestone and a noted freeze as settings, so an export carries both", async () => {
    const c = createContainer({ hermetic });
    await c.useCases.markMilestoneShown({ id: "first-exam" });
    await c.useCases.noteStreakFreeze({ day: "2026-09-28" });

    expect(await c.useCases.milestones({ itemsAnswered: 1000 })).toEqual({ reached: [], unseen: [] });
    const exported = await c.useCases.exportData();
    expect(exported.settings).toEqual(
      expect.arrayContaining([
        { key: "milestonesShown", value: ["first-exam"] },
        { key: "streakFreezeNoticed", value: "2026-09-28" },
      ]),
    );
  });

  it("counts today's drill answer for the week and the streak's calendar (D219)", async () => {
    const c = createContainer({ hermetic });
    const now = c.clock.now();
    await c.attempts.append({
      id: attemptId("activity-1"),
      itemId: itemId("q1"),
      bankVersion: 4,
      skill: "writing",
      sessionId: sessionId("drill-activity"),
      chosen: "a",
      correct: true,
      msToFirstSelect: 1_000,
      msToConfirm: 25_000,
      changedAnswer: false,
      mode: "drill",
      ts: now,
    });
    await c.sessions.create({ id: sessionId("drill-activity"), mode: "drill", startedAt: now, completedAt: null });
    await c.sessions.complete(sessionId("drill-activity"), now);

    const activity = await c.useCases.practiceActivity({ timeZone: "UTC" });
    expect(activity.today).toMatchObject({ reading: 0, writing: 1 });
    expect(activity.week.msByDay.at(-1)).toBe(25_000);
    const report = await c.useCases.streakReport({ timeZone: "UTC", freezesPerMonth: 2 });
    expect(report.activeDays).toEqual([now.slice(0, 10)]);
  });
});

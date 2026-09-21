import { attemptId, sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { createContainer, readEnv } from "./container";

describe("readEnv", () => {
  it("is hermetic when PALIER_HERMETIC is exactly '1'", () => {
    expect(readEnv({ PALIER_HERMETIC: "1" })).toEqual({ hermetic: true });
  });

  it("is not hermetic when the flag is absent or any other value", () => {
    expect(readEnv({})).toEqual({ hermetic: false });
    expect(readEnv({ PALIER_HERMETIC: "0" })).toEqual({ hermetic: false });
  });
});

describe("createContainer", () => {
  it("wires every port from the in-memory harness in hermetic mode", () => {
    const c = createContainer({ hermetic: true });

    expect(typeof c.clock.now()).toBe("string");
    const r = c.random.next();
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(1);

    // The store ports are present and callable (their behaviour is proven by the
    // port contract suites in @palier/testing; here we assert wiring only).
    expect(c.items).toBeDefined();
    expect(c.attempts).toBeDefined();
    expect(c.schedule).toBeDefined();
    expect(c.sessions).toBeDefined();
    expect(c.settings).toBeDefined();
    expect(c.vault).toBeDefined();
  });

  it("assembles the use-case graph bound to the in-memory ports", () => {
    const c = createContainer({ hermetic: true });
    expect(typeof c.useCases.planDailySession).toBe("function");
    expect(typeof c.useCases.startSession).toBe("function");
    expect(typeof c.useCases.answerItem).toBe("function");
    expect(typeof c.useCases.completeSession).toBe("function");
  });

  it("plans a non-empty daily session from the fixture bank", async () => {
    const c = createContainer({ hermetic: true });

    const plan = await c.useCases.planDailySession({
      skill: "writing",
      lang: "fr",
      targetBand: "B",
      sessionSize: 8,
    });

    // The fixture bank is wired, so the plan draws real items (proves the wiring,
    // not the planner's behaviour — that is @palier/engine's own suite).
    expect(plan.items.length).toBeGreaterThan(0);
  });

  /**
   * The graph end to end, which is the point of this file: plan a session from the
   * fixture bank, answer the first item of it wrongly, and see the attempt and the
   * Leitner entry land in the in-memory stores. It proves the wiring — the profile
   * reached `answerItem`, the registry scored, both stores were written — not the
   * engine's behaviour, which has its own suite.
   */
  it("answers an item from the planned session and records the attempt and its review", async () => {
    const c = createContainer({ hermetic: true });

    const plan = await c.useCases.planDailySession({
      skill: "writing",
      lang: "fr",
      targetBand: "B",
      sessionSize: 8,
    });
    const item = plan.items[0]!;

    const result = await c.useCases.answerItem({
      attemptId: attemptId("01HATTEMPT000000000000001"),
      itemId: item.id,
      // Deliberately not the key, so the answer is wrong and therefore enters the
      // queue whatever the item's key happens to be (product-requirements.md §6.5).
      response: item.key === "a" ? "b" : "a",
      sessionId: sessionId("01HSESSION000000000000001"),
      mode: "drill",
      msToFirstSelect: 1_000,
      msToConfirm: 2_000,
      changedAnswer: false,
      slow: false,
    });

    expect(result.attempt.correct).toBe(false);
    expect(await c.attempts.forItem(item.id)).toHaveLength(1);

    // Wrong answer: box 1, and due at the profile's first interval.
    expect(result.review?.box).toBe(1);
    expect(await c.schedule.get(item.id)).toMatchObject({ box: 1, skill: "writing" });
  });

  /**
   * The whole practice loop through the assembled graph: start a session, answer
   * every planned item under its id, complete it, then start the next day and see
   * the completed session flow back through `SessionStore` into the plan. It proves
   * the wiring — `startSession` composed the planner, the attempts carried the
   * session id, `completeSession` closed it, and the next `startSession` read it —
   * not the taper magnitude, which is @palier/engine's and @palier/app's own suites.
   */
  it("runs the full session loop: start, answer every item, complete, then start again", async () => {
    const c = createContainer({ hermetic: true });
    const day1 = sessionId("01HSESSION0000000000DAY1");

    const started = await c.useCases.startSession({
      sessionId: day1,
      mode: "drill",
      plan: { skill: "writing", lang: "fr", targetBand: "B", sessionSize: 8 },
    });

    expect(started.session).toMatchObject({ id: day1, completedAt: null });
    expect(started.plan.items.length).toBeGreaterThan(0);

    // Answer every planned item under the session's id.
    let attemptSeq = 0;
    for (const item of started.plan.items) {
      await c.useCases.answerItem({
        attemptId: attemptId(`01HATTEMPT${String(++attemptSeq).padStart(13, "0")}`),
        itemId: item.id,
        response: item.key,
        sessionId: day1,
        mode: "drill",
        msToFirstSelect: 1_000,
        msToConfirm: 2_000,
        changedAnswer: false,
        slow: false,
      });
    }
    expect(await c.attempts.recent("writing", 100)).toHaveLength(started.plan.items.length);

    const completed = await c.useCases.completeSession({ sessionId: day1 });
    expect(completed.session.completedAt).not.toBeNull();
    expect((await c.sessions.latest())?.completedAt).not.toBeNull();

    // The next day starts, reading the completed session back through the store.
    const day2 = await c.useCases.startSession({
      sessionId: sessionId("01HSESSION0000000000DAY2"),
      mode: "drill",
      plan: { skill: "writing", lang: "fr", targetBand: "B", sessionSize: 8 },
    });
    expect(day2.plan.items.length).toBeGreaterThan(0);
  });

  it("refuses to build a production container until real adapters exist", () => {
    expect(() => createContainer({ hermetic: false })).toThrow(/Phase 2/);
  });
});

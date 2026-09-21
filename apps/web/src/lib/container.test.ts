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
    expect(c.settings).toBeDefined();
    expect(c.vault).toBeDefined();
  });

  it("assembles the use-case graph bound to the in-memory ports", () => {
    const c = createContainer({ hermetic: true });
    expect(typeof c.useCases.planDailySession).toBe("function");
    expect(typeof c.useCases.answerItem).toBe("function");
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

  it("refuses to build a production container until real adapters exist", () => {
    expect(() => createContainer({ hermetic: false })).toThrow(/Phase 2/);
  });
});

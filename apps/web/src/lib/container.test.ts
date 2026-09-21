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

  it("refuses to build a production container until real adapters exist", () => {
    expect(() => createContainer({ hermetic: false })).toThrow(/Phase 2/);
  });
});

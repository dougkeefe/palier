import { describe, expect, it } from "vitest";

import { AFTER_SESSION_DELAY_MS, FOCUS_INTERVAL_MS, delayFor, shouldSync } from "./sync-triggers";

describe("shouldSync (architecture.md §9.4)", () => {
  it("syncs on load or focus only when more than five minutes have passed, or never before", () => {
    expect(shouldSync("load", 0, null)).toBe(true);
    expect(shouldSync("focus", FOCUS_INTERVAL_MS, 0)).toBe(false);
    expect(shouldSync("focus", FOCUS_INTERVAL_MS + 1, 0)).toBe(true);
  });

  it("always syncs after a session, on reconnect and on demand", () => {
    for (const trigger of ["session-complete", "reconnect", "demand"] as const) expect(shouldSync(trigger, 1, 0)).toBe(true);
  });
});

describe("delayFor", () => {
  it("debounces a completed session by thirty seconds and delays nothing else", () => {
    expect(delayFor("session-complete")).toBe(AFTER_SESSION_DELAY_MS);
    expect(delayFor("demand")).toBe(0);
    expect(delayFor("focus")).toBe(0);
  });
});

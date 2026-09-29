import { describe, expect, it } from "vitest";

import { MILESTONE_ITEMS, STREAK_FREEZES_PER_MONTH } from "./rules";

describe("the engagement rules", () => {
  it("freezes up to two missed days a month, as PRD §9 says", () => {
    expect(STREAK_FREEZES_PER_MONTH).toBe(2);
  });

  it("marks a milestone at 1,000 items, as PRD §9 says", () => {
    expect(MILESTONE_ITEMS).toBe(1000);
  });
});

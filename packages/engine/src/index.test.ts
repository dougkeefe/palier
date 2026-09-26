import { describe, expect, it } from "vitest";

import * as engine from "./index.js";

/**
 * The engine's public surface. `index.ts` was `export {}` while the band mapper
 * was reachable only by a relative import, so `@palier/engine`'s built `dist`
 * exported nothing and the first consumer would have found an empty module. Each
 * algorithm is added here as it lands (progress.md, the engine-core slices).
 */
describe("@palier/engine public surface", () => {
  it("exports the band mapper", () => {
    expect(typeof engine.mapRawScore).toBe("function");
    expect(typeof engine.bandForRawScore).toBe("function");
    expect(typeof engine.pointsToBand).toBe("function");
  });

  it("exports the trend calculator", () => {
    expect(typeof engine.calculateTrend).toBe("function");
    expect(typeof engine.trendEvidence).toBe("function");
  });

  it("exports the exam scorer", () => {
    expect(typeof engine.scoreExam).toBe("function");
  });

  it("exports the review scheduler", () => {
    expect(typeof engine.scheduleReview).toBe("function");
    expect(typeof engine.retirementBox).toBe("function");
  });

  it("exports the selector and its weakest-sub-skills helper", () => {
    expect(typeof engine.selectItems).toBe("function");
    expect(typeof engine.workingSet).toBe("function");
    expect(typeof engine.weakestSubSkills).toBe("function");
  });

  it("exports the item statistics and the rest bucket", () => {
    expect(typeof engine.itemStatistics).toBe("function");
    expect(typeof engine.retirementVerdicts).toBe("function");
    expect(typeof engine.restBucket).toBe("function");
    expect(typeof engine.restBuckets).toBe("function");
  });

  it("exports the sub-skill breakdown", () => {
    expect(typeof engine.subSkillBreakdown).toBe("function");
  });

  it("exports the daily planner and its budget shares", () => {
    expect(typeof engine.planDay).toBe("function");
    expect(engine.REVIEW_SHARE + engine.NEW_SHARE + engine.MAINTENANCE_SHARE).toBeCloseTo(1);
    expect(engine.TAPER_DAYS).toBeGreaterThan(0);
    expect(engine.SHORTEN_FACTOR).toBeLessThan(1);
  });
});

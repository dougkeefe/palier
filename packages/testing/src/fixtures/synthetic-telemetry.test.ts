import { describe, expect, it } from "vitest";

import { syntheticTelemetry } from "./synthetic-telemetry.js";

/**
 * The synthetic set behind exit criterion 3 has to be what it says, or the job's test
 * proves nothing. These check the fixture itself; the verdicts are the job's to test.
 */
describe("syntheticTelemetry", () => {
  const set = syntheticTelemetry();
  const answers = (id: string) => set.events.filter((e) => e.itemId === id);

  it("gives every respondent one event per item", () => {
    expect(set.items).toHaveLength(22);
    expect(set.events).toHaveLength(22 * 300);
    for (const item of set.items) expect(answers(item.id)).toHaveLength(300);
  });

  it("makes the too-easy item exactly 98% right", () => {
    const easy = answers(set.tooEasy);
    expect(easy.filter((e) => e.correct)).toHaveLength(294);
  });

  it("makes the reversed-key item right mostly for the weaker respondents", () => {
    const reversed = answers(set.reversedKey);
    const rateIn = (buckets: readonly number[]) => {
      const group = reversed.filter((e) => buckets.includes(e.restBucket));
      return group.filter((e) => e.correct).length / group.length;
    };
    expect(rateIn([0, 1])).toBeGreaterThan(rateIn([3, 4]));
  });

  it("is the same set for the same seed, and a different one for another", () => {
    expect(syntheticTelemetry().events).toEqual(set.events);
    expect(syntheticTelemetry({ seed: 7 }).events).not.toEqual(set.events);
  });

  it("carries only the five event fields", () => {
    for (const event of set.events.slice(0, 50)) {
      expect(Object.keys(event).sort()).toEqual(["bankVersion", "correct", "itemId", "responseMs", "restBucket"]);
    }
  });

  it("stamps the bank version asked for, and sizes to the respondents asked for", () => {
    const small = syntheticTelemetry({ respondents: 50, bankVersion: 7 });
    expect(small.events).toHaveLength(22 * 50);
    expect(new Set(small.events.map((e) => e.bankVersion))).toEqual(new Set([7]));
  });
});

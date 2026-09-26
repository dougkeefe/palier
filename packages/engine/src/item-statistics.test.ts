import { describe, expect, it } from "vitest";

import type { ItemStatisticsRules, RestBucket, TelemetryEvent } from "@palier/domain";
import { itemId } from "@palier/domain";

import type { ItemStatistic } from "./item-statistics.js";
import { itemStatistics, retirementVerdicts } from "./item-statistics.js";
import { anItem } from "./__tests__/fixtures.js";
import { pscSle } from "./__tests__/read-profile.js";

/** `count` copies of each `[correct, bucket]` pair, for one item. */
const events = (id: string, rows: readonly (readonly [boolean, RestBucket, number])[]): TelemetryEvent[] =>
  rows.flatMap(([correct, restBucket, count]) =>
    Array.from({ length: count }, () => ({ itemId: itemId(id), correct, responseMs: 30_000, bankVersion: 2, restBucket })),
  );

const statOf = (id: string, rows: readonly (readonly [boolean, RestBucket, number])[]): ItemStatistic => {
  const [stat] = itemStatistics(events(id, rows));
  if (stat === undefined) throw new Error("no statistic");
  return stat;
};

describe("itemStatistics", () => {
  it("gives nothing for no events", () => {
    expect(itemStatistics([])).toEqual([]);
  });

  it("groups by item, in item-id order by code unit rather than locale", () => {
    const stats = itemStatistics([...events("b", [[true, 1, 1]]), ...events("B", [[true, 1, 1]]), ...events("a", [[true, 1, 1]])]);
    expect(stats.map((s) => s.itemId)).toEqual(["B", "a", "b"]);
  });

  it("counts the responses and the proportion right", () => {
    const stat = statOf("x", [[true, 2, 3], [false, 2, 1]]);
    expect(stat.responses).toBe(4);
    expect(stat.proportionCorrect).toBe(0.75);
  });

  it("computes the point-biserial of a textbook example", () => {
    // Right at buckets 4 and 3, wrong at 1 and 0: r = 12 / √160.
    const stat = statOf("x", [[true, 4, 1], [true, 3, 1], [false, 1, 1], [false, 0, 1]]);
    expect(stat.pointBiserial).toBeCloseTo(12 / Math.sqrt(160), 12);
  });

  it("reads a reversed key as the same correlation, negative", () => {
    // The strong answer wrong and the weak answer right, the signature of a broken key.
    const stat = statOf("x", [[false, 4, 1], [false, 3, 1], [true, 1, 1], [true, 0, 1]]);
    expect(stat.pointBiserial).toBeCloseTo(-12 / Math.sqrt(160), 12);
  });

  it("gives exactly 1 for a perfect correlation", () => {
    expect(statOf("x", [[true, 4, 1], [false, 0, 1]]).pointBiserial).toBe(1);
  });

  it("gives no correlation when every response was right, or every one wrong", () => {
    expect(statOf("x", [[true, 1, 3], [true, 4, 2]]).pointBiserial).toBeNull();
    expect(statOf("x", [[false, 1, 3], [false, 4, 2]]).pointBiserial).toBeNull();
  });

  it("gives no correlation when every response came from the same bucket", () => {
    expect(statOf("x", [[true, 2, 3], [false, 2, 2]]).pointBiserial).toBeNull();
  });
});

const rules: ItemStatisticsRules = pscSle().itemStatistics;
const item = anItem({ id: itemId("x") });
const verdictFor = (stat: ItemStatistic) => {
  const [verdict] = retirementVerdicts([stat], [item], rules);
  if (verdict === undefined) throw new Error("no verdict");
  return verdict;
};

/** A point-biserial of exactly 0: right and wrong spread evenly over buckets 0 and 4. */
const uncorrelated = (id: string, quarter: number) =>
  statOf(id, [[true, 0, quarter], [true, 4, quarter], [false, 0, quarter], [false, 4, quarter]]);

describe("retirementVerdicts: the minimum counts come first", () => {
  it("does not trust a proportion on 29 responses, even all right", () => {
    const verdict = verdictFor(statOf("x", [[true, 2, 29]]));
    expect(verdict.trusted.difficulty).toBe(false);
    expect(verdict.reasons).toEqual([]);
  });

  it("trusts it on 30, and 30 right of 30 is too easy", () => {
    const verdict = verdictFor(statOf("x", [[true, 2, 30]]));
    expect(verdict.trusted.difficulty).toBe(true);
    expect(verdict.reasons).toEqual(["too-easy"]);
  });

  it("does not trust a negative point-biserial on 99 responses", () => {
    const verdict = verdictFor(statOf("x", [[true, 0, 50], [false, 4, 49]]));
    expect(verdict.pointBiserial).toBeLessThan(0);
    expect(verdict.trusted.discrimination).toBe(false);
    expect(verdict.reasons).toEqual([]);
  });

  it("trusts it on 100, and retires the item for it", () => {
    const verdict = verdictFor(statOf("x", [[true, 0, 50], [false, 4, 50]]));
    expect(verdict.trusted.discrimination).toBe(true);
    expect(verdict.reasons).toEqual(["low-discrimination"]);
  });

  it("does not trust a correlation that does not exist, however many responses", () => {
    const verdict = verdictFor(statOf("x", [[true, 2, 60], [false, 2, 60]]));
    expect(verdict.pointBiserial).toBeNull();
    expect(verdict.trusted).toEqual({ difficulty: true, discrimination: false });
    expect(verdict.reasons).toEqual([]);
  });
});

describe("retirementVerdicts: the thresholds are strict", () => {
  it("keeps an item exactly 95% right, and retires one at 96%", () => {
    expect(verdictFor(uncorrelatedAt(95)).reasons).toEqual([]);
    expect(verdictFor(uncorrelatedAt(96)).reasons).toEqual(["too-easy"]);
  });

  it("keeps an item exactly 15% right, and retires one at 14%", () => {
    expect(verdictFor(uncorrelatedAt(15)).reasons).toEqual([]);
    expect(verdictFor(uncorrelatedAt(14)).reasons).toEqual(["too-hard"]);
  });

  it("keeps an item with a point-biserial of exactly 0", () => {
    const verdict = verdictFor(uncorrelated("x", 25));
    expect(verdict.pointBiserial).toBe(0);
    expect(verdict.reasons).toEqual([]);
  });

  it("gives every reason that applies", () => {
    // 97 right of 100, and the three wrong all in the top bucket.
    const verdict = verdictFor(statOf("x", [[true, 0, 97], [false, 4, 3]]));
    expect(verdict.reasons).toEqual(["too-easy", "low-discrimination"]);
  });
});

/** A hand-built statistic, `right` of 100 with no correlation, to put a proportion exactly on a threshold. */
function uncorrelatedAt(right: number): ItemStatistic {
  return {
    itemId: itemId("x"),
    responses: 100,
    proportionCorrect: right / 100,
    pointBiserial: 0,
  };
}

describe("retirementVerdicts: which items get a verdict", () => {
  const stats = itemStatistics([
    ...events("gone", [[true, 2, 40]]),
    ...events("old", [[true, 2, 40]]),
    ...events("x", [[true, 2, 40]]),
  ]);

  it("passes over an item the bank no longer holds, and one already retired", () => {
    const verdicts = retirementVerdicts(stats, [item, anItem({ id: itemId("old"), status: "retired" })], rules);
    expect(verdicts.map((v) => v.itemId)).toEqual(["x"]);
  });

  it("judges an item whatever its other statuses, in the statistics' order", () => {
    const verdicts = retirementVerdicts(stats, [item, anItem({ id: itemId("old"), status: "draft" })], rules);
    expect(verdicts.map((v) => v.itemId)).toEqual(["old", "x"]);
  });

  it("carries the statistic into the verdict", () => {
    const [verdict] = retirementVerdicts(stats, [item], rules);
    expect(verdict).toEqual({
      itemId: "x",
      responses: 40,
      proportionCorrect: 1,
      pointBiserial: null,
      trusted: { difficulty: true, discrimination: false },
      reasons: ["too-easy"],
    });
  });
});

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { RestBucket, TelemetryEvent } from "@palier/domain";
import { REST_BUCKETS, itemId } from "@palier/domain";

import { itemStatistics, retirementVerdicts } from "./item-statistics.js";
import { anItem } from "./__tests__/fixtures.js";
import { pscSle } from "./__tests__/read-profile.js";

/**
 * Telemetry arrives in no particular order, from any number of devices, so the
 * statistics must be a function of the event *set* (the rule D73 set for the
 * trend). The sums are whole numbers, so the property holds to the last bit.
 */
const ids = ["i-1", "i-2", "i-3"];
const items = ids.map((id) => anItem({ id: itemId(id) }));
const rules = pscSle().itemStatistics;

const eventList = fc
  .array(
    fc.record({
      item: fc.constantFrom(...ids),
      correct: fc.boolean(),
      restBucket: fc.constantFrom<RestBucket>(...REST_BUCKETS),
    }),
    { maxLength: 400 },
  )
  .map((rows): TelemetryEvent[] =>
    rows.map((row) => ({ itemId: itemId(row.item), correct: row.correct, responseMs: 1000, bankVersion: 2, restBucket: row.restBucket })),
  );

describe("itemStatistics properties", () => {
  it("gives the same statistics and verdicts for the same events in any order", () => {
    fc.assert(
      fc.property(
        eventList.chain((list) => fc.tuple(fc.constant(list), fc.shuffledSubarray(list, { minLength: list.length }))),
        ([list, shuffled]) => {
          const stats = itemStatistics(list);
          expect(itemStatistics(shuffled)).toEqual(stats);
          expect(retirementVerdicts(itemStatistics(shuffled), items, rules)).toEqual(retirementVerdicts(stats, items, rules));
        },
      ),
    );
  });

  it("accounts for every event, and keeps every figure in range", () => {
    fc.assert(
      fc.property(eventList, (list) => {
        const stats = itemStatistics(list);
        expect(stats.reduce((sum, s) => sum + s.responses, 0)).toBe(list.length);
        for (const s of stats) {
          expect(s.proportionCorrect).toBeGreaterThanOrEqual(0);
          expect(s.proportionCorrect).toBeLessThanOrEqual(1);
          if (s.pointBiserial !== null) {
            expect(Math.abs(s.pointBiserial)).toBeLessThanOrEqual(1);
          }
        }
      }),
    );
  });
});

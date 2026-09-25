import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Item } from "@palier/domain";
import { READING_SUB_SKILLS, attemptId, itemId } from "@palier/domain";

import { WEAKEST_WINDOW, weakestSubSkills } from "./weakest-sub-skills.js";
import { anAttempt, anItem } from "./__tests__/fixtures.js";

/**
 * The same attempts in any order give the same weakest sub-skills (progress.md D77, the
 * rule D73 set for the trend). A synced device receives attempts in its own order, and
 * the window per sub-skill must not depend on it — ties in `ts` included.
 */
const DAY = 24 * 60 * 60 * 1000;
const items: Item[] = READING_SUB_SKILLS.slice(0, 2).map((subSkill, i) => anItem({ id: itemId(`01HWEAK${String(i)}`), subSkill }));

describe("weakestSubSkills properties", () => {
  it("gives the same weakest sub-skills for the same attempts in any order, even when their times tie", () => {
    const attempts = fc
      .array(fc.record({ item: fc.integer({ min: 0, max: 1 }), correct: fc.boolean(), instant: fc.integer({ min: 0, max: 2 }) }), {
        // Two sub-skills, so each passes its window of 50 and the cut lands inside a tie.
        minLength: WEAKEST_WINDOW * 2 + 2,
        maxLength: WEAKEST_WINDOW * 3,
      })
      .map((rows) =>
        rows.map((row, i) =>
          anAttempt({
            id: attemptId(`01HWEAKATT${String(i).padStart(13, "0")}`),
            itemId: (items[row.item] as Item).id,
            correct: row.correct,
            ts: new Date(row.instant * DAY).toISOString(),
          }),
        ),
      );
    fc.assert(
      fc.property(
        attempts.chain((list) => fc.tuple(fc.constant(list), fc.shuffledSubarray(list, { minLength: list.length }))),
        ([list, shuffled]) => {
          expect(weakestSubSkills("reading", shuffled, items)).toEqual(weakestSubSkills("reading", list, items));
        },
      ),
    );
  });
});

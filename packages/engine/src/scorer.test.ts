import { describe, expect, it } from "vitest";

import type { ExamForm, ItemId, OptionId } from "@palier/domain";
import { formId, itemId } from "@palier/domain";

import { scoreExam } from "./scorer.js";
import { anItem } from "./__tests__/fixtures.js";

/**
 * architecture.md §7.5:
 *   "Mock exam: raw score over scored items only, pilot items excluded and
 *    marked as such in the review, then mapped through the form's bandCuts."
 *   "Scoring is idempotent: rescoring a stored run produces an identical result."
 *
 * The band comes from the form's own `bandCuts`, not the live profile, so a
 * later PSC change never silently rescores an old run (exam-form.ts).
 */

// Six items: five scored, one pilot. bandCuts partition [0, 5]:
// X 0-1, A 2, B 3, C 4-5.
const ids = Array.from({ length: 6 }, (_, i) => itemId(`01HFORMITEM${String(i).padStart(13, "0")}`));
const [i0, i1, i2, i3, i4, pilot] = ids as [ItemId, ItemId, ItemId, ItemId, ItemId, ItemId];

const items = ids.map((id) => anItem({ id, key: "a" }));

const form: ExamForm = {
  id: formId("01HFORM000000000000001"),
  skill: "reading",
  lang: "fr",
  mode: "unsupervised",
  itemIds: ids,
  pilotItemIds: [pilot],
  timeLimitMinutes: 45,
  bandCuts: [
    { band: "X", min: 0, max: 1 },
    { band: "A", min: 2, max: 2 },
    { band: "B", min: 3, max: 3 },
    { band: "C", min: 4, max: 5 },
  ],
  version: 1,
};

const answers = (entries: ReadonlyArray<readonly [ItemId, OptionId]>): ReadonlyMap<ItemId, OptionId> =>
  new Map(entries);

describe("scoreExam", () => {
  it("counts one mark per correct scored item", () => {
    const result = scoreExam(
      form,
      items,
      answers([
        [i0, "a"],
        [i1, "a"],
        [i2, "a"],
        [i3, "b"], // wrong
        [i4, "b"], // wrong
      ]),
    );

    expect({ raw: result.outcome.raw, scored: result.outcome.scored, band: result.outcome.band }).toEqual({
      raw: 3,
      scored: 5,
      band: "B",
    });
  });

  it("excludes pilot items from the raw score and marks them in the breakdown", () => {
    const result = scoreExam(
      form,
      items,
      answers([
        [i0, "a"],
        [pilot, "a"], // correct, but a pilot: must not count
      ]),
    );

    const pilotLine = result.items.find((line) => line.itemId === pilot);
    expect({ raw: result.outcome.raw, pilotCorrect: pilotLine?.correct, pilotFlag: pilotLine?.pilot }).toEqual({
      raw: 1,
      pilotCorrect: true,
      pilotFlag: true,
    });
  });

  it("treats an unanswered scored item as incorrect", () => {
    const result = scoreExam(form, items, answers([[i0, "a"]]));

    const unanswered = result.items.find((line) => line.itemId === i1);
    expect({ raw: result.outcome.raw, chosen: unanswered?.chosen, correct: unanswered?.correct }).toEqual({
      raw: 1,
      chosen: null,
      correct: false,
    });
  });

  it("maps a perfect scored run through the top of the form's cut table", () => {
    const result = scoreExam(
      form,
      items,
      answers([
        [i0, "a"],
        [i1, "a"],
        [i2, "a"],
        [i3, "a"],
        [i4, "a"],
      ]),
    );

    expect({ raw: result.outcome.raw, band: result.outcome.band, next: result.outcome.next }).toEqual({
      raw: 5,
      band: "C",
      next: null,
    });
  });

  it("maps an empty run to the bottom band and reports the next band up", () => {
    const result = scoreExam(form, items, answers([]));

    expect(result.outcome.raw).toBe(0);
    expect(result.outcome.band).toBe("X");
    expect(result.outcome.next?.band).toBe("A");
  });

  it("is idempotent: rescoring the same run produces an identical result", () => {
    const responses = answers([
      [i0, "a"],
      [i2, "a"],
    ]);

    expect(scoreExam(form, items, responses)).toEqual(scoreExam(form, items, responses));
  });

  it("throws when the form references an item missing from the bank", () => {
    const short = items.slice(0, 3);

    expect(() => scoreExam(form, short, answers([]))).toThrow(/missing/i);
  });

  it("ignores a response for an item that is not on the form", () => {
    const stray = itemId("01HSTRAY0000000000000001");
    const result = scoreExam(form, items, answers([[stray, "a"]]));

    expect(result.items.some((line) => line.itemId === stray)).toBe(false);
  });
});

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { ExamForm, ItemId, OptionId } from "@palier/domain";
import { formId, itemId } from "@palier/domain";

import { scoreExam } from "./scorer.js";
import { anItem } from "./__tests__/fixtures.js";

/**
 * Golden fixtures are the contract (implementation-plan.md §5). This locks the
 * exam band outcome at every cut boundary of the real reading-unsupervised
 * table, so a change to the scorer or the band mapper that moves any of these
 * values fails here and must be explained in the PR. The fixture is committed
 * JSON, human-reviewed; the test only reproduces it.
 */
type Golden = {
  readonly scored: number;
  readonly bandCuts: ExamForm["bandCuts"];
  readonly outcomes: ReadonlyArray<{
    readonly raw: number;
    readonly band: string;
    readonly bandMin: number;
    readonly bandMax: number;
    readonly next: { readonly band: string; readonly min: number; readonly pointsAway: number } | null;
  }>;
};

const golden = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("./__fixtures__/exam-band-boundaries.golden.json", import.meta.url)),
    "utf8",
  ),
) as Golden;

/** A form of `scored` items, no pilots, carrying the golden cut table. */
const ids: ItemId[] = Array.from({ length: golden.scored }, (_, i) =>
  itemId(`01HGOLD${String(i).padStart(17, "0")}`),
);
const items = ids.map((id) => anItem({ id, key: "a" }));
const form: ExamForm = {
  id: formId("01HFORM000000000000GLD"),
  skill: "reading",
  lang: "fr",
  mode: "unsupervised",
  itemIds: ids,
  pilotItemIds: [],
  timeLimitMinutes: 45,
  bandCuts: golden.bandCuts,
  version: 1,
};

/** Answer exactly `raw` items correctly; the rest are left unanswered. */
const runOf = (raw: number): ReadonlyMap<ItemId, OptionId> =>
  new Map(ids.slice(0, raw).map((id) => [id, "a" as OptionId]));

describe("scoreExam golden band boundaries (reading-unsupervised)", () => {
  it.each(golden.outcomes)("scores a raw of $raw as band $band", (expected) => {
    const { outcome } = scoreExam(form, items, runOf(expected.raw));

    expect({
      raw: outcome.raw,
      band: outcome.band,
      bandMin: outcome.bandMin,
      bandMax: outcome.bandMax,
      next: outcome.next,
    }).toEqual(expected);
  });
});

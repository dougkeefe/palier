import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { ExamForm, ExamVariant, ItemId, OptionId } from "@palier/domain";
import { formId, itemId, orderedCuts } from "@palier/domain";

import { scoreExam } from "./scorer.js";
import { anItem } from "./__tests__/fixtures.js";
import { pscSle } from "./__tests__/read-profile.js";

/**
 * Golden fixtures are the contract (implementation-plan.md §5). One committed,
 * human-reviewed JSON per profile variant locks the band outcome at every cut
 * boundary, both sides of each exact cut (Phase 3 exit criterion 1, [R3]).
 *
 * Driven by `Object.entries(profile.variants)`, so a variant added to the
 * profile without a golden fails here, and a golden whose structure or cuts
 * drift from the profile fails too. Each form carries the variant's pilot
 * items, all answered correctly, so a scorer that counted a pilot would move
 * every outcome.
 */
type Golden = {
  readonly variant: string;
  readonly items: number;
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

const goldenFor = (name: string): Golden =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`./__fixtures__/exam-band-boundaries.${name}.golden.json`, import.meta.url)),
      "utf8",
    ),
  ) as Golden;

/** Every sixth position holds a pilot, so pilots sit among the scored items. */
const formFor = (name: string, variant: ExamVariant) => {
  const pilotCount = variant.items - variant.scored;
  const all: ItemId[] = Array.from({ length: variant.items }, (_, i) =>
    itemId(`01HGOLD${name.slice(0, 3).toUpperCase()}${String(i).padStart(14, "0")}`),
  );
  const pilots = all.filter((_, i) => i % 6 === 5).slice(0, pilotCount);
  const pilotSet = new Set(pilots);
  const scoredIds = all.filter((id) => !pilotSet.has(id));
  const form: ExamForm = {
    id: formId(`01HFORMGLD-${name}`),
    skill: variant.skill,
    lang: "fr",
    mode: variant.mode,
    itemIds: all,
    pilotItemIds: pilots,
    timeLimitMinutes: variant.minutes,
    bandCuts: orderedCuts(variant),
    version: 1,
  };
  const items = all.map((id) => anItem({ id, key: "a" }));
  /** Exactly `raw` scored items correct, the rest unanswered, every pilot correct. */
  const runOf = (raw: number): ReadonlyMap<ItemId, OptionId> =>
    new Map([...scoredIds.slice(0, raw), ...pilots].map((id) => [id, "a" as OptionId]));
  return { form, items, pilots, runOf };
};

describe.each(Object.entries(pscSle().variants))("scoreExam golden band boundaries (%s)", (name, variant) => {
  const golden = goldenFor(name);
  const { form, items, pilots, runOf } = formFor(name, variant);

  it("has a golden whose structure and cuts are the profile's", () => {
    expect({ variant: golden.variant, items: golden.items, scored: golden.scored, bandCuts: golden.bandCuts }).toEqual({
      variant: name,
      items: variant.items,
      scored: variant.scored,
      bandCuts: orderedCuts(variant),
    });
    expect(pilots).toHaveLength(variant.items - variant.scored);
  });

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

  it("covers both sides of every exact cut", () => {
    const raws = new Set(golden.outcomes.map((o) => o.raw));
    for (const { min, max } of orderedCuts(variant)) {
      expect(raws).toContain(min);
      expect(raws).toContain(max);
    }
  });
});

import type { ExamForm, Item, ItemId, ItemResponse } from "@palier/domain";
import { itemTypeDefinition } from "@palier/domain";

import type { BandOutcome } from "./band-mapper.js";
import { resolveBand } from "./band-mapper.js";

/**
 * Mock-exam scoring (architecture.md §7.5). "There is no model in this path at
 * all. It is the same arithmetic the PSC uses, and it is the number the product
 * leads with." (§7.1)
 *
 * Two things make it honest: pilot items never touch the raw score, and the band
 * comes from the *form's* own `bandCuts` rather than the live profile, so a later
 * PSC change cannot silently rescore an old run (exam-form.ts). Pure, so
 * rescoring a stored run is idempotent by construction (§7.5, tier 2).
 */

export type ScoredExamItem = {
  readonly itemId: ItemId;
  /** What the candidate chose, or `null` if they left it unanswered. */
  readonly chosen: ItemResponse | null;
  readonly correct: boolean;
  /** A pilot item is scored for the record but excluded from the raw total. */
  readonly pilot: boolean;
};

export type ExamResult = {
  /** Raw score, band and boundaries, mapped through the form's cut table. */
  readonly outcome: BandOutcome;
  /** Every item on the form, in form order, pilots marked. */
  readonly items: readonly ScoredExamItem[];
};

export const scoreExam = (
  form: ExamForm,
  items: readonly Item[],
  responses: ReadonlyMap<ItemId, ItemResponse>,
): ExamResult => {
  const byId = new Map<ItemId, Item>(items.map((item) => [item.id, item]));
  const pilots = new Set<ItemId>(form.pilotItemIds);

  const lines: ScoredExamItem[] = form.itemIds.map((id) => {
    const item = byId.get(id);
    if (item === undefined) {
      throw new Error(
        `Form ${form.id} references item ${id}, which is missing from the bank. A form is immutable, so this is a bank/form mismatch, not a scoring bug.`,
      );
    }
    const chosen = responses.get(id) ?? null;
    const correct = chosen !== null && itemTypeDefinition(item.type).score(item, chosen).correct;
    return { itemId: id, chosen, correct, pilot: pilots.has(id) };
  });

  const scored = form.itemIds.length - form.pilotItemIds.length;
  const raw = lines.filter((line) => !line.pilot && line.correct).length;

  return { outcome: resolveBand(form.bandCuts, scored, raw), items: lines };
};

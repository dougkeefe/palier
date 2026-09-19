import type { Band } from "./bands.js";
import type { FormId, ItemId } from "./ids.js";
import type { ExamMode, Lang, ScoredSkill } from "./skills.js";

/** An inclusive raw-score range mapping to a band. */
export type BandCut = {
  readonly band: Band;
  readonly min: number;
  readonly max: number;
};

/**
 * A fixed, ordered list of item ids plus a configuration matching one of the
 * real test shapes. "Forms are versioned and immutable once published, so that
 * band mappings stay comparable over time." (architecture.md 5.4)
 *
 * `bandCuts` is duplicated here from the exam profile on purpose: a published
 * form carries the cuts it was scored against, so a later PSC change does not
 * silently rescore old results.
 */
export type ExamForm = {
  readonly id: FormId;
  readonly skill: ScoredSkill;
  readonly lang: Lang;
  readonly mode: ExamMode;
  readonly itemIds: readonly ItemId[];
  /** Excluded from the score, and marked as such in the review. */
  readonly pilotItemIds: readonly ItemId[];
  readonly timeLimitMinutes: number;
  readonly bandCuts: readonly BandCut[];
  readonly version: number;
};

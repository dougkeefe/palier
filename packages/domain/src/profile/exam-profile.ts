import type { Band, TargetBand } from "../bands.js";
import type { ExamMode, ScoredSkill, Skill } from "../skills.js";
import type { SubSkill } from "../sub-skills.js";
import type { Topic } from "../topics.js";
import type { Localised } from "../localised.js";

/**
 * Item counts, time limits, cut scores, level descriptors and the sub-skill
 * taxonomy are all externally defined by the PSC and can change without notice.
 * They live in one validated JSON profile so that a change is a content pull
 * request rather than a development task (ADR 9).
 *
 * "No exam rule lives in code." If you find yourself typing a number from
 * product-requirements.md 5 into a TypeScript file, it belongs here instead.
 */

/** An inclusive raw-score range, as `[min, max]`. */
export type CutRange = readonly [min: number, max: number];

export type ExamVariant = {
  readonly skill: ScoredSkill;
  readonly mode: ExamMode;
  /** The PSC test numbers this variant mirrors, where they are published. */
  readonly testNumbers: readonly string[];
  /** Items administered. */
  readonly items: number;
  /** Items that count. The difference is the pilot set, excluded from the score. */
  readonly scored: number;
  readonly minutes: number;
  /**
   * Inclusive raw-score ranges keyed by band. Not every variant uses every
   * band: the unsupervised papers have no E, because E is an exemption awarded
   * at the top of the supervised range.
   */
  readonly cuts: Partial<Record<Band, CutRange>>;
};

export type OralFormat = {
  readonly bands: readonly Band[];
  /** 20 to 40 minutes including instructions (product-requirements.md 5.3). */
  readonly minutes: CutRange;
  readonly validityYears: number;
  readonly minimumDaysBetweenAttempts: number;
  /**
   * Null, and deliberately so. The oral result comes from a certified
   * assessor's judgement against the descriptors; the PSC publishes no
   * raw-score cut table for it, and inventing one would be the exact failure
   * ADR 9 exists to prevent.
   */
  readonly cuts: null;
  /** Quoted verbatim by the oral scoring prompt, so the two cannot drift. */
  readonly descriptors: Readonly<Record<"A" | "B" | "C", Localised>>;
};

export type ExamProfile = {
  readonly id: string;
  readonly version: number;
  readonly skills: readonly Skill[];
  readonly bands: readonly Band[];
  readonly variants: Readonly<Record<string, ExamVariant>>;
  readonly subSkills: Readonly<Record<Skill, readonly SubSkill[]>>;
  readonly topics: readonly Topic[];
  readonly oral: OralFormat;
  /**
   * Four numbers: the review interval in days for Leitner boxes 1 to 4. Box 5
   * is retirement from the queue and needs no interval. Held here rather than
   * as constants so they can be retuned from usage data without a release
   * (ADR 8, architecture.md 7.3).
   */
  readonly leitnerIntervalDays: readonly number[];
  /** The item-quality retirement rules the statistics job applies (architecture.md 7.6). */
  readonly itemStatistics: ItemStatisticsRules;
  /** The diagnostic's size, its even draw across bands, and its placement rules (PRD 6.2, ADR 25). */
  readonly diagnostic: DiagnosticRules;
};

/**
 * The diagnostic (product-requirements.md 6.2, ADR 25): a fixed-length run drawn evenly across
 * the bands the bank holds, whose score places the plan. The placement is a starting level for
 * practice, never a band (ADR 7): a band still comes only from a mock exam's cut table.
 */
export type DiagnosticRules = {
  /** Items in one run, per skill. A run with fewer answers than this never places. */
  readonly size: number;
  /** How many of `size` are drawn at each band. Sums to `size`. */
  readonly bandQuota: Readonly<Partial<Record<TargetBand, number>>>;
  /** The proportion correct at a band that counts as secure there, so the plan may start at it. */
  readonly secureAccuracy: number;
  /** When the plan starts below the target, the share of new items drawn at the starting band. */
  readonly startShare: number;
  /** How many of the run's weakest sub-skills the plan favours afterwards. */
  readonly focusCount: number;
  /** Days after which the diagnostic is offered again (PRD 6.2's "every four weeks"). */
  readonly retakeDays: number;
};

/**
 * When an item's observed responses retire it (architecture.md 7.6, PRD 13.3).
 * Every threshold is band-independent, because the PRD gives one pair for every
 * band. These are the retirement rules, not calibration: nothing here reweights
 * an estimate (ADR 7).
 */
export type ItemStatisticsRules = {
  /** Retire below this proportion correct: nearly nobody gets it right. */
  readonly pCorrectMin: number;
  /** Retire above this proportion correct: nearly everybody does. */
  readonly pCorrectMax: number;
  /**
   * Retire below this point-biserial. At 0, a negative correlation retires:
   * the item punishes the people who know the most, the signature of a broken
   * key or two defensible answers.
   */
  readonly pointBiserialMin: number;
  /** Responses before the proportion correct is trusted ("usable from around 30"). */
  readonly minResponsesDifficulty: number;
  /** Responses before the point-biserial is trusted ("noisy below about 100"). */
  readonly minResponsesDiscrimination: number;
};

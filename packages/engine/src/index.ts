/**
 * `@palier/engine`: the pure algorithms (implementation-plan.md §3.2). Everything
 * here is a deterministic function over plain data — no I/O, no clock, no
 * randomness that is not injected as a parameter (progress.md deviation D32).
 */

export type { BandOutcome, NextBand } from "./band-mapper.js";
export {
  RawScoreOutOfRangeError,
  UnmappedRawScoreError,
  bandForRawScore,
  mapRawScore,
  pointsToBand,
} from "./band-mapper.js";

export type { BandTrend, SkillTrend } from "./trend-calculator.js";
export { MIN_EVIDENCE, TREND_WINDOW, calculateTrend } from "./trend-calculator.js";

export type { ExamResult, ScoredExamItem } from "./scorer.js";
export { scoreExam } from "./scorer.js";

export type { Review, ReviewGrade } from "./scheduler.js";
export { retirementBox, scheduleReview } from "./scheduler.js";

export type { SelectionCriteria, SelectionMode } from "./selector.js";
export { RECENT_DAYS, WEAKEST_WEIGHT, selectItems, workingSet } from "./selector.js";

export {
  WEAKEST_COUNT,
  WEAKEST_MIN,
  WEAKEST_WINDOW,
  weakestSubSkills,
} from "./weakest-sub-skills.js";

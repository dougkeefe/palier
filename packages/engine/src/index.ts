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

export type { BandTrend, SkillTrend, TrendEvidence } from "./trend-calculator.js";
export { MIN_EVIDENCE, TREND_WINDOW, calculateTrend, trendEvidence } from "./trend-calculator.js";

export type { ExamResult, ScoredExamItem } from "./scorer.js";
export { scoreExam } from "./scorer.js";

export type { Review, ReviewGrade } from "./scheduler.js";
export { retirementBox, scheduleReview } from "./scheduler.js";

export type { SelectionCriteria, SelectionMode } from "./selector.js";
export { RECENT_DAYS, WEAKEST_WEIGHT, selectItems, workingSet } from "./selector.js";

export type { DayPlan, DayPlanInput } from "./planner.js";
export {
  MAINTENANCE_SHARE,
  NEW_SHARE,
  REVIEW_SHARE,
  SHORTEN_FACTOR,
  TAPER_DAYS,
  planDay,
} from "./planner.js";

export {
  WEAKEST_COUNT,
  WEAKEST_MIN,
  WEAKEST_WINDOW,
  weakestSubSkills,
} from "./weakest-sub-skills.js";

export type { SubSkillTally } from "./sub-skill-breakdown.js";
export { examSubSkillBreakdown, subSkillBreakdown } from "./sub-skill-breakdown.js";

export { restBucket, restBuckets } from "./rest-bucket.js";

export type { ItemStatistic } from "./item-statistics.js";
export { itemStatistics, retirementVerdicts } from "./item-statistics.js";

export type { CapState, Preflight, SpendRow, SpendTotals } from "./spend.js";
export {
  CAP_WARNING_PERCENT,
  capState,
  estimateFeatureCost,
  monthStart,
  preflight,
  spendTotals,
  weekStart,
} from "./spend.js";

export type { OralSessionCommand, OralSessionEvent, OralSessionState, OralStep } from "./oral-session.js";
export { startOralSession, stepOralSession } from "./oral-session.js";

import type { Attempt, Item, ItemId, Lang, ScoredSkill, SubSkill, TargetBand } from "@palier/domain";

import { selectItems, workingSet } from "./selector.js";
import { weakestSubSkills } from "./weakest-sub-skills.js";

/**
 * Daily plan generation (architecture.md §7.4). A composition, not new
 * arithmetic: it drives every selection through {@link selectItems} and reads the
 * user's strengths from {@link weakestSubSkills}, adding no sampling or spacing
 * code of its own.
 *
 *   plan = [ due reviews, capped at the review share ]
 *        + [ new items targeting the weakest sub-skills ]
 *        + [ mixed maintenance from strengths ]
 *   adjusted by test-date proximity and yesterday's completion.
 *
 * Two scope decisions, both recorded:
 *  - **Budget is item counts, not minutes (D34).** No per-item duration lives in
 *    the profile or domain, and a duration constant here would break ADR 9. The
 *    caller passes a total item budget; the plan splits it.
 *  - **Oral-session findings bias the new items (D35, closed by D124).** The latest
 *    oral report's fixes arrive as `focusSubSkills`, weighted as the weakest are.
 *    Additive: without them the plan is exactly what it was, goldens included.
 *
 * `random` and `now` are primitives, not the ports (D32). Due reviews arrive
 * already resolved to items (the `@palier/app` use case reads them from the
 * `ScheduleStore`), so the planner needs no `ExamProfile`.
 */

/** Share of the day's budget reserved for due reviews before roll-over (§7.4). */
export const REVIEW_SHARE = 0.4;
/** Share targeting new items on the weakest sub-skills (§7.4). */
export const NEW_SHARE = 0.4;
/** Share of mixed maintenance drawn from strengths (§7.4). */
export const MAINTENANCE_SHARE = 0.2;
/** Days before a declared test date when the plan tapers to review-only (§7.4). */
export const TAPER_DAYS = 3;
/** After an incomplete day the budget shortens by this factor — never lengthens (§7.4). */
export const SHORTEN_FACTOR = 0.5;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export type DayPlanInput = {
  readonly skill: ScoredSkill;
  readonly lang: Lang;
  readonly targetBand: TargetBand;
  /** Total item budget for the day, in item counts rather than minutes (D34). */
  readonly sessionSize: number;
  /** Items due for review today, resolved from the `ScheduleStore` by the caller. */
  readonly dueReviews: readonly Item[];
  readonly pool: readonly Item[];
  readonly attempts: readonly Attempt[];
  /** A declared test date (ISO). When set and near, the plan tapers (§7.4). */
  readonly testDate?: string;
  /** `false` shortens today's budget; `true` or absent leaves it unchanged (§7.4). */
  readonly lastDayCompleted?: boolean;
  /**
   * The sub-skills the latest oral report's fixes drill (§7.4, "recent oral session
   * findings"; D124). New items in them are drawn as the weakest are. Maintenance is
   * unchanged. Absent or empty changes nothing.
   */
  readonly focusSubSkills?: readonly SubSkill[];
};

export type DayPlan = {
  readonly reviews: readonly Item[];
  readonly newItems: readonly Item[];
  readonly maintenance: readonly Item[];
  /** The three buckets in study order: reviews, then new, then maintenance. */
  readonly items: readonly Item[];
  /** True within the final {@link TAPER_DAYS} before the test date (§7.4). */
  readonly tapering: boolean;
  /** True while tapering but outside the final 24 hours — no mock in the last day (§7.4). */
  readonly mockExamAdvised: boolean;
};

export const planDay = (input: DayPlanInput, random: () => number, now: string): DayPlan => {
  const { skill, lang, targetBand, dueReviews, pool, attempts } = input;

  // Yesterday's completion shortens the day, never lengthens it (§7.4).
  const size =
    input.lastDayCompleted === false
      ? Math.floor(input.sessionSize * SHORTEN_FACTOR)
      : input.sessionSize;

  // Test-date proximity: the final three days taper to review-only, and no mock
  // exam is advised inside the last 24 hours (§7.4).
  let tapering = false;
  let mockExamAdvised = false;
  if (input.testDate !== undefined) {
    const ms = new Date(input.testDate).getTime() - new Date(now).getTime();
    tapering = ms >= 0 && ms / DAY_MS <= TAPER_DAYS;
    mockExamAdvised = tapering && ms >= 24 * HOUR_MS;
  }

  // A short confidence set of strengths sits inside the day whether tapering or not.
  const maintBudget = tapering
    ? Math.floor(size * MAINTENANCE_SHARE)
    : // Non-taper: reviews take up to their share, then the remainder splits into
      // new and maintenance at the 2:1 ratio of their shares, so an under-filled
      // review bucket rolls its budget into learning and the day still fills.
      0;

  const reviewBudget = tapering ? size - maintBudget : Math.floor(size * REVIEW_SHARE);
  const reviews = dueReviews.slice(0, Math.max(0, reviewBudget));
  const reviewIds = new Set<ItemId>(reviews.map((item) => item.id));

  const remaining = Math.max(0, size - reviews.length);
  const newCount = tapering
    ? 0
    : Math.round((remaining * NEW_SHARE) / (NEW_SHARE + MAINTENANCE_SHARE));
  const maintCount = tapering ? maintBudget : remaining - newCount;

  // New items: practice mode already weights the three weakest sub-skills (§7.2), and
  // the oral report's, when there is one (D124). Reviews are excluded from the pool so
  // the buckets cannot overlap.
  const newItems = tapering
    ? []
    : selectItems(
        {
          skill,
          lang,
          targetBand,
          count: newCount,
          mode: "practice",
          ...(input.focusSubSkills === undefined ? {} : { boost: input.focusSubSkills }),
        },
        pool.filter((item) => !reviewIds.has(item.id)),
        attempts,
        random,
        now,
      );
  const newIds = new Set<ItemId>(newItems.map((item) => item.id));

  // Maintenance: strengths are the sub-skills not among the weakest. Diagnostic
  // mode samples uniformly (no weighting) and spaces by sub-skill; pre-filtering
  // to the working-set bands and away from reviews/new keeps the buckets disjoint.
  const weakest = new Set<SubSkill>(weakestSubSkills(skill, attempts, pool));
  const workingBands = new Set<TargetBand>(workingSet(targetBand));
  const maintenance = selectItems(
    { skill, lang, targetBand, count: Math.max(0, maintCount), mode: "diagnostic" },
    pool.filter(
      (item) =>
        !reviewIds.has(item.id) &&
        !newIds.has(item.id) &&
        !weakest.has(item.subSkill) &&
        workingBands.has(item.targetBand),
    ),
    attempts,
    random,
    now,
  );

  return {
    reviews,
    newItems,
    maintenance,
    items: [...reviews, ...newItems, ...maintenance],
    tapering,
    mockExamAdvised,
  };
};

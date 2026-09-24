import type { SettingsStore } from "@palier/app";
import { TARGET_BANDS, type TargetBand } from "@palier/domain";
import type { DayPlan } from "@palier/engine";

/**
 * What onboarding collects and every study screen reads (product-requirements.md
 * §8.1): the target band, the daily goal, an optional test date. Stored as one
 * setting, so it exports, imports and wipes with everything else [R11].
 */
export type StudyProfile = {
  readonly targetBand: TargetBand;
  readonly dailyGoalMinutes: DailyGoal;
  /** A declared test date (`YYYY-MM-DD`), or null. Near it, the plan tapers (§7.4). */
  readonly testDate: string | null;
};

/** §8.1 step 4: "Daily goal: 10, 20 or 30 minutes." */
export const DAILY_GOALS = [10, 20, 30] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number];

export const STUDY_PROFILE_KEY = "studyProfile";

const TEST_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The stored profile, or null if there is none or it is not one we can read. */
export const parseStudyProfile = (raw: unknown): StudyProfile | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!TARGET_BANDS.includes(r.targetBand as TargetBand)) return null;
  if (!DAILY_GOALS.includes(r.dailyGoalMinutes as DailyGoal)) return null;
  if (!(r.testDate === null || (typeof r.testDate === "string" && TEST_DATE.test(r.testDate)))) return null;
  return {
    targetBand: r.targetBand as TargetBand,
    dailyGoalMinutes: r.dailyGoalMinutes as DailyGoal,
    testDate: r.testDate,
  };
};

export const readStudyProfile = async (settings: SettingsStore): Promise<StudyProfile | null> =>
  parseStudyProfile(await settings.get<unknown>(STUDY_PROFILE_KEY));

export const writeStudyProfile = (settings: SettingsStore, profile: StudyProfile): Promise<void> =>
  settings.set(STUDY_PROFILE_KEY, profile);

/**
 * The minutes-to-items model D34 deferred until "a real minutes-per-day goal in the
 * UI needs converting to counts" — which the daily goal now is (progress.md D63).
 * One number, a study heuristic in the D34 sense rather than an exam rule: about a
 * minute and a half per item, answer and feedback together. It sits behind the
 * `planDay(sessionSize)` seam, as D34 said the fix would. Principle 8's measurable
 * replacement is the user's own timings, once there is enough of them to fit (the
 * bar ADR 8 and D40 set for the `slow` threshold too).
 */
export const MINUTES_PER_ITEM = 1.5;

/** A session is never shorter than this, whatever the goal. */
const MIN_SESSION_ITEMS = 5;

export const sessionSizeFor = (goalMinutes: number): number =>
  Math.max(MIN_SESSION_ITEMS, Math.round(goalMinutes / MINUTES_PER_ITEM));

export const minutesFor = (items: number): number => Math.max(1, Math.round(items * MINUTES_PER_ITEM));

/**
 * §6.2: "A short placement, 30 items and about 15 minutes per skill." The
 * diagnostic's size is the caller's to choose (D47); a bank smaller than this
 * yields every item it has.
 */
export const DIAGNOSTIC_SIZE = 30;

/** Today's plan as §8.2's rows: each bucket with its count and estimated minutes. */
export type PlanRow = {
  readonly kind: "review" | "targeted" | "keepSharp";
  readonly count: number;
  readonly minutes: number;
};

/**
 * The planner's three buckets, in study order, as the card's rows (§8.2: "three
 * tappable rows, each showing type, item count and estimated minutes"). Empty
 * buckets are left out rather than shown as zero.
 */
export const planRows = (plan: DayPlan): PlanRow[] =>
  (
    [
      { kind: "review", count: plan.reviews.length },
      { kind: "targeted", count: plan.newItems.length },
      { kind: "keepSharp", count: plan.maintenance.length },
    ] as const
  )
    .filter((row) => row.count > 0)
    .map((row) => ({ ...row, minutes: minutesFor(row.count) }));

const DAY_MS = 86_400_000;

/**
 * Whole days from today (UTC) to a `YYYY-MM-DD` test date, for the countdown §8.2
 * puts above the readiness card. Null when there is no date or it has passed, so a
 * stale date simply stops showing rather than counting negative days.
 */
export const daysUntil = (testDate: string | null, nowIso: string): number | null => {
  if (testDate === null) return null;
  const days = Math.round(
    (Date.parse(`${testDate}T00:00:00.000Z`) - Date.parse(`${nowIso.slice(0, 10)}T00:00:00.000Z`)) / DAY_MS,
  );
  return Number.isNaN(days) || days < 0 ? null : days;
};

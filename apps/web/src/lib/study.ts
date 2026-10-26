import type { SettingsStore } from "@palier/app";
import {
  SKILLS,
  TARGET_BANDS,
  bandRank,
  isBand,
  type Band,
  type ScoredSkill,
  type Skill,
  type TargetBand,
} from "@palier/domain";
import { type DayPlan, type SkillStanding, skillStanding } from "@palier/engine";

/**
 * What onboarding collects, the study settings edit, and every study screen reads
 * (product-requirements.md §8.1): a target per skill, the result the user holds in each, the daily
 * goal and an optional test date. Stored as one setting, so it exports, imports, syncs and wipes
 * with everything else [R11, R14].
 */
export type StudyProfile = {
  /** The band each skill is studied towards: a position's profile, such as CBC (progress.md D259). */
  readonly targets: Readonly<Record<Skill, TargetBand>>;
  /** The result the user declared holding in each skill, or null with none (D259). Never an estimate. */
  readonly current: Readonly<Record<Skill, Band | null>>;
  readonly dailyGoalMinutes: DailyGoal;
  /** A declared test date (`YYYY-MM-DD`), or null. Near it, the plan tapers (§7.4). */
  readonly testDate: string | null;
};

/** No result declared in any skill: the profile before D259, and onboarding's default. */
export const NO_RESULTS: StudyProfile["current"] = { reading: null, writing: null, oral: null };

/** One target for every skill, as onboarding's single question sets it. */
export const targetsOf = (band: TargetBand): StudyProfile["targets"] => ({ reading: band, writing: band, oral: band });

export const targetFor = (profile: StudyProfile, skill: Skill): TargetBand => profile.targets[skill];

export const currentFor = (profile: StudyProfile, skill: Skill): Band | null => profile.current[skill];

/** Where a skill stands (D259): exempt leaves the plan, held keeps sharp, working places it. */
export const standingFor = (profile: StudyProfile, skill: Skill, exemptBand: Band): SkillStanding =>
  skillStanding({ current: currentFor(profile, skill), target: targetFor(profile, skill), exemptBand });

/** Whether every skill has the same target, so one answer describes them all. */
export const oneTarget = (targets: StudyProfile["targets"]): TargetBand | null => {
  const [first, ...rest] = SKILLS.map((skill) => targets[skill]);
  return first !== undefined && rest.every((band) => band === first) ? first : null;
};

/** The highest target of the scored skills: the band `/progress`'s overview reads them both at. */
export const highestScoredTarget = (profile: StudyProfile): TargetBand =>
  bandRank(profile.targets.reading) >= bandRank(profile.targets.writing) ? profile.targets.reading : profile.targets.writing;

/** The highest target, stored as `targetBand` beside the targets for a tab still on the old shape. */
const highestTarget = (targets: StudyProfile["targets"]): TargetBand =>
  SKILLS.map((skill) => targets[skill]).reduce((a, b) => (bandRank(b) > bandRank(a) ? b : a));

/** §8.1 step 4: "Daily goal: 10, 20 or 30 minutes." */
export const DAILY_GOALS = [10, 20, 30] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number];

export const STUDY_PROFILE_KEY = "studyProfile";

const TEST_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isTargetBand = (value: unknown): value is TargetBand => TARGET_BANDS.includes(value as TargetBand);

const recordOf = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

/**
 * The stored profile, or null if there is none or it is not one we can read. A profile stored
 * before D259 has one `targetBand` and no results: every skill takes that target, and holds
 * nothing declared. A skill's own target, when stored, wins over it. A result that is not a band
 * reads as none, since a declaration is optional and never worth a trip back to onboarding.
 */
export const parseStudyProfile = (raw: unknown): StudyProfile | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!DAILY_GOALS.includes(r.dailyGoalMinutes as DailyGoal)) return null;
  if (!(r.testDate === null || (typeof r.testDate === "string" && TEST_DATE.test(r.testDate)))) return null;
  const storedTargets = recordOf(r.targets);
  const storedCurrent = recordOf(r.current);
  const targets: Partial<Record<Skill, TargetBand>> = {};
  const current: Partial<Record<Skill, Band | null>> = {};
  for (const skill of SKILLS) {
    const target = isTargetBand(storedTargets[skill]) ? storedTargets[skill] : r.targetBand;
    if (!isTargetBand(target)) return null;
    targets[skill] = target;
    const held = storedCurrent[skill];
    current[skill] = isBand(held) ? held : null;
  }
  return {
    targets: targets as StudyProfile["targets"],
    current: current as StudyProfile["current"],
    dailyGoalMinutes: r.dailyGoalMinutes as DailyGoal,
    testDate: r.testDate,
  };
};

export const readStudyProfile = async (settings: SettingsStore): Promise<StudyProfile | null> =>
  parseStudyProfile(await settings.get<unknown>(STUDY_PROFILE_KEY));

/**
 * Stores the profile with `targetBand`, the highest target, beside it (D259): a tab or a service
 * worker still on the code before D259 reads the synced setting by that field, and would otherwise
 * send its user back to onboarding.
 */
export const writeStudyProfile = (settings: SettingsStore, profile: StudyProfile): Promise<void> =>
  settings.set(STUDY_PROFILE_KEY, { targetBand: highestTarget(profile.targets), ...profile });

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
 * The most items one review set holds. §8.8 shows the queue as "a single stack"; this
 * caps a long backlog at a sitting's worth, and the rest waits for the next set.
 */
export const REVIEW_SET_LIMIT = 40;

/**
 * The study parameters a scored skill's day is planned with, one place for Today's preview and the
 * drill's session, so the plan shown is the plan opened (D259): the skill's own target, the goal's
 * size, the test date, and keeping sharp when the user holds the skill at its target already.
 */
export const dayRequestFor = (
  profile: StudyProfile,
  skill: ScoredSkill,
  exemptBand: Band,
): {
  readonly targetBand: TargetBand;
  readonly sessionSize: number;
  readonly testDate?: string;
  readonly maintaining?: boolean;
} => ({
  targetBand: targetFor(profile, skill),
  sessionSize: sessionSizeFor(profile.dailyGoalMinutes),
  ...(profile.testDate === null ? {} : { testDate: `${profile.testDate}T00:00:00.000Z` }),
  ...(standingFor(profile, skill, exemptBand) === "held" ? { maintaining: true } : {}),
});

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

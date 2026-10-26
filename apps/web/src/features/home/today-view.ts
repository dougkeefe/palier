import type { ScoredSkill } from "@palier/domain";
import { MAINTAIN_FACTOR, type PracticeActivity, type SkillStanding } from "@palier/engine";
import type { CalendarMark } from "@palier/ui";

import { SKILL_KINDS, type SkillKind } from "../skills/skill-look";

/**
 * The decisions behind Today's dashboard (progress.md D219): the three skill cards in the hero,
 * the week's minutes, and the practice calendar's marks and month. Pure, so the `.tsx` only renders.
 */

/** A skill card's line and its rail: how much of today's plan is done (the human's choice, D219). */
export type SkillCard =
  | {
      readonly kind: ScoredSkill;
      /** Plan answers today at this skill, uncapped, as the line reads it. */
      readonly done: number;
      /** Today's plan: the session size the daily goal gives (`sessionSizeFor`). */
      readonly goal: number;
      readonly rail: { readonly current: number; readonly total: number };
    }
  | {
      readonly kind: "oral";
      readonly sessions: number;
      /** Minutes spoken today, rounded: zero for a session answered by typing, which spoke nothing. */
      readonly minutes: number;
      /** Speaking's plan is one session (D248), so the rail is full once a session has ended today. */
      readonly rail: { readonly current: number; readonly total: number };
    };

const MINUTE_MS = 60_000;

/** Milliseconds as whole minutes, as the hero's oral card and speaking's plan both show them. */
export const minutesOf = (ms: number): number => Math.round(ms / MINUTE_MS);

/**
 * The hero's three cards. A skill held at its target is planned on the planner's keep-sharp share
 * of the day (D259), so its rail measures against that.
 */
export const skillCards = (
  activity: PracticeActivity,
  sessionSize: number,
  held: readonly ScoredSkill[] = [],
): readonly SkillCard[] => {
  const scored = (kind: ScoredSkill): SkillCard => {
    const goal = Math.max(1, held.includes(kind) ? Math.floor(sessionSize * MAINTAIN_FACTOR) : sessionSize);
    const done = activity.today[kind];
    return { kind, done, goal, rail: { current: Math.min(done, goal), total: goal } };
  };
  const sessions = activity.today.oralSessions;
  return [
    scored("reading"),
    scored("writing"),
    {
      kind: "oral",
      sessions,
      minutes: minutesOf(activity.today.oralMs),
      rail: { current: sessions === 0 ? 0 : 1, total: 1 },
    },
  ];
};

/** Each skill's standing against its target, from the results the user declared (D259). */
export type SkillStandings = Readonly<Record<SkillKind, SkillStanding>>;

/**
 * The skills today's plan offers as tabs (D259): every skill but one the user holds at the
 * exemption, which leaves the plan. Empty when all three are exempt, and Today celebrates instead.
 */
export const planSkills = (standings: SkillStandings): readonly SkillKind[] =>
  SKILL_KINDS.filter((kind) => standings[kind] !== "exempt");

/** The scored skills the user holds at their target, which the plan only keeps sharp (D259). */
export const heldSkills = (standings: SkillStandings): readonly ScoredSkill[] =>
  (["reading", "writing"] as const).filter((kind) => standings[kind] === "held");

/** The statistics tile's figure and its line: the week's practice minutes, and each day's. */
export const weekMinutes = (msByDay: readonly number[]): { readonly total: number; readonly byDay: readonly number[] } => ({
  total: minutesOf(msByDay.reduce((sum, ms) => sum + ms, 0)),
  byDay: msByDay.map((ms) => ms / MINUTE_MS),
});

/**
 * The calendar's marks: each day the streak counted is practised, each day its freeze kept is
 * kept, and the declared test date is the test, which wins over either.
 */
export const calendarMarks = (
  activeDays: readonly string[],
  frozen: readonly string[],
  testDate: string | null,
): ReadonlyMap<string, CalendarMark> => {
  const marks = new Map<string, CalendarMark>();
  for (const day of activeDays) marks.set(day, "practised");
  for (const day of frozen) if (!marks.has(day)) marks.set(day, "kept");
  if (testDate !== null) marks.set(testDate, "test");
  return marks;
};

export type Month = { readonly year: number; readonly month: number };

/** The month holding a local day, `YYYY-MM-DD`. */
export const monthOf = (day: string): Month => ({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) });

/** The month `delta` months after `from` (before it, when negative), across years. */
export const stepMonth = (from: Month, delta: number): Month => {
  const index = from.year * 12 + (from.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
};

/** Seven days, Sunday first, to name the calendar's columns in any locale: 4 October 2026 was a Sunday. */
export const WEEK_OF_SUNDAY: readonly string[] = Array.from(
  { length: 7 },
  (_, i) => `2026-10-${String(4 + i).padStart(2, "0")}T12:00:00.000Z`,
);

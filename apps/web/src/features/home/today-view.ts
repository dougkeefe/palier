import type { ScoredSkill } from "@palier/domain";
import type { PracticeActivity } from "@palier/engine";
import type { CalendarMark } from "@palier/ui";

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
      /** No plan holds oral practice, so the rail is full once a session has ended today. */
      readonly rail: { readonly current: number; readonly total: number };
    };

const MINUTE_MS = 60_000;

const minutesOf = (ms: number): number => Math.round(ms / MINUTE_MS);

export const skillCards = (activity: PracticeActivity, sessionSize: number): readonly SkillCard[] => {
  const goal = Math.max(1, sessionSize);
  const scored = (kind: ScoredSkill): SkillCard => {
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

/**
 * The engagement mechanics Gate K kept in 1.0 (PRD §9, progress.md D145): the streak with its
 * silent freeze, and the milestone moments. Pure: the days, "today" and the allowance arrive as
 * plain data (D32), and both are functions of the day *set*, never of its order (D73).
 *
 * - **A local day** is the calendar day on the device's clock, `YYYY-MM-DD`, because a streak is
 *   about the user's evenings, not UTC's. The time zone is handed in; the engine reads no clock.
 * - **The streak** counts active days back from today. Today not done yet breaks nothing. A missed
 *   day is frozen, silently, while fewer than `freezesPerMonth` days of *that day's* calendar month
 *   are frozen; otherwise the streak ends there. A frozen day keeps the streak but adds nothing to
 *   its length, and a freeze is only kept if an active day comes before it, so nothing is frozen
 *   before the streak began.
 */

/** A calendar day on the device's clock, `YYYY-MM-DD`. */
export type LocalDay = string;

export type Streak = {
  /** Active days in the current streak; frozen days keep it alive but are not counted. */
  readonly length: number;
  /** The days the freeze kept, newest first. */
  readonly frozen: readonly LocalDay[];
  readonly doneToday: boolean;
};

export type StreakInput = {
  /** The local days with any completed session, in any order, duplicates allowed. */
  readonly days: readonly LocalDay[];
  readonly today: LocalDay;
  /** Missed days the streak survives per calendar month (a product rule, not exam data). */
  readonly freezesPerMonth: number;
};

const LOCAL_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const dayMs = (day: LocalDay): number => {
  const ms = LOCAL_DAY.test(day) ? Date.parse(`${day}T00:00:00.000Z`) : Number.NaN;
  if (Number.isNaN(ms)) throw new RangeError(`"${day}" is not a local day.`);
  return ms;
};

/** The local day `days` calendar days after `day` (before it, when negative). */
export const shiftDay = (day: LocalDay, days: number): LocalDay => new Date(dayMs(day) + days * DAY_MS).toISOString().slice(0, 10);

const previousDay = (day: LocalDay): LocalDay => shiftDay(day, -1);

/**
 * One formatter per time zone, since building one costs far more than using it, and the trend
 * history asks for a local day per attempt (D198). A cache of a pure function: same answers.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = formatters.get(timeZone);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

/** The local day holding `at` in `timeZone`. */
export const localDay = (at: string, timeZone: string): LocalDay => {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) throw new RangeError(`"${at}" is not an instant.`);
  const parts = formatterFor(timeZone).formatToParts(date);
  // Read by part rather than trusting a locale's separator, which differs between engines.
  const field = { year: "", month: "", day: "" };
  for (const { type, value } of parts) if (type === "year" || type === "month" || type === "day") field[type] = value;
  return `${field.year}-${field.month}-${field.day}`;
};

/** The current streak, walking back from `today`. */
export const streak = ({ days, today, freezesPerMonth }: StreakInput): Streak => {
  if (!Number.isInteger(freezesPerMonth) || freezesPerMonth < 0) {
    throw new RangeError(`A freeze allowance of ${String(freezesPerMonth)} is not a whole number of days.`);
  }
  const todayMs = dayMs(today);
  // A day after today (a clock moved back) is not part of today's streak.
  const active = new Set(days.filter((day) => dayMs(day) <= todayMs));
  const doneToday = active.has(today);
  if (active.size === 0) return { length: 0, frozen: [], doneToday };

  const first = [...active].reduce((a, b) => (a < b ? a : b));
  const used = new Map<string, number>();
  const frozen: LocalDay[] = [];
  let pending: LocalDay[] = [];
  let length = 0;
  for (let day = doneToday ? today : previousDay(today); day >= first; day = previousDay(day)) {
    if (active.has(day)) {
      length += 1;
      frozen.push(...pending);
      pending = [];
      continue;
    }
    const month = day.slice(0, 7);
    const spent = used.get(month) ?? 0;
    if (spent >= freezesPerMonth) break;
    used.set(month, spent + 1);
    pending.push(day);
  }
  return { length, frozen, doneToday };
};

/** The milestone moments, in the order they are shown (PRD §9). */
export const MILESTONES = ["first-exam", "first-oral", "items-answered", "first-exam-at-c"] as const;
export type MilestoneId = (typeof MILESTONES)[number];

export type MilestoneFacts = {
  readonly examsSubmitted: number;
  /** Submitted mock exams whose band is C or above. */
  readonly examsAtOrAboveC: number;
  readonly oralSessionsEnded: number;
  readonly itemsAnswered: number;
};

/** Every milestone the facts have reached, in `MILESTONES` order. */
export const milestonesReached = (
  facts: MilestoneFacts,
  thresholds: { readonly itemsAnswered: number },
): readonly MilestoneId[] => {
  const reached: Record<MilestoneId, boolean> = {
    "first-exam": facts.examsSubmitted > 0,
    "first-oral": facts.oralSessionsEnded > 0,
    "items-answered": facts.itemsAnswered >= thresholds.itemsAnswered,
    "first-exam-at-c": facts.examsAtOrAboveC > 0,
  };
  return MILESTONES.filter((id) => reached[id]);
};

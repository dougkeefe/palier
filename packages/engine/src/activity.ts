/**
 * The week on Today (progress.md D219): what was practised today at each skill, and across the last
 * `ACTIVITY_DAYS` local days, how many questions were answered and how long each day's practice
 * took. Pure: the attempts, the ended oral sessions, "today" and the time zone arrive as plain data
 * (D32), and the result is a function of the record *set*, never of its order (D73).
 *
 * Time is measured, never guessed: an answer's `msToConfirm` and an oral session's spoken time, the
 * same two measures `/progress` sums (D145). Time spent reading feedback is not in it.
 */
import type { Skill } from "@palier/domain";

import { type LocalDay, localDay, shiftDay } from "./engagement.js";

/** How many local days "this week" holds on Today, ending today. */
export const ACTIVITY_DAYS = 7;

export type ActivityAttempt = {
  readonly skill: Skill;
  readonly ts: string;
  readonly msToConfirm: number;
};

export type ActivityOralSession = {
  readonly endedAt: string;
  /** The candidate's spoken time, `speakingMs` over the session's turns. */
  readonly spokenMs: number;
};

export type ActivityInput = {
  /** Practice answers only: the caller leaves out the modes that are not practice. */
  readonly attempts: readonly ActivityAttempt[];
  readonly oral: readonly ActivityOralSession[];
  readonly today: LocalDay;
  readonly timeZone: string;
};

export type PracticeActivity = {
  readonly today: {
    readonly reading: number;
    readonly writing: number;
    readonly oralSessions: number;
    readonly oralMs: number;
  };
  readonly week: {
    /** Reading and writing answers in the window. */
    readonly answered: number;
    readonly oralSessions: number;
    /** Each local day's measured practice time, oldest first, the last being today. */
    readonly msByDay: readonly number[];
  };
};

export const weekActivity = ({ attempts, oral, today, timeZone }: ActivityInput): PracticeActivity => {
  const days = Array.from({ length: ACTIVITY_DAYS }, (_, i) => shiftDay(today, i - (ACTIVITY_DAYS - 1)));
  const msOn = new Map(days.map((day) => [day, 0]));
  const counts = { reading: 0, writing: 0, answered: 0, oralToday: 0, oralMsToday: 0, oralWeek: 0 };

  for (const attempt of attempts) {
    if (attempt.skill === "oral") continue;
    const day = localDay(attempt.ts, timeZone);
    const so = msOn.get(day);
    if (so === undefined) continue;
    counts.answered += 1;
    msOn.set(day, so + Math.max(0, attempt.msToConfirm));
    if (day === today) counts[attempt.skill] += 1;
  }

  for (const session of oral) {
    const day = localDay(session.endedAt, timeZone);
    const so = msOn.get(day);
    if (so === undefined) continue;
    const ms = Math.max(0, session.spokenMs);
    counts.oralWeek += 1;
    msOn.set(day, so + ms);
    if (day === today) {
      counts.oralToday += 1;
      counts.oralMsToday += ms;
    }
  }
  const msByDay = [...msOn.values()];

  return {
    today: { reading: counts.reading, writing: counts.writing, oralSessions: counts.oralToday, oralMs: counts.oralMsToday },
    week: { answered: counts.answered, oralSessions: counts.oralWeek, msByDay },
  };
};

import type { OralHistoryEntry, OralSessionChoice } from "@palier/app";
import type { PracticeActivity } from "@palier/engine";

import { sessionEstimate } from "../oral/practice-view";
import { minutesOf } from "./today-view";

/**
 * Oral expression's plan on Today (progress.md D248). No planner holds oral practice, so a day's
 * plan is one spoken session, the goal the hero's oral rail already counts. Pure, so the `.tsx`
 * only renders, and nothing here spends: the plan links into `/practice/oral`, where the mode is
 * chosen and the session priced before it starts (D237).
 */

/**
 * The session today's plan suggests: the kind practised least recently on this device. A kind never
 * practised comes first, and a tie keeps the picker's order. `history` is newest first, as
 * `oralHistory` gives it; a session whose scenario has left the bank names no kind and is passed over.
 * `null` when the bank offers no session.
 */
export const suggestedSession = (
  choices: readonly OralSessionChoice[],
  history: readonly OralHistoryEntry[],
): OralSessionChoice | null => {
  let best: OralSessionChoice | null = null;
  let bestAge = -1;
  for (const choice of choices) {
    const last = history.findIndex((entry) => entry.sessionType === choice.sessionType);
    // Further down a newest-first list is longer ago; never practised is longest of all.
    const age = last === -1 ? Number.POSITIVE_INFINITY : last;
    if (age > bestAge) {
      best = choice;
      bestAge = age;
    }
  }
  return best;
};

/**
 * What the Oral tab's plan shows: today's sessions once one has ended, which meets the day's goal;
 * else the suggested session with its practice-mode estimate (`null` when that mode is unpriced);
 * else nothing to suggest.
 */
export type OralPlan =
  | { readonly status: "done-today"; readonly sessions: number; readonly minutes: number }
  | { readonly status: "suggest"; readonly choice: OralSessionChoice; readonly estimateUsd: number | null }
  | { readonly status: "none" };

export const oralPlan = ({
  today,
  choices,
  history,
  perMinuteUsd,
}: {
  readonly today: Pick<PracticeActivity["today"], "oralSessions" | "oralMs">;
  readonly choices: readonly OralSessionChoice[];
  readonly history: readonly OralHistoryEntry[];
  /** What a minute of practice mode is estimated to cost, the cheaper mode and the picker's default. */
  readonly perMinuteUsd: number | null;
}): OralPlan => {
  if (today.oralSessions > 0) {
    return { status: "done-today", sessions: today.oralSessions, minutes: minutesOf(today.oralMs) };
  }
  const choice = suggestedSession(choices, history);
  if (choice === null) return { status: "none" };
  return { status: "suggest", choice, estimateUsd: sessionEstimate(perMinuteUsd, choice.minutes) };
};

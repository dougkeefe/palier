import type { AttemptMode } from "@palier/domain";
import { ACTIVITY_DAYS, type PracticeActivity, localDay, speakingMs, weekActivity } from "@palier/engine";

import type { AttemptStore, Clock, OralStore } from "../ports/index.js";

/**
 * Today's week (progress.md D219): what was practised today at each skill, against today's plan,
 * and the last `ACTIVITY_DAYS` local days' answers and measured time. The algorithm is the engine's
 * `weekActivity`; this reads the ports and hands it plain values.
 *
 * **What counts is the plan's work**: drill and review answers. A diagnostic places the plan and is
 * not part of it, and an exam is its own sitting. A spoken session counts once it has ended, from
 * the device-local `OralStore`, as the progress summary's oral line does.
 */
export const PLAN_MODES: readonly AttemptMode[] = ["drill", "review"];

export type PracticeActivityRequest = {
  /** The device's IANA time zone: the week is the user's days, not UTC's. */
  readonly timeZone: string;
};

export type PracticeActivityDeps = {
  readonly attempts: AttemptStore;
  readonly oral: OralStore;
  readonly clock: Clock;
};

const DAY_MS = 86_400_000;

export const practiceActivity = async (
  request: PracticeActivityRequest,
  deps: PracticeActivityDeps,
): Promise<PracticeActivity> => {
  const now = deps.clock.now();
  // A day more than the window, so a time zone's offset never cuts its first morning; the
  // engine keeps exactly the window's local days.
  const from = new Date(Date.parse(now) - (ACTIVITY_DAYS + 1) * DAY_MS).toISOString();
  const [attempts, oral] = await Promise.all([deps.attempts.since(from), deps.oral.all()]);
  return weekActivity({
    attempts: attempts.filter((a) => PLAN_MODES.includes(a.mode)),
    oral: oral.flatMap((s) => (s.endedAt === null ? [] : [{ endedAt: s.endedAt, spokenMs: speakingMs(s.turns) }])),
    today: localDay(now, request.timeZone),
    timeZone: request.timeZone,
  });
};

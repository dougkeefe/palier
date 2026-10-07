import { compareBands } from "@palier/domain";
import {
  type LocalDay,
  MILESTONES,
  type MilestoneId,
  type Streak,
  localDay,
  milestonesReached,
  streak,
} from "@palier/engine";

import type { AttemptStore, Clock, ExamRun, ExamRunStore, ItemRepository, OralStore, SessionStore, SettingsStore } from "../ports/index.js";
import { rescoreExam } from "./submit-exam.js";

/**
 * PRD §9's streak and milestones, as Gate K kept them in 1.0 (progress.md D145, D159).
 *
 * **What makes a day count.** PRD §9 says "days with any completed session". Only a drill
 * writes to the `SessionStore`, so the streak reads every record that means a session was done:
 * - a completed drill (`Session.completedAt`);
 * - a submitted mock exam (`ExamRun.submittedAt`);
 * - an ended spoken session (`OralSession.endedAt`), which is on this device only;
 * - a review or diagnostic answer, since neither writes a session record.
 *
 * **Both flags are settings, so they sync** (and export, and wipe) with the rest: "we kept your
 * streak" is said once, and a milestone is shown once, across every paired device.
 */

/** The newest frozen day the user has been told about ("we kept your streak"). A `LocalDay`. */
export const STREAK_FREEZE_NOTICED_KEY = "streakFreezeNoticed";

/** The milestones already shown, as `MilestoneId[]`. */
export const MILESTONES_SHOWN_KEY = "milestonesShown";

export type StreakReportRequest = {
  /** The device's IANA time zone: a streak counts the user's days, not UTC's. */
  readonly timeZone: string;
  readonly freezesPerMonth: number;
};

export type StreakReportDeps = {
  readonly sessions: SessionStore;
  readonly examRuns: ExamRunStore;
  readonly oral: OralStore;
  readonly attempts: AttemptStore;
  readonly settings: SettingsStore;
  readonly clock: Clock;
};

export type StreakReport = Streak & {
  /** Every local day that counted, oldest first, each once: the practice calendar's marks (D219). */
  readonly activeDays: readonly LocalDay[];
  /** The newest frozen day not yet announced, or null when there is nothing to say. */
  readonly freezeToAnnounce: LocalDay | null;
};

const SESSIONLESS_MODES: ReadonlySet<string> = new Set(["review", "diagnostic"]);

const isLocalDay = (value: unknown): value is LocalDay =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** The current streak, and whether a freeze in it still needs to be announced. */
export const streakReport = async (request: StreakReportRequest, deps: StreakReportDeps): Promise<StreakReport> => {
  const [sessions, runs, oral, attempts, noticed] = await Promise.all([
    deps.sessions.all(),
    deps.examRuns.all(),
    deps.oral.all(),
    deps.attempts.all(),
    deps.settings.get<unknown>(STREAK_FREEZE_NOTICED_KEY),
  ]);
  const instants = [
    ...sessions.map((s) => s.completedAt),
    ...runs.map((r) => r.submittedAt),
    ...oral.map((o) => o.endedAt),
    ...attempts.filter((a) => SESSIONLESS_MODES.has(a.mode)).map((a) => a.ts),
  ].filter((at): at is string => at !== null);

  const days = instants.map((at) => localDay(at, request.timeZone));
  const result = streak({
    days,
    today: localDay(deps.clock.now(), request.timeZone),
    freezesPerMonth: request.freezesPerMonth,
  });
  const newest = result.frozen[0] ?? null;
  const announced = isLocalDay(noticed) ? noticed : null;
  const freezeToAnnounce = newest !== null && (announced === null || newest > announced) ? newest : null;
  return { ...result, activeDays: [...new Set(days)].sort(), freezeToAnnounce };
};

/** Record that the freeze on `day` has been announced, so it is said once. */
export const noteStreakFreeze = async (day: LocalDay, deps: Pick<StreakReportDeps, "settings">): Promise<void> => {
  if (!isLocalDay(day)) throw new RangeError(`"${day}" is not a local day.`);
  const noticed = await deps.settings.get<unknown>(STREAK_FREEZE_NOTICED_KEY);
  // Never move the mark back: another device may already have announced a later freeze.
  if (isLocalDay(noticed) && noticed >= day) return;
  await deps.settings.set<LocalDay>(STREAK_FREEZE_NOTICED_KEY, day);
};

export type MilestonesRequest = {
  /** Items answered for the items milestone: a product rule, handed in. */
  readonly itemsAnswered: number;
};

export type MilestonesDeps = {
  readonly items: ItemRepository;
  readonly examRuns: ExamRunStore;
  readonly oral: OralStore;
  readonly attempts: AttemptStore;
  readonly settings: SettingsStore;
};

export type Milestones = {
  readonly reached: readonly MilestoneId[];
  /** Reached and not yet shown, in the order they are shown. */
  readonly unseen: readonly MilestoneId[];
};

const isMilestoneId = (value: unknown): value is MilestoneId => MILESTONES.some((id) => id === value);

const shownOf = async (settings: SettingsStore): Promise<readonly MilestoneId[]> => {
  const value = await settings.get<unknown>(MILESTONES_SHOWN_KEY);
  return Array.isArray(value) ? value.filter(isMilestoneId) : [];
};

/**
 * A submitted run at C or above. E ranks above C, so it counts: "crosses into C" is a floor. A run
 * whose form or items have left the bank cannot be scored and is passed over, as `latestExamResult`
 * does (D89).
 */
const atOrAboveC = async (run: ExamRun, deps: MilestonesDeps): Promise<boolean> => {
  const form = await deps.items.form(run.formId);
  if (form === null) return false;
  if ((await deps.items.byIds(form.itemIds)).length !== form.itemIds.length) return false;
  const { outcome } = await rescoreExam({ runId: run.id }, deps);
  return compareBands(outcome.band, "C") >= 0;
};

/** The milestones reached, and those not yet shown. */
export const milestones = async (request: MilestonesRequest, deps: MilestonesDeps): Promise<Milestones> => {
  const [runs, oral, attempts, shown] = await Promise.all([
    deps.examRuns.all(),
    deps.oral.all(),
    deps.attempts.all(),
    shownOf(deps.settings),
  ]);
  const submitted = runs.filter((run) => run.submittedAt !== null);
  let examsAtOrAboveC = 0;
  for (const run of submitted) if (await atOrAboveC(run, deps)) examsAtOrAboveC += 1;

  const reached = milestonesReached(
    {
      examsSubmitted: submitted.length,
      examsAtOrAboveC,
      oralSessionsEnded: oral.filter((session) => session.endedAt !== null).length,
      itemsAnswered: attempts.length,
    },
    { itemsAnswered: request.itemsAnswered },
  );
  return { reached, unseen: reached.filter((id) => !shown.includes(id)) };
};

/** Record that a milestone's moment has been shown, so it is shown once. */
export const markMilestoneShown = async (id: MilestoneId, deps: Pick<MilestonesDeps, "settings">): Promise<void> => {
  const shown = await shownOf(deps.settings);
  if (shown.includes(id)) return;
  await deps.settings.set<readonly MilestoneId[]>(MILESTONES_SHOWN_KEY, [...shown, id]);
};

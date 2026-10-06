import type { ItemId, Lang, ScoredSkill, SubSkill, TargetBand } from "@palier/domain";
import { type DayPlacement, type DayPlan, planDay } from "@palier/engine";

import type {
  AttemptStore,
  Clock,
  ISO,
  ItemRepository,
  Random,
  ScheduleStore,
} from "../ports/index.js";

/**
 * The first use case (implementation-plan.md §3.2): compose the ports and the
 * engine's daily planner (architecture.md §7.4) into today's plan. It is pure
 * orchestration — no algorithm lives here (that belongs one layer down in
 * `@palier/engine`); the use case only reads the ports and hands the engine plain
 * values.
 *
 * This is where the D32 bridge is first exercised: `Clock` and `Random` are ports
 * here, but `planDay` takes the primitives `now: string` and `random: () => number`,
 * so the use case reads `clock.now()` / `random.next` and passes the values down.
 *
 * The study parameters `planDay` needs and no port cleanly vends (skill, lang,
 * targetBand, sessionSize, testDate) arrive in the request from the caller/
 * composition root, not from `SettingsStore` or the deferred `SessionStore`
 * (progress.md D36). `lastDayCompleted`'s real source is the deferred
 * `SessionStore` (Phase 2), so it is optional and omitted by today's caller.
 */

/**
 * How many recent attempts to fetch for the skill. Generous on purpose: the
 * planner applies its own windows internally — the weakest-sub-skill calculation
 * looks at the last 50 attempts per sub-skill and the recent-exclusion filter at
 * the last 14 days — so the use case supplies a broad recent slice and lets each
 * consumer narrow it. A precise history-window policy is a Phase-2 tuning
 * decision (progress.md D36).
 */
const RECENT_ATTEMPTS_FETCHED = 500;

export type PlanDailySessionRequest = {
  readonly skill: ScoredSkill;
  readonly lang: Lang;
  readonly targetBand: TargetBand;
  /** Total item budget for the day, in item counts rather than minutes (D34). */
  readonly sessionSize: number;
  /** A declared test date (ISO). When set and near, the plan tapers (§7.4). */
  readonly testDate?: ISO;
  /** `false` shortens today's budget. Its source is the deferred SessionStore (Phase 2). */
  readonly lastDayCompleted?: boolean;
  /**
   * The sub-skills the latest oral report's fixes drill (progress.md D124): new items in
   * them are drawn as the weakest are. `StartSession` derives it from the `OralStore`.
   */
  readonly focusSubSkills?: readonly SubSkill[];
  /**
   * Where the latest complete diagnostic run started the plan (ADR 25): new items are drawn at
   * its starting band first. `studyFocus` derives it, with `focusSubSkills`.
   */
  readonly placement?: DayPlacement;
};

export type PlanDailySessionDeps = {
  readonly clock: Clock;
  readonly random: Random;
  readonly items: ItemRepository;
  readonly schedule: ScheduleStore;
  readonly attempts: AttemptStore;
};

export const planDailySession = async (
  request: PlanDailySessionRequest,
  deps: PlanDailySessionDeps,
): Promise<DayPlan> => {
  const now = deps.clock.now();

  // Due reviews: read the schedule, then resolve the entries to items. No point
  // fetching more than a session can hold — the planner caps reviews at 40% of it.
  const dueEntries = await deps.schedule.due(now, request.sessionSize);
  const dueReviews = await deps.items.byIds(dueEntries.map((entry) => entry.itemId));
  const dueIds: readonly ItemId[] = dueReviews.map((item) => item.id);

  // The candidate pool for new and maintenance items. Excluding the due ids keeps
  // the query tidy; the planner guarantees disjoint buckets regardless.
  const pool = await deps.items.query({ skill: request.skill, exclude: dueIds });
  const attempts = await deps.attempts.recent(request.skill, RECENT_ATTEMPTS_FETCHED);

  return planDay(
    {
      skill: request.skill,
      lang: request.lang,
      targetBand: request.targetBand,
      sessionSize: request.sessionSize,
      dueReviews,
      pool,
      attempts,
      // exactOptionalPropertyTypes: spread only when present, never pass an
      // explicit `undefined` (progress.md D14).
      ...(request.testDate !== undefined ? { testDate: request.testDate } : {}),
      ...(request.lastDayCompleted !== undefined
        ? { lastDayCompleted: request.lastDayCompleted }
        : {}),
      ...(request.focusSubSkills !== undefined ? { focusSubSkills: request.focusSubSkills } : {}),
      ...(request.placement !== undefined ? { placement: request.placement } : {}),
    },
    () => deps.random.next(),
    now,
  );
};

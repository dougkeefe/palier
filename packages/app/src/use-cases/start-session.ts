import type { AttemptMode, SessionId } from "@palier/domain";
import type { DayPlan } from "@palier/engine";

import type {
  AttemptStore,
  Clock,
  ItemRepository,
  OralStore,
  Random,
  ScheduleStore,
  Session,
  SessionStore,
} from "../ports/index.js";
import { oralFocusSubSkills } from "./oral-report.js";
import { type PlanDailySessionRequest, planDailySession } from "./plan-daily-session.js";

/**
 * Open the day's session (implementation-plan.md 3.2, `StartSession`): derive
 * whether the previous day was completed, plan the day with that signal, and record
 * an in-progress session the answers will hang off. Pure orchestration — the plan
 * itself is `planDailySession`, one layer of composition down.
 *
 * Two decisions this file carries, both recorded in progress.md D46:
 *
 * - **The session id arrives in the request** (D39). Minting a ULID needs
 *   randomness, and `@palier/domain`'s `ids.ts` is plain that "the adapters mint;
 *   domain only names". The `Random` port is emphatically not the source — it is a
 *   seeded mulberry32 wired in production (3.5). `answerItem` already takes a
 *   `sessionId`, so the loop is forced: `startSession` accepts the id, the caller
 *   threads it through every `answerItem`, and `completeSession` closes it. A future
 *   Web-Crypto `IdGenerator` port mints it.
 * - **`StartSession` composes `planDailySession` and owns `lastDayCompleted`.** That
 *   signal's source is this store (D36 deferred it here), so the derivation lives in
 *   the app layer rather than leaking into the UI request. `planDailySession` stays
 *   usable standalone with the signal omitted (a diagnostic preview), exactly as D36
 *   built it. This **closes D36**: the dangling optional is now produced by
 *   `completeSession` and consumed here, through the port.
 * - **It owns `focusSubSkills` the same way** (progress.md D124, closing D35): the latest
 *   oral report's fixes in the language the day practises (D127), read from the `OralStore`,
 *   bias the day's new items.
 */

export type StartSessionRequest = {
  /** Minted by the caller (D39), and the id every `answerItem` in the session uses. */
  readonly sessionId: SessionId;
  /** The session's kind; its attempts inherit it (architecture.md 9.1's `type`). */
  readonly mode: AttemptMode;
  /**
   * The study parameters the plan needs. `lastDayCompleted` is `Omit`-ted because
   * `StartSession` derives it from `SessionStore.latest()` rather than taking it from
   * the caller — the whole point of composing the planner here (D36, D46). So is
   * `focusSubSkills`, from the `OralStore` (D124).
   */
  readonly plan: Omit<PlanDailySessionRequest, "lastDayCompleted" | "focusSubSkills">;
};

export type StartSessionDeps = {
  readonly clock: Clock;
  readonly sessions: SessionStore;
  /** The collaborators `planDailySession` itself needs, passed straight through. */
  readonly random: Random;
  readonly items: ItemRepository;
  readonly schedule: ScheduleStore;
  readonly attempts: AttemptStore;
  /** Where the latest oral report is, whose fixes bias the day (D124). */
  readonly oral: Pick<OralStore, "all">;
};

export type StartSessionResult = {
  readonly session: Session;
  readonly plan: DayPlan;
};

export const startSession = async (
  request: StartSessionRequest,
  deps: StartSessionDeps,
): Promise<StartSessionResult> => {
  const now = deps.clock.now();

  // Read the previous session BEFORE creating this one (below): once `create` has
  // run, the just-opened session is itself `latest()` — in progress, so
  // `completedAt === null` — and `lastDayCompleted` would read false forever. The
  // order is load-bearing, not stylistic.
  const previous = await deps.sessions.latest();
  const lastDayCompleted =
    previous === null ? undefined : previous.completedAt !== null;

  const scenarioLang = new Map((await deps.items.scenarios()).map((scenario) => [scenario.id, scenario.lang]));
  const focusSubSkills = oralFocusSubSkills(await deps.oral.all(), request.plan.lang, (id) => scenarioLang.get(id) ?? null);

  const plan = await planDailySession(
    {
      ...request.plan,
      // exactOptionalPropertyTypes: spread only when present, never pass an explicit
      // `undefined` (progress.md D14). A first-ever session omits the signal entirely.
      ...(lastDayCompleted !== undefined ? { lastDayCompleted } : {}),
      // No report yet, no focus: the plan is exactly what it was before Slice 3.
      ...(focusSubSkills.length > 0 ? { focusSubSkills } : {}),
    },
    {
      clock: deps.clock,
      random: deps.random,
      items: deps.items,
      schedule: deps.schedule,
      attempts: deps.attempts,
    },
  );

  const session: Session = {
    id: request.sessionId,
    mode: request.mode,
    startedAt: now,
    completedAt: null,
  };

  // Create after a successful plan, so a planning failure leaves no orphan session
  // record. An attempt references its `sessionId` as a branded string rather than a
  // checked row, so there is no orphan-attempt hazard in the other direction.
  await deps.sessions.create(session);

  return { session, plan };
};

import type { Item, Lang, ScoredSkill, TargetBand } from "@palier/domain";
import { selectItems } from "@palier/engine";

import type { AttemptStore, Clock, ItemRepository, Random } from "../ports/index.js";

/**
 * Select a diagnostic item set (implementation-plan.md §3.2, `RunDiagnostic`).
 * A diagnostic samples for *coverage* rather than targeting: the engine's
 * `selectItems(mode: "diagnostic")` drops the working-set restriction and the
 * weakest-sub-skill weighting, so every band is drawn (architecture.md §7.2,
 * progress.md D33). Pure orchestration — the sampling lives in `@palier/engine`;
 * this reads the ports and hands the engine plain values, the D32 bridge again
 * (`clock.now()` / `random.next` down as `now: string` / `() => number`).
 *
 * `RunDiagnostic` decomposes into two thin sibling use cases (progress.md D47),
 * because a diagnostic spans three moments a single call cannot: this selects the
 * set, the caller records each answer through the *existing* `answerItem` with
 * `mode: "diagnostic"`, and `diagnosticResult` reads the run back afterwards (ADR 25).
 */

/**
 * How many recent attempts to fetch, so `selectItems` can apply its 14-day
 * recent-exclusion (§7.2). Generous on the same reasoning as `planDailySession`
 * (D36): the engine narrows internally, so the use case supplies a broad slice.
 */
const RECENT_ATTEMPTS_FETCHED = 500;

export type RunDiagnosticRequest = {
  readonly skill: ScoredSkill;
  readonly lang: Lang;
  /**
   * The user's declared/aspirational target (onboarding collects it, and the
   * readout is read against it). Diagnostic *selection* ignores it — coverage
   * samples every band — but `SelectionCriteria` requires it, so it is carried
   * here rather than invented in code (progress.md D47).
   */
  readonly targetBand: TargetBand;
  /** How many items the diagnostic presents; the caller sizes it from the profile (D34, D47, ADR 25). */
  readonly count: number;
  /**
   * How many of `count` to draw at each band, from the profile's `diagnostic.bandQuota`
   * (ADR 25), so a run is even across bands rather than shaped by the bank. Absent, the
   * draw is uniform, as it was.
   */
  readonly bandQuota?: Readonly<Partial<Record<TargetBand, number>>>;
};

export type RunDiagnosticDeps = {
  readonly clock: Clock;
  readonly random: Random;
  readonly items: ItemRepository;
  readonly attempts: AttemptStore;
};

export type RunDiagnosticResult = {
  readonly items: readonly Item[];
};

export const runDiagnostic = async (
  request: RunDiagnosticRequest,
  deps: RunDiagnosticDeps,
): Promise<RunDiagnosticResult> => {
  const now = deps.clock.now();

  const pool = await deps.items.query({ skill: request.skill });
  const attempts = await deps.attempts.recent(request.skill, RECENT_ATTEMPTS_FETCHED);

  const items = selectItems(
    {
      skill: request.skill,
      lang: request.lang,
      targetBand: request.targetBand,
      count: request.count,
      mode: "diagnostic",
      ...(request.bandQuota === undefined ? {} : { bandQuota: request.bandQuota }),
    },
    pool,
    attempts,
    () => deps.random.next(),
    now,
  );

  return { items };
};

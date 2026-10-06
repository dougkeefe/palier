import type {
  Attempt,
  DiagnosticRules,
  Item,
  ItemId,
  ScoredSkill,
  SessionId,
  SubSkill,
  TargetBand,
} from "@palier/domain";
import { TARGET_BANDS, bandRank } from "@palier/domain";

import type { SubSkillTally } from "./sub-skill-breakdown.js";
import { subSkillBreakdown } from "./sub-skill-breakdown.js";

/**
 * A diagnostic run read back (product-requirements.md 6.2, ADR 25): its score, by band and by
 * sub-skill, the band the plan starts at, and the sub-skills it should favour. Derived from the
 * attempt log every time it is needed, never stored (ADR 16), so a second device that syncs the
 * attempts places the same way.
 *
 * It returns **counts, not estimates**, as `subSkillBreakdown` does: "11 of 15" claims nothing
 * beyond itself. The starting band is a place to start practice, never a band (ADR 7).
 */

/** Answers a sub-skill needs in one run before it can be called a strength or a focus. */
export const DIAGNOSTIC_SUB_SKILL_MIN = 2;

/** One diagnostic sitting: the attempts that share its session, oldest first. */
export type DiagnosticRun = {
  readonly sessionId: SessionId;
  readonly attempts: readonly Attempt[];
  /** The last answer's instant. */
  readonly takenAt: string;
};

export type DiagnosticBandScore = {
  readonly band: TargetBand;
  readonly correct: number;
  readonly attempted: number;
};

export type DiagnosticSummary = {
  readonly skill: ScoredSkill;
  readonly sessionId: SessionId;
  readonly takenAt: string;
  readonly total: { readonly correct: number; readonly attempted: number };
  /** Only the bands the run held, lowest first: a band with no item reads as nothing, not 0. */
  readonly bands: readonly DiagnosticBandScore[];
  /** Weakest first, as the progress screen sorts. */
  readonly subSkills: readonly SubSkillTally[];
  /** Sub-skills answered securely, strongest first. */
  readonly strengths: readonly SubSkill[];
  /** The weakest sub-skills the plan favours afterwards, at most the profile's `focusCount`. */
  readonly focusSubSkills: readonly SubSkill[];
  readonly targetBand: TargetBand;
  /** The band the plan starts at, at or below the target. */
  readonly startBand: TargetBand;
};

/**
 * The newest diagnostic run at `skill` with at least `size` answers (ADR 25). Attempts group by
 * session, since a run mints one; a run left part-way never places. Newest by its last answer,
 * equal instants broken by session id in code-unit order, so two devices agree (D73).
 */
export const latestCompleteRun = (
  skill: ScoredSkill,
  attempts: readonly Attempt[],
  size: number,
): DiagnosticRun | null => {
  const runs = new Map<SessionId, Attempt[]>();
  for (const attempt of attempts) {
    if (attempt.mode !== "diagnostic" || attempt.skill !== skill) continue;
    const run = runs.get(attempt.sessionId) ?? [];
    run.push(attempt);
    runs.set(attempt.sessionId, run);
  }
  let latest: DiagnosticRun | null = null;
  for (const [sessionId, run] of runs) {
    if (new Set(run.map((a) => a.itemId)).size < size) continue;
    const ordered = [...run].sort((a, b) => a.ts.localeCompare(b.ts) || Number(a.id > b.id) - Number(a.id < b.id));
    const takenAt = (ordered[ordered.length - 1] as Attempt).ts;
    const newer =
      latest === null ||
      takenAt > latest.takenAt ||
      (takenAt === latest.takenAt && sessionId > latest.sessionId);
    if (newer) latest = { sessionId, attempts: ordered, takenAt };
  }
  return latest;
};

const accuracy = (score: { readonly correct: number; readonly attempted: number }): number =>
  score.correct / score.attempted;

/**
 * The band the plan starts at: the highest band at or below the target the run answered at
 * `secureAccuracy` or better; failing that, the lowest band the run held at or below the target;
 * failing that, the target itself.
 */
const startBandOf = (
  bands: readonly DiagnosticBandScore[],
  targetBand: TargetBand,
  secureAccuracy: number,
): TargetBand => {
  const reachable = bands.filter((score) => bandRank(score.band) <= bandRank(targetBand));
  const secure = [...reachable].reverse().find((score) => accuracy(score) >= secureAccuracy);
  return secure?.band ?? reachable[0]?.band ?? targetBand;
};

export const summariseDiagnostic = (
  skill: ScoredSkill,
  run: DiagnosticRun,
  items: readonly Item[],
  rules: DiagnosticRules,
  targetBand: TargetBand,
): DiagnosticSummary => {
  const byId = new Map<ItemId, Item>(items.map((item) => [item.id, item]));
  // An answer whose item the bank no longer holds cannot be placed by band or sub-skill, so it
  // counts nowhere, the total included, and every figure on the screen adds up.
  const scored = run.attempts.filter((attempt) => byId.has(attempt.itemId));

  const bands = TARGET_BANDS.flatMap((band): DiagnosticBandScore[] => {
    const at = scored.filter((attempt) => (byId.get(attempt.itemId) as Item).targetBand === band);
    if (at.length === 0) return [];
    return [{ band, attempted: at.length, correct: at.filter((attempt) => attempt.correct).length }];
  });

  const subSkills = subSkillBreakdown(skill, scored, items);
  const evidenced = subSkills.filter((tally) => tally.attempted >= DIAGNOSTIC_SUB_SKILL_MIN);
  const focusSubSkills = evidenced
    .filter((tally) => tally.correct < tally.attempted)
    .slice(0, rules.focusCount)
    .map((tally) => tally.subSkill);
  const strengths = [...evidenced]
    .reverse()
    .filter((tally) => accuracy(tally) >= rules.secureAccuracy && !focusSubSkills.includes(tally.subSkill))
    .map((tally) => tally.subSkill);

  return {
    skill,
    sessionId: run.sessionId,
    takenAt: run.takenAt,
    total: { attempted: scored.length, correct: scored.filter((attempt) => attempt.correct).length },
    bands,
    subSkills,
    strengths,
    focusSubSkills,
    targetBand,
    startBand: startBandOf(bands, targetBand, rules.secureAccuracy),
  };
};

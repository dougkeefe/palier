import { TARGET_BANDS, bandRank, type Band, type TargetBand } from "@palier/domain";

/**
 * Where a skill stands against its target, from the result the user declared (progress.md D259):
 * - `unknown`: nothing declared, so the plan is as it always was;
 * - `exempt`: held at the profile's exempt band, so the skill leaves the plan;
 * - `held`: at or above the target, below the exempt band, so the plan only keeps it sharp;
 * - `working`: below the target, so the plan can start at the declared level.
 *
 * A declaration is the user's word, never an estimate (ADR 7): it decides what is practised, and no
 * screen shows it as a band Palier measured.
 */
export type SkillStanding = "unknown" | "exempt" | "held" | "working";

export type StandingInput = {
  readonly current: Band | null;
  readonly target: TargetBand;
  /** The profile's `exemptBand` (ADR 9), never a literal. */
  readonly exemptBand: Band;
};

export const skillStanding = ({ current, target, exemptBand }: StandingInput): SkillStanding => {
  if (current === null) return "unknown";
  if (current === exemptBand) return "exempt";
  return bandRank(current) >= bandRank(target) ? "held" : "working";
};

/**
 * The band a declared result starts the plan at, as a diagnostic's placement would (ADR 25): the
 * declared band, raised to the lowest band an item can carry (X starts at A). Null when there is
 * nothing to place: no declaration, or a start that is not below the target.
 */
export const declaredStart = (current: Band | null, target: TargetBand): TargetBand | null => {
  if (current === null) return null;
  const start = TARGET_BANDS.find((band) => bandRank(band) >= bandRank(current));
  return start !== undefined && bandRank(start) < bandRank(target) ? start : null;
};

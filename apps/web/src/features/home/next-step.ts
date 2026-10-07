import type { TargetBand } from "@palier/domain";
import type { SkillTrend } from "@palier/engine";

/**
 * The one step Today puts at the head of the plan, at the skill being looked at (progress.md
 * D214). The order is the one a candidate's preparation runs in:
 *
 * 1. **The diagnostic**, until a complete run places the plan (ADR 25).
 * 2. **The diagnostic again**, once its `retakeDays` have passed (PRD §6.2's monthly offer).
 * 3. **A mock exam**, once practice at the target level is measurable: the trend has an estimate
 *    at the target band, so `MIN_EVIDENCE` answers there. Or while the planner advises one before
 *    the test date (§7.4's taper). Once per diagnostic: an exam at this skill since the run means
 *    it has been taken, and the result is on the card.
 * 4. **The plan itself**, otherwise: no banner, the rows and the start button are the step.
 *
 * No number is typed here: the threshold is the trend's, the taper the planner's, the retake the
 * profile's.
 */
export type NextStep = "diagnostic" | "retake-diagnostic" | "mock-exam" | "plan";

export type NextStepInput = {
  /** The latest complete diagnostic at this skill, or `null` with none. */
  readonly diagnostic: { readonly takenAt: string; readonly retakeDue: boolean } | null;
  readonly trend: SkillTrend;
  readonly targetBand: TargetBand;
  /** The planner's `DayPlan.mockExamAdvised`: the test is near, but not tomorrow. */
  readonly mockExamAdvised: boolean;
  /** When the latest mock exam at this skill was submitted, or `null` with none. */
  readonly lastExamAt: string | null;
};

/** Whether the practice trend has an estimate at the target band: enough answers there to measure. */
export const practisedAtTarget = (trend: SkillTrend, targetBand: TargetBand): boolean =>
  trend.byBand[targetBand].status === "estimated";

export const nextStep = (input: NextStepInput): NextStep => {
  const { diagnostic } = input;
  if (diagnostic === null) return "diagnostic";
  if (diagnostic.retakeDue) return "retake-diagnostic";
  const examSinceDiagnostic = input.lastExamAt !== null && input.lastExamAt >= diagnostic.takenAt;
  if (!examSinceDiagnostic && (input.mockExamAdvised || practisedAtTarget(input.trend, input.targetBand))) {
    return "mock-exam";
  }
  return "plan";
};

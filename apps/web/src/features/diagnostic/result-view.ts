import type { DiagnosticResult } from "@palier/app";
import type { DiagnosticInterpretation, Lang, ScoredSkill, SubSkill, TargetBand } from "@palier/domain";
import { SCORED_SKILLS, bandRank } from "@palier/domain";
import type { DiagnosticSummary } from "@palier/engine";

import { checkFailure } from "../key/key-view";

/**
 * The diagnostic result's decisions (product-requirements.md §6.2, ADR 25), kept out of the
 * `.tsx` so each is tested. The score is shown plainly, right and wrong, and never a question;
 * the placement is a place for practice to start, never a band (ADR 7).
 */

/** The score as the screen says it: right, wrong, and out of how many. */
export const scoreOf = (summary: DiagnosticSummary): { correct: number; wrong: number; attempted: number } => ({
  correct: summary.total.correct,
  wrong: summary.total.attempted - summary.total.correct,
  attempted: summary.total.attempted,
});

/**
 * The placement sentence's message key and values: "starts at B and works up to C" when the plan
 * starts below the target, "starts at C, your target" when it starts there.
 */
export const placementOf = (
  summary: Pick<DiagnosticSummary, "startBand" | "targetBand">,
): { readonly key: "placementBelow" | "placementAt"; readonly values: { start: TargetBand; target: TargetBand } } => ({
  key: bandRank(summary.startBand) < bandRank(summary.targetBand) ? "placementBelow" : "placementAt",
  values: { start: summary.startBand, target: summary.targetBand },
});

/** "agreement and prepositions", in the interface's language, from sub-skill names already translated. */
export const listOf = (names: readonly string[], locale: string): string =>
  new Intl.ListFormat(locale === "fr" ? "fr-CA" : "en-CA", { style: "long", type: "conjunction" }).format(names);

/** The sub-skills the plan now favours, translated and joined, or `null` when the run left none. */
export const focusText = (
  focus: readonly SubSkill[],
  name: (subSkill: SubSkill) => string,
  locale: string,
): string | null => (focus.length === 0 ? null : listOf(focus.map(name), locale));

/** A name that opens a line, with its first letter capitalised in the interface's language ("Agreement: 1 of 4"). */
export const atLineStart = (name: string, locale: string): string =>
  name.charAt(0).toLocaleUpperCase(locale === "fr" ? "fr-CA" : "en-CA") + name.slice(1);

/** How many strengths the screen names: the interpretation's three, or the run's own when it has none yet. */
export const STRENGTHS_SHOWN = 3;

/** Why an interpretation could not be had: the key screen's names for a failed call, or no run to interpret. */
export type InterpretationFailure =
  | "invalid-key"
  | "out-of-credit"
  | "timeout"
  | "unreachable"
  | "unexpected"
  | "no-key"
  | "failed"
  | "no-run";

/**
 * The thrown error in plain words (§14). The names are compared, not the classes, because the
 * error crossed the lazily loaded container's chunk boundary (as `checkFailure` does).
 */
export const interpretationFailure = (error: unknown): InterpretationFailure => {
  if (error instanceof Error && error.name === "NoDiagnosticRunError") return "no-run";
  const result = checkFailure(error);
  return result.kind === "valid" ? "failed" : result.kind;
};

/** The message key for a failure, in the `diagnostic` namespace. */
export const failureMessage = (failure: InterpretationFailure): string => `fail_${failure}`;

/** Whether asking again could mend it: not without a key, and not without a run. */
export const canRetry = (failure: InterpretationFailure): boolean => failure !== "no-run" && failure !== "no-key";

/** Where the written interpretation stands on the result screen. */
export type InterpretationState =
  | { readonly kind: "idle" }
  | { readonly kind: "asking" }
  | { readonly kind: "ready"; readonly interpretation: DiagnosticInterpretation }
  | { readonly kind: "failed"; readonly failure: InterpretationFailure }
  /**
   * Offered, not asked for: a run opened anywhere but its own end, whose result no one has paid for
   * on this device, or whose kept result is in the other language (`existing`, shown meanwhile).
   */
  | { readonly kind: "offer"; readonly existing: DiagnosticInterpretation | null }
  /** No key on this device, so none can be written; the score and the placement stand without it. */
  | { readonly kind: "no-key" };

/**
 * Where the interpretation starts once the result has loaded (ADR 25):
 * - kept on this device in the screen's language: ready;
 * - no key: whatever is kept, in either language, or nothing to ask for;
 * - at the run's own end (`askNow`), with none kept: asked for at once, since starting the diagnostic was the
 *   consent to pay for it;
 * - anywhere else, or kept in the other language: offered with its cost, never spent on opening.
 */
export const initialInterpretation = (
  result: DiagnosticResult,
  keyHeld: boolean,
  askNow: boolean,
  lang: Lang,
): InterpretationState => {
  const existing = result.interpretation;
  if (existing !== null && result.interpretationLang === lang) return { kind: "ready", interpretation: existing };
  if (!keyHeld) return existing === null ? { kind: "no-key" } : { kind: "ready", interpretation: existing };
  if (askNow && existing === null) return { kind: "asking" };
  return { kind: "offer", existing };
};

/** Today's card quotes the interpretation only in the screen's own language. */
export const interpretationFor = (result: DiagnosticResult, lang: Lang): DiagnosticInterpretation | null =>
  result.interpretationLang === lang ? result.interpretation : null;

/**
 * Whether a drawn run is short of the profile's size: the 14-day hold on recent items, or a thin bank,
 * left too few. A short run could never place (`latestCompleteRun`), so it is not started.
 */
export const isShortRun = (drawn: number, size: number): boolean => drawn < size;

/** The skill named in `?skill=`, or reading when it names none. */
export const skillFromQuery = (value: string | null): ScoredSkill =>
  (SCORED_SKILLS as readonly string[]).includes(value ?? "") ? (value as ScoredSkill) : "reading";

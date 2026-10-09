import type { FeatureCost } from "@palier/app";
import type { AiFeature } from "@palier/domain";

import type { Placement } from "./onboarding";

/**
 * Onboarding's key step (progress.md D220): what a key costs, as a short list of the features a new
 * user meets first, each a typical use priced from `pricing.json` through `featureCosts`, so no figure
 * is typed here. The full table stays on `/settings/key`.
 */
export const KEY_STEP_FEATURES = [
  "diagnostic-interpretation",
  "writing-feedback",
  "item-generation",
  "oral-practice",
  "oral-studio",
] as const satisfies readonly AiFeature[];

/** The features whose typical use in `pricing.json` is one minute of a session (D103, D117, D167). */
const PER_MINUTE: ReadonlySet<AiFeature> = new Set<AiFeature>(["oral-practice", "oral-studio"]);

export type KeyStepCost = {
  readonly feature: AiFeature;
  readonly estimateUsd: number;
  /** Shown as "a minute", since the figure is one minute of a spoken session. */
  readonly perMinute: boolean;
};

/** The step's list, in {@link KEY_STEP_FEATURES} order. An unpriced feature is left out, never shown as free. */
export const keyStepCosts = (costs: readonly FeatureCost[]): readonly KeyStepCost[] =>
  KEY_STEP_FEATURES.flatMap((feature) => {
    const estimateUsd = costs.find((cost) => cost.feature === feature)?.estimateUsd ?? null;
    return estimateUsd === null ? [] : [{ feature, estimateUsd, perMinute: PER_MINUTE.has(feature) }];
  });

/**
 * The step's way on (D220), a message key in `start`: with a key saved, the wizard's own finish, or the
 * diagnostic's on that path; with none, a quiet skip that says where it goes, since the key is
 * recommended but never required. On the diagnostic path that is today, whose next step is the
 * diagnostic (`destinationFor`), so the button says the diagnostic waits there.
 */
export const keyStepFinish = ({
  held,
  placement,
}: {
  readonly held: boolean;
  readonly placement: Placement;
}): {
  readonly label: "finish" | "keyFinishDiagnostic" | "keySkip" | "keySkipDiagnostic";
  readonly primary: boolean;
} => {
  if (!held) return { label: placement === "diagnostic" ? "keySkipDiagnostic" : "keySkip", primary: false };
  return { label: placement === "diagnostic" ? "keyFinishDiagnostic" : "finish", primary: true };
};

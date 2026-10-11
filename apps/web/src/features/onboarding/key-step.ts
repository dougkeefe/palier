import type { FeatureCost } from "@palier/app";
import type { AiFeature } from "@palier/domain";

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
 * The step's way on (D220, D224), a message key in `start`. Both lead to the placement, the last step:
 * with a key saved, the wizard's own "Continue"; with none, a quiet skip that names itself, since the
 * key is recommended but never required.
 */
export const keyStepFinish = (held: boolean): { readonly label: "next" | "keySkip"; readonly primary: boolean } =>
  held ? { label: "next", primary: true } : { label: "keySkip", primary: false };

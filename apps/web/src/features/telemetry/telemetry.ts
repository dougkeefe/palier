import type { TelemetryConsent } from "@palier/app";
import type { TrendEvidence } from "@palier/engine";

/**
 * The view rules for opt-in telemetry (product-requirements.md §15, progress.md D92).
 *
 * **The prompt** is made "honestly on the results screen after the first mock exam":
 * shown while this device has not been asked, and never again once it has, whichever
 * way it was answered. Saying no and dismissing are one answer, because both leave
 * sharing off.
 */
export type PromptStep = "asking" | "saving" | "shared" | "declined" | "failed";

/** Whether the results screen asks, given this device's consent when it loaded. */
export const promptShown = (consent: TelemetryConsent): boolean => consent === "unasked";

/** Where the prompt goes once a choice has been saved. */
export const stepAfter = (choice: "on" | "off"): PromptStep => (choice === "on" ? "shared" : "declined");

/**
 * **The readiness disclosure** (§13.0: "the estimate discloses what it rests on"): how
 * many of the items behind the practice trend have trusted response statistics, and
 * the profile's minimum that "trusted" means. Null when no item is behind it, since
 * there is then no trend to qualify.
 */
export type EvidenceLine = { readonly items: number; readonly trusted: number; readonly minimum: number };

export const evidenceLine = (evidence: TrendEvidence, minimum: number): EvidenceLine | null =>
  evidence.items === 0 ? null : { items: evidence.items, trusted: evidence.trusted, minimum };

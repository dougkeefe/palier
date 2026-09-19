import type { ScenarioId } from "./ids.js";
import type { Lang } from "./skills.js";
import type { Topic } from "./topics.js";

export const ORAL_SESSION_TYPES = [
  "warmup",
  "work",
  "opinion",
  "situation",
  "full",
] as const;
export type OralSessionType = (typeof ORAL_SESSION_TYPES)[number];

/**
 * A phase plan the client drives, not the model (architecture.md 8.5 step 5):
 * "Phase transitions are driven by the client... This keeps sessions
 * predictable and reproducible, which matters for a practice tool."
 */
export type OralPhase = {
  readonly name: string;
  readonly minutes: number;
  /** What this phase is probing. */
  readonly intent: string;
  readonly seedQuestions: readonly string[];
  /** Harder follow-ups if the candidate is coping. */
  readonly escalation: readonly string[];
  /** Simpler reframes if they are struggling. */
  readonly deescalation: readonly string[];
};

export type OralScenario = {
  readonly id: ScenarioId;
  readonly lang: Lang;
  readonly sessionType: OralSessionType;
  /** Oral scenarios are authored at B and C only (architecture.md 5.3). */
  readonly targetBand: "B" | "C";
  readonly phases: readonly OralPhase[];
  readonly topic: Topic;
};

/**
 * The vocabulary of a spoken session, shared by the engine's session machine, the
 * app's `OralStore` and `OralTransport`, and Phase 5 Slice 3's `assessOral` DTOs
 * (progress.md D116). Types only, and one schema in `schemas/oral.ts`.
 */

/**
 * Why a session ended. **Every end carries one** (Phase 5 exit criterion 5).
 * - `completed`: the scenario's last phase ran out of minutes.
 * - `ended-by-user`: the candidate closed it early.
 * - `transport-closed` / `transport-failed`: the connection ended it, cleanly or not.
 * - `interrupted`: the page went away mid-session, found on the next start. A session
 *   cannot resume, because an examiner's conversation cannot be replayed.
 *
 * There is no time-cap reason: a session completes at its scenario's total, and
 * architecture.md §8.6's 25-minute disconnect is a studio-mode guard (Phase 6).
 */
export const ORAL_END_REASONS = [
  "completed",
  "ended-by-user",
  "transport-closed",
  "transport-failed",
  "interrupted",
] as const;
export type OralEndReason = (typeof ORAL_END_REASONS)[number];

export const ORAL_SPEAKERS = ["examiner", "candidate"] as const;
export type OralSpeaker = (typeof ORAL_SPEAKERS)[number];

/**
 * Which way the examiner should move within a phase: to the phase's harder
 * follow-ups when the candidate is coping, or its simpler reframes when they are
 * struggling (architecture.md §8.5 step 4, `OralPhase.escalation`/`deescalation`).
 */
export type OralDirection = "escalate" | "deescalate";

/** A phase's register: its seed questions, or one of the two directions. */
export type OralRegister = "baseline" | OralDirection;

/**
 * How a candidate's answer arrived (progress.md D122): spoken and transcribed, or
 * typed. The fluency metrics count only spoken answers, because a typed answer has
 * no speech to time and its `startMs` is when the question was shown, not when the
 * candidate began (D118).
 */
export const ORAL_INPUTS = ["voice", "typed"] as const;
export type OralInput = (typeof ORAL_INPUTS)[number];

/**
 * One utterance, whole. Times are milliseconds since the session opened, the shape
 * GPT-Live's transcript deltas carry (`start_ms`/`end_ms`, progress.md D113), so a
 * turn-based and a full-duplex transport write the same record. Turns may overlap
 * in a full-duplex session. `phase` indexes the scenario's `phases`, and is stamped
 * by the client, which drives the phases (architecture.md §8.5 step 5). `input` is
 * set on a candidate's turn by the transport that took it; a turn stored before
 * Slice 3 has none, and counts as untimed.
 */
export type OralTurn = {
  readonly speaker: OralSpeaker;
  readonly text: string;
  readonly phase: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly input?: OralInput | undefined;
};

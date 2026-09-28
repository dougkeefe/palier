import type { OralDirection, OralInput, OralRegister, OralScenario, OralSpeaker } from "@palier/domain";

/**
 * What a transport tells the session (progress.md D116), pushed as it happens:
 *
 * - `turn`: one utterance, **whole**, with its times in milliseconds since `open`
 *   resolved. A turn-based transport emits the examiner's question and then the
 *   candidate's transcribed answer; a full-duplex one assembles its transcript deltas
 *   (GPT-Live's `start_ms`/`end_ms`, D113) into completed turns, which may overlap.
 * - `difficulty`: the examiner judged the candidate to be coping or struggling
 *   (architecture.md §8.5's `flag_difficulty`), so the client can adapt the phase.
 * - `closed`: the connection is over, cleanly or not. **Exactly once, and last.**
 */
export type OralTransportEvent =
  | {
      readonly kind: "turn";
      readonly speaker: OralSpeaker;
      readonly text: string;
      readonly startMs: number;
      readonly endMs: number;
      /** How a candidate's answer arrived (D122), when the transport knows; stored with the turn. */
      readonly input?: OralInput | undefined;
    }
  | { readonly kind: "difficulty"; readonly direction: OralDirection }
  | { readonly kind: "closed"; readonly failed: boolean };

/**
 * A directive from the client, which drives the phases (architecture.md §8.5 step 5):
 * enter phase `phase` of the scenario the transport was opened with, or move within it
 * to its escalation or de-escalation questions.
 */
export type OralDirective = {
  readonly phase: number;
  readonly register: OralRegister;
};

/**
 * The examiner's side of a spoken session (progress.md D116), a port §3.3 did not
 * name. One shape for both transports: Phase 5's turn-based one and Phase 6's
 * full-duplex one, so Phase 6 adds a transport and inherits a tested session.
 *
 * **Push, not pull.** A full-duplex client must send each phase boundary on time
 * even while the candidate is silent, so the session is driven by the events a
 * transport pushes and the ticks the screen's timer sends, never by waiting on the
 * next utterance.
 *
 * - `open` connects for one scenario and hands the transport its one listener, so no
 *   event can be emitted before someone is listening.
 * - `direct` rejects before `open`, and is a no-op once the transport has closed.
 * - `close` is idempotent, and resolves once the single `closed` has been delivered.
 *   A turn already in flight is delivered before it.
 */
export type OralTransport = {
  open: (req: { readonly scenario: OralScenario }, sink: (event: OralTransportEvent) => void) => Promise<void>;
  direct: (directive: OralDirective) => Promise<void>;
  close: () => Promise<void>;
};

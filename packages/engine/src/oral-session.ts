import type { OralDirection, OralEndReason, OralRegister } from "@palier/domain";

/**
 * The spoken session's state machine (architecture.md §8.5, progress.md D116), pure:
 * the scenario's phase minutes arrive as data, and time arrives on each event as
 * milliseconds since the session opened (D32). It knows nothing of a transport; it
 * says what to do, as commands, and the driver in `@palier/app` does it.
 *
 * - **The client drives the phases** (§8.5 step 5). A phase ends when its minutes
 *   run out, measured from the session's start, so phase `p` covers
 *   `[boundary(p − 1), boundary(p))`, where a boundary is the running total of minutes.
 * - **No phase is skipped or repeated.** An event that crosses several boundaries
 *   enters each phase in turn. At or past the last boundary the session is
 *   `completed`, and every phase has been entered.
 * - **Difficulty adapts the current phase**, to its escalation or de-escalation
 *   questions. A phase always starts at its baseline.
 * - **Studio mode's cap ends a session `time-cap`** (architecture.md §8.6, progress.md
 *   D166), checked before the scenario's length, so a cap shorter than a scenario wins.
 *   The cap is a spend guard from `pricing.json`, handed in as data; practice mode has none.
 * - **Every end carries a reason**, and once ended the machine says nothing more.
 * - **Time never runs backwards.** An event stamped earlier than one already seen is
 *   taken as happening at the later time.
 */

export type OralSessionState = {
  /** The running total of the phases' minutes, in ms; the last is the session's length. */
  readonly boundariesMs: readonly number[];
  /** The session's length in ms: the last boundary. */
  readonly lengthMs: number;
  /** Studio mode's hard cap in ms since the session opened, or `null` for none (D166). */
  readonly capMs: number | null;
  readonly phase: number;
  readonly register: OralRegister;
  /** The latest time seen, in ms since the session opened. */
  readonly lastAtMs: number;
  readonly ended: OralEndReason | null;
};

export type OralSessionEvent =
  | { readonly kind: "tick"; readonly atMs: number }
  | { readonly kind: "difficulty"; readonly direction: OralDirection; readonly atMs: number }
  | { readonly kind: "end-requested"; readonly atMs: number }
  | { readonly kind: "transport-closed"; readonly failed: boolean; readonly atMs: number };

export type OralSessionCommand =
  | { readonly kind: "enter-phase"; readonly phase: number }
  | { readonly kind: "adapt"; readonly phase: number; readonly register: OralDirection }
  | { readonly kind: "close"; readonly reason: OralEndReason };

export type OralStep = {
  readonly state: OralSessionState;
  readonly commands: readonly OralSessionCommand[];
};

const MINUTE_MS = 60_000;

/**
 * Open a session over its phases' minutes, entering the first phase. Rounded once
 * per boundary, from the running total, so fractional minutes never drift. `capMs`
 * is studio mode's hard cap (D166).
 */
export const startOralSession = (
  phases: readonly { readonly minutes: number }[],
  options: { readonly capMs?: number } = {},
): OralStep => {
  if (phases.length === 0) throw new RangeError("A session needs at least one phase.");
  const capMs = options.capMs ?? null;
  if (capMs !== null && (!Number.isFinite(capMs) || capMs <= 0)) {
    throw new RangeError(`A session's cap must be a positive number of milliseconds, not ${String(capMs)}.`);
  }
  let total = 0;
  const boundariesMs = phases.map(({ minutes }) => {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new RangeError(`A phase must last a positive number of minutes, not ${String(minutes)}.`);
    }
    total += minutes;
    return Math.round(total * MINUTE_MS);
  });
  return {
    state: {
      boundariesMs,
      lengthMs: Math.round(total * MINUTE_MS),
      capMs,
      phase: 0,
      register: "baseline",
      lastAtMs: 0,
      ended: null,
    },
    commands: [{ kind: "enter-phase", phase: 0 }],
  };
};

/** The phase that holds `atMs`: how many boundaries it has passed, capped at the last. */
const phaseAt = (boundariesMs: readonly number[], atMs: number): number =>
  Math.min(
    boundariesMs.filter((boundary) => boundary <= atMs).length,
    boundariesMs.length - 1,
  );

const endReasonFor = (event: OralSessionEvent): OralEndReason | null => {
  if (event.kind === "end-requested") return "ended-by-user";
  if (event.kind === "transport-closed") return event.failed ? "transport-failed" : "transport-closed";
  return null;
};

export const stepOralSession = (state: OralSessionState, event: OralSessionEvent): OralStep => {
  if (!Number.isFinite(event.atMs)) throw new RangeError(`"${String(event.atMs)}" is not a time in the session.`);
  if (state.ended !== null) return { state, commands: [] };

  const atMs = Math.max(state.lastAtMs, event.atMs);
  const commands: OralSessionCommand[] = [];
  const target = phaseAt(state.boundariesMs, atMs);
  for (let phase = state.phase + 1; phase <= target; phase++) commands.push({ kind: "enter-phase", phase });
  const moved = target !== state.phase;
  let next: OralSessionState = {
    ...state,
    phase: target,
    register: moved ? "baseline" : state.register,
    lastAtMs: atMs,
  };

  const reason =
    state.capMs !== null && atMs >= state.capMs ? "time-cap" : atMs >= state.lengthMs ? "completed" : endReasonFor(event);
  if (reason !== null) {
    commands.push({ kind: "close", reason });
    return { state: { ...next, ended: reason }, commands };
  }

  if (event.kind === "difficulty" && next.register !== event.direction) {
    commands.push({ kind: "adapt", phase: next.phase, register: event.direction });
    next = { ...next, register: event.direction };
  }
  return { state: next, commands };
};

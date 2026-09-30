import type { OralScenario, ScenarioId, SessionId } from "@palier/domain";
import type { OralSessionCommand, OralSessionEvent, OralSessionState } from "@palier/engine";
import { startOralSession, stepOralSession } from "@palier/engine";

import type {
  Clock,
  ItemRepository,
  OralLiveness,
  OralSession,
  OralStore,
  OralTransport,
  OralTransportEvent,
} from "../ports/index.js";
import { StorageQuotaError } from "../ports/index.js";

/**
 * How many sessions' recordings a device keeps (architecture.md §9.1: "keep the last 10
 * oral sessions' audio, keep transcripts forever"). Storage policy, not a §5 exam rule,
 * so it is a constant here and not profile data (ADR 9), as `GENERATED_SET_SIZE` is.
 */
export const AUDIO_KEEP_SESSIONS = 10;

/** When the stored recordings warn that they are getting large (§9.1: "warn at 200 MB"). */
export const AUDIO_WARNING_BYTES = 200 * 1024 * 1024;

/** The scenario id did not resolve in the bank. */
export class UnknownScenarioError extends Error {
  constructor(readonly scenarioId: ScenarioId) {
    super(`No oral scenario with id ${scenarioId} is in the bank, so the session cannot run on it.`);
    this.name = "UnknownScenarioError";
  }
}

/** A session was started under an id already stored: a session runs once. */
export class OralSessionExistsError extends Error {
  constructor(readonly sessionId: SessionId) {
    super(`An oral session with id ${sessionId} already exists; a session cannot be started twice.`);
    this.name = "OralSessionExistsError";
  }
}

export type OralSessionRunDeps = {
  readonly clock: Clock;
  readonly items: ItemRepository;
  readonly oral: OralStore;
  readonly transport: OralTransport;
  readonly liveness: OralLiveness;
};

export type CloseAbandonedSessionsDeps = {
  readonly clock: Clock;
  readonly oral: OralStore;
  readonly liveness: OralLiveness;
};

/**
 * Stamp `interrupted` on every session left running that no page on this device is running
 * now (progress.md D144), and answer which it closed. A session cannot resume (D116), so one
 * whose page went away is over; closed, it keeps its turns, joins the list of past sessions
 * and can be reported on. One another tab holds is left alone, since that tab would write it
 * back as running. Nothing is asked of `liveness` when nothing is open.
 */
export const closeAbandonedSessions = async (deps: CloseAbandonedSessionsDeps): Promise<readonly SessionId[]> => {
  const open = (await deps.oral.all()).filter((session) => session.endedAt === null);
  if (open.length === 0) return [];
  const live = await deps.liveness.live();
  const endedAt = deps.clock.now();
  const closed: SessionId[] = [];
  for (const session of open) {
    if (live.has(session.id)) continue;
    // Read again: its page may have ended it, and let go, since the list was read. Stamping the old
    // copy would lose its last turns and call a completed session interrupted.
    const current = await deps.oral.get(session.id);
    if (current === null || current.endedAt !== null) continue;
    await deps.oral.put({ ...current, endedAt, endReason: "interrupted" });
    closed.push(session.id);
  }
  return closed;
};

export type StartOralSessionRequest = {
  /** Minted by the caller, as an exam run's is (D39). */
  readonly sessionId: SessionId;
  readonly scenarioId: ScenarioId;
  /** Studio mode's hard cap, in ms since the session started (D166); absent for practice mode. */
  readonly capMs?: number;
};

/** A running session: the screen's timer ticks it, the end control ends it. */
export type OralSessionRun = {
  readonly scenario: OralScenario;
  /** Let the session look at the clock: advance a phase, or complete, when its minutes are up. */
  readonly tick: () => Promise<void>;
  /** The candidate ends the session early. */
  readonly endByUser: () => Promise<void>;
  /** Settles once the transport has closed, with the stored, ended session. */
  readonly ended: Promise<OralSession>;
};

/**
 * Run one spoken session over a transport (progress.md D116): the engine's machine
 * decides, this carries it out and keeps the record.
 *
 * - **Earlier sessions left running are stamped `interrupted`** first, unless a page on
 *   this device is running them (`closeAbandonedSessions`, D144). A session cannot resume,
 *   so one whose page went away is over, and it keeps its turns.
 * - **Time is elapsed wall-clock time from the start**, read from the `Clock` at each
 *   event and tick. A session never resumes, so, unlike an exam run, no elapsed time
 *   needs carrying across a reload.
 * - **One queue carries everything**, the transport's events, the ticks and the end
 *   control, so the machine and the store see them in the order they happened.
 * - **Each turn is saved as it arrives**, stamped with the phase the machine is in once
 *   it has caught up with the clock, so a disconnect keeps the transcript. A studio
 *   examiner's note is kept the same way (D168).
 * - **Studio mode's cap** (`capMs`, D166) is handed to the machine, which ends the session
 *   `time-cap` at it.
 * - **Turns are kept until the transport says `closed`**, even after the machine has
 *   asked it to close, so an answer still in flight is not lost. Only then are the end
 *   and its reason written, and `ended` settled.
 * - A transport that fails to open ends the session as `transport-failed`, and rethrows.
 */
export const startOralSessionRun = async (
  request: StartOralSessionRequest,
  deps: OralSessionRunDeps,
): Promise<OralSessionRun> => {
  const scenario = await deps.items.scenario(request.scenarioId);
  if (scenario === null) throw new UnknownScenarioError(request.scenarioId);
  if ((await deps.oral.get(request.sessionId)) !== null) throw new OralSessionExistsError(request.sessionId);

  const startedAt = deps.clock.now();
  await closeAbandonedSessions(deps);

  const start = startOralSession(scenario.phases, request.capMs === undefined ? {} : { capMs: request.capMs });
  let machine: OralSessionState = start.state;
  let session: OralSession = {
    id: request.sessionId,
    scenarioId: scenario.id,
    startedAt,
    endedAt: null,
    endReason: null,
    turns: [],
    assessment: null,
  };
  await deps.oral.put(session);

  // The executor runs synchronously, so both are assigned before anything can call them.
  let settle!: (ended: OralSession) => void;
  let fail!: (error: unknown) => void;
  const ended = new Promise<OralSession>((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });
  let closed = false;

  const elapsedMs = (): number => Math.max(0, Date.parse(deps.clock.now()) - Date.parse(startedAt));

  const carryOut = async (commands: readonly OralSessionCommand[]): Promise<void> => {
    for (const command of commands) {
      if (command.kind === "enter-phase") await deps.transport.direct({ phase: command.phase, register: "baseline" });
      else if (command.kind === "adapt") await deps.transport.direct({ phase: command.phase, register: command.register });
      else await deps.transport.close();
    }
  };

  const step = async (event: OralSessionEvent): Promise<void> => {
    const next = stepOralSession(machine, event);
    machine = next.state;
    await carryOut(next.commands);
  };

  const handle = async (event: OralTransportEvent): Promise<void> => {
    if (closed) return;
    const atMs = elapsedMs();
    if (event.kind === "difficulty") return step({ kind: "difficulty", direction: event.direction, atMs });
    if (event.kind === "turn") {
      await step({ kind: "tick", atMs });
      const { speaker, text, startMs, endMs, input, pauseMs } = event;
      const turn = {
        speaker,
        text,
        phase: machine.phase,
        startMs,
        endMs,
        ...(input === undefined ? {} : { input }),
        ...(pauseMs === undefined ? {} : { pauseMs }),
      };
      session = { ...session, turns: [...session.turns, turn] };
      return deps.oral.put(session);
    }
    if (event.kind === "note") {
      await step({ kind: "tick", atMs });
      const { criterion, evidence, severity } = event;
      const note = { criterion, evidence, severity, phase: machine.phase };
      session = { ...session, notes: [...(session.notes ?? []), note] };
      return deps.oral.put(session);
    }
    closed = true;
    await step({ kind: "transport-closed", failed: event.failed, atMs });
    session = { ...session, endedAt: deps.clock.now(), endReason: machine.ended };
    await deps.oral.put(session);
    settle(session);
  };

  let queue: Promise<void> = Promise.resolve();
  const enqueue = (work: () => Promise<void>): Promise<void> => {
    queue = queue.then(work).catch((error: unknown) => {
      fail(error);
    });
    return queue;
  };

  try {
    await deps.transport.open({ scenario }, (event) => void enqueue(() => handle(event)));
  } catch (error) {
    session = { ...session, endedAt: deps.clock.now(), endReason: "transport-failed" };
    await deps.oral.put(session);
    throw error;
  }
  await enqueue(() => carryOut(start.commands));

  return {
    scenario,
    tick: () => enqueue(() => (closed ? Promise.resolve() : step({ kind: "tick", atMs: elapsedMs() }))),
    endByUser: () => enqueue(() => (closed ? Promise.resolve() : step({ kind: "end-requested", atMs: elapsedMs() }))),
    ended,
  };
};

export type OralAudioDeps = { readonly oral: OralStore };

export type SaveOralAudioResult = {
  /** Sessions whose recordings were deleted to make room, oldest first, so the screen can say so. */
  readonly evicted: readonly SessionId[];
};

/**
 * Store a session's recording under architecture.md §9.1's policy (progress.md D115).
 *
 * - **Only the last `AUDIO_KEEP_SESSIONS` sessions keep their recordings.** The oldest
 *   others are deleted first, quietly, because that is the policy the user was told.
 * - **When the device is full, the oldest recording goes next**, and the store is tried
 *   again, until it fits or there is nothing left to evict; those are reported, because
 *   §9.1 says to tell the user. With nothing left, the quota error is rethrown.
 * - **A transcript is never touched.** Only recordings are deleted.
 */
export const saveOralAudio = async (
  request: { readonly sessionId: SessionId; readonly audio: Blob },
  deps: OralAudioDeps,
): Promise<SaveOralAudioResult> => {
  const others = (await deps.oral.audioIndex()).filter((entry) => entry.sessionId !== request.sessionId);
  const excess = Math.max(0, others.length - (AUDIO_KEEP_SESSIONS - 1));
  if (excess > 0) await deps.oral.deleteAudio(others.slice(0, excess).map((entry) => entry.sessionId));

  const evictable = others.slice(excess).map((entry) => entry.sessionId);
  const evicted: SessionId[] = [];
  for (;;) {
    try {
      await deps.oral.putAudio(request.sessionId, request.audio);
      return { evicted };
    } catch (error) {
      const oldest = evictable.shift();
      if (!(error instanceof StorageQuotaError) || oldest === undefined) throw error;
      await deps.oral.deleteAudio([oldest]);
      evicted.push(oldest);
    }
  }
};

export type OralStorageEstimate = {
  /** The bytes of every stored recording: Palier's own audio, not the whole origin. */
  readonly bytes: number;
  /** At or past `AUDIO_WARNING_BYTES`, so the screen offers the cleanup. */
  readonly warn: boolean;
};

/**
 * How much room the recordings take (§9.1's warning at 200 MB). It counts the recordings
 * the store holds rather than the browser's estimate for the origin, which also counts the
 * cached bank and is deliberately padded by some browsers; audio is the one thing that grows.
 */
export const oralStorageEstimate = async (deps: OralAudioDeps): Promise<OralStorageEstimate> => {
  const bytes = (await deps.oral.audioIndex()).reduce((sum, entry) => sum + entry.bytes, 0);
  return { bytes, warn: bytes >= AUDIO_WARNING_BYTES };
};

/** §9.1's one-tap cleanup: every recording deleted, every transcript kept. */
export const cleanUpAudio = async (deps: OralAudioDeps): Promise<void> => {
  await deps.oral.deleteAudio((await deps.oral.audioIndex()).map((entry) => entry.sessionId));
};

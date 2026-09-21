import type { SessionId } from "@palier/domain";

import type { Clock, Session, SessionStore } from "../ports/index.js";

/**
 * Close a session (implementation-plan.md 3.2, `CompleteSession`): stamp its
 * `completedAt` from the clock and return the closed record. Pure orchestration —
 * one port call and a guard.
 *
 * This is the producer half of the loop `startSession` consumes. Closing a session
 * writes its `completedAt`; the next day's `startSession` reads `latest()` and turns
 * `completedAt !== null` into `planDailySession`'s `lastDayCompleted`. That is what
 * **closes D36** — the signal it left dangling now travels use-case to use-case
 * through `SessionStore`, with no UI involvement (progress.md D46).
 *
 * `complete` is keep-first-write at the store, so completing an already-complete
 * session returns the original instant and a double-submit is idempotent.
 */

export type CompleteSessionRequest = {
  readonly sessionId: SessionId;
};

export type CompleteSessionDeps = {
  readonly clock: Clock;
  readonly sessions: SessionStore;
};

export type CompleteSessionResult = {
  readonly session: Session;
};

/** The session id did not resolve, so there is nothing to complete. */
export class UnknownSessionError extends Error {
  constructor(readonly sessionId: SessionId) {
    super(`No session with id ${sessionId} exists, so it cannot be completed.`);
    this.name = "UnknownSessionError";
  }
}

export const completeSession = async (
  request: CompleteSessionRequest,
  deps: CompleteSessionDeps,
): Promise<CompleteSessionResult> => {
  const completed = await deps.sessions.complete(request.sessionId, deps.clock.now());
  if (completed === null) throw new UnknownSessionError(request.sessionId);
  return { session: completed };
};

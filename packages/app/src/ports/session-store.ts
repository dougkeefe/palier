import type { AttemptMode, SessionId } from "@palier/domain";

import type { ISO } from "./time.js";

/**
 * One practice or exam session (implementation-plan.md 3.3, architecture.md 9.1,
 * where the real store is indexed `sessions: 'id, type, startedAt'`).
 *
 * Like `ScheduleEntry`, this is a persisted aggregate the store owns rather than a
 * `@palier/domain` type: `@palier/engine` never consumes a `Session` (its functions
 * take study parameters), it carries no content-artefact role, and so it needs no
 * Zod schema. It references domain types by name only — `SessionId` and the
 * `AttemptMode` an attempt already carries — exactly as `ScheduleEntry` references
 * `ItemId` and `Skill` (progress.md D18, D38, D45).
 *
 * `mode` is architecture.md 9.1's `type` column. It reuses `AttemptMode`
 * (`drill | diagnostic | exam | review`) rather than the oral `sessionType`, which
 * is a field of `OralScenario` describing a scenario's shape and belongs to the
 * still-deferred `OralStore`. Every `Attempt` in a session inherits the session's
 * mode, so the two stay aligned by construction.
 *
 * `completedAt` is null while a session is in progress and an instant once it
 * closes. It is the whole of the minimum: `StartSession` and `CompleteSession` are
 * the two consumers, and between them they need only an id, a `startedAt` to order
 * by, a completion marker, and the sanctioned `type`. The "checkpointing, resume"
 * that 3.3 names for this port is aspirational — a `DayPlan` snapshot, a current-item
 * cursor, a resume blob — and its real consumer is the Phase 3 exam runner, which is
 * what will drive that shape. Adding it now would be inventing a type ahead of its
 * consumer (progress.md D19, D35, D45).
 */
export type Session = {
  readonly id: SessionId;
  readonly mode: AttemptMode;
  readonly startedAt: ISO;
  /** When the session closed, or null while it is still in progress. */
  readonly completedAt: ISO | null;
};

/**
 * Local persistence of sessions (implementation-plan.md 3.3). The minimum its two
 * consumers need and no more:
 *
 * - `create` returns `Promise<void>`, not the `Promise<boolean>` `AttemptStore.append`
 *   became (D44): `StartSession` has no non-idempotent follow-on write to guard, so
 *   the honest minimum is `void`, like `ScheduleStore.put`.
 * - `complete` returns the updated `Session`, or null when the id is unknown — the
 *   signal `CompleteSession` turns into its `UnknownSessionError`, the same "a use
 *   case needs a signal `void` cannot give" move as D38/D44. It is keep-first-write:
 *   completing an already-complete session leaves the original `completedAt`, so a
 *   double-submit is idempotent.
 * - `latest` returns the most-recently-started session (insertion order breaks a
 *   `startedAt` tie), or null on an empty store. It is the sole source of
 *   `planDailySession`'s `lastDayCompleted` (progress.md D36, closed by D46).
 *
 * There is deliberately no `get(id)`: neither consumer reads a session by id, so it
 * waits for one that does — the same restraint by which `ScheduleStore.get` was
 * added only when `answerItem` needed it. The exam runner's resume is its likely
 * first consumer.
 */
export type SessionStore = {
  create: (session: Session) => Promise<void>;
  complete: (id: SessionId, at: ISO) => Promise<Session | null>;
  latest: () => Promise<Session | null>;
};

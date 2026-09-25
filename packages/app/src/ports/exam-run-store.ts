import type { FormId, ItemId, ItemResponse, SessionId } from "@palier/domain";

import type { ISO } from "./time.js";

/**
 * One answer given during a mock exam. It carries the same timing evidence an
 * `Attempt` does, because `submitExam` turns each answer into one. An answer is
 * not an attempt yet: until the run is submitted the candidate may change it,
 * and re-answering an item replaces its `ExamAnswer`.
 */
export type ExamAnswer = {
  readonly itemId: ItemId;
  readonly response: ItemResponse;
  readonly msToFirstSelect: number;
  readonly msToConfirm: number;
  /** The candidate changed their mind, within this item or on returning to it. */
  readonly changedAnswer: boolean;
};

/**
 * One sitting of a mock exam on one immutable form (architecture.md 9.1's
 * `examRuns: 'id, formId, startedAt, submittedAt'`).
 *
 * Like `Session`, this is a persisted aggregate owned by its store and not a
 * `@palier/domain` type. `@palier/engine` never consumes a run: `scoreExam` takes
 * the form, the items and a response map (progress.md D45).
 *
 * - **`id` is a `SessionId`** (progress.md D80). Every `Attempt` groups by
 *   `sessionId`, so the attempts `submitExam` records point back at their run
 *   without a cast. A run is never written to the `SessionStore`.
 * - **`elapsedMs` is exam time used, not a wall-clock span.** A resume restores
 *   the timer from it (product-requirements.md §14: "mock exams resume with the
 *   clock as it was"), so the time the tab was closed never counts. The use cases
 *   never let it go backwards.
 * - **`submittedAt` is write-once.** It is null while the run is in progress and an
 *   instant once it is submitted. It never changes after that.
 * - **No result is stored.** The band is derived by rescoring (ADR 16). That is
 *   safe because the form, and its `bandCuts`, never change.
 */
export type ExamRun = {
  readonly id: SessionId;
  readonly formId: FormId;
  readonly startedAt: ISO;
  /** At most one per item, in the order the items were first answered. */
  readonly answers: readonly ExamAnswer[];
  readonly flagged: readonly ItemId[];
  readonly elapsedMs: number;
  /** When the run was last written, by an answer, a flag or a checkpoint. */
  readonly checkpointedAt: ISO;
  readonly submittedAt: ISO | null;
};

/**
 * Local persistence of exam runs (implementation-plan.md 3.3).
 *
 * The store is deliberately dumb. `put` is a plain upsert, and the rules live
 * elsewhere: the use cases refuse to write to a submitted run, and sync's
 * `mergeRecord` decides between two copies. Enforcing them here as well would
 * give the rules a second home that could drift from the first.
 *
 * - `get` is the by-id read that `SessionStore` deliberately lacks. Every exam use
 *   case after `startExam` needs it.
 * - `unsubmitted` returns the most recently started run that has not been
 *   submitted, or null. It is what "resume where you left off" reads. Insertion
 *   order breaks a `startedAt` tie.
 * - `all` and `clear` serve export and wipe [R11] (progress.md D61). `all`
 *   promises no order.
 */
export type ExamRunStore = {
  put: (run: ExamRun) => Promise<void>;
  get: (id: SessionId) => Promise<ExamRun | null>;
  unsubmitted: () => Promise<ExamRun | null>;
  all: () => Promise<readonly ExamRun[]>;
  clear: () => Promise<void>;
};

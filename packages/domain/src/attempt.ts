import type { AttemptId, ItemId, SessionId } from "./ids.js";
import type { OptionId, Skill } from "./skills.js";

export const ATTEMPT_MODES = ["drill", "diagnostic", "exam", "review"] as const;
export type AttemptMode = (typeof ATTEMPT_MODES)[number];

/**
 * Append-only and keyed by a client-generated ULID, which is what makes
 * attempts a conflict-free case during sync (architecture.md 9.4).
 *
 * `changedAnswer` and the two timings exist because the scheduler uses them:
 * an item answered correctly but slowly, or where the user changed their
 * answer, holds its Leitner box rather than advancing (architecture.md 7.3).
 */
export type Attempt = {
  readonly id: AttemptId;
  readonly itemId: ItemId;
  readonly bankVersion: number;
  readonly skill: Skill;
  readonly sessionId: SessionId;
  readonly chosen: OptionId;
  readonly correct: boolean;
  readonly msToFirstSelect: number;
  readonly msToConfirm: number;
  readonly changedAnswer: boolean;
  readonly mode: AttemptMode;
  readonly ts: string;
};

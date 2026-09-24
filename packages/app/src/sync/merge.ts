import type { ScheduleEntry, Session } from "../ports/index.js";
import { type SyncRecord, stableJson } from "./records.js";

/**
 * Merge two copies of one record that changed **concurrently** — both sides edited it
 * since the last revision they shared (progress.md D69). Sync calls this only then; a
 * causally later write simply replaces the earlier one. Import calls it on every
 * record already present, because a file carries no causal history.
 *
 * The rules, by aggregate:
 *
 * - **schedule — the lower Leitner box wins** (Gate B, D43, human decision 24 September
 *   2026). A disagreement means one device saw a failure, and re-reviewing an item the
 *   user knows costs seconds while skipping one they do not costs the exam. On an equal
 *   box the earlier `due` wins, and a retired entry (`due: null`) counts as latest.
 * - **attempt** — immutable and keyed by ULID, so two copies are identical (ADR 16).
 * - **session** — a completed copy beats an in-progress one, and of two completed
 *   copies the earlier `completedAt` wins: `completedAt` is write-once and never moves
 *   back to null (architecture.md §9.1).
 * - **setting — the local copy wins.** A setting is a preference the user just set on
 *   the device in front of them. Through sync this makes the last device to push win,
 *   because the server serialises pushes.
 *
 * Every rule except the setting's is symmetric and total — `merge(a, b)` equals
 * `merge(b, a)` — with ties the rule cannot decide broken by the records' stable JSON,
 * so two devices merging the same pair always agree.
 */
export const mergeRecord = (local: SyncRecord, remote: SyncRecord): SyncRecord => {
  if (local.type === "setting") return local;
  if (local.type === "schedule" && remote.type === "schedule") {
    return pick(local, remote, compareSchedule(local.value, remote.value));
  }
  if (local.type === "session" && remote.type === "session") {
    return pick(local, remote, compareSession(local.value, remote.value));
  }
  return pick(local, remote, 0);
};

/** Negative keeps `a`, positive keeps `b`, zero falls to the stable-JSON tie-break. */
const pick = (a: SyncRecord, b: SyncRecord, order: number): SyncRecord => {
  if (order < 0) return a;
  if (order > 0) return b;
  return stableJson(a.value) <= stableJson(b.value) ? a : b;
};

/** Order two optional instants; null — retired, or still in progress — sorts after every date. */
const compareInstants = (a: string | null, b: string | null): number => {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return Date.parse(a) - Date.parse(b);
};

const compareSchedule = (a: ScheduleEntry, b: ScheduleEntry): number =>
  a.box !== b.box ? a.box - b.box : compareInstants(a.due, b.due);

const compareSession = (a: Session, b: Session): number => compareInstants(a.completedAt, b.completedAt);

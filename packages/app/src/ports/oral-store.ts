import type { OralEndReason, OralTurn, ScenarioId, SessionId } from "@palier/domain";

import type { ISO } from "./time.js";

/**
 * One spoken session (product-requirements.md §8.6, progress.md D115): which
 * scenario it ran, when, why it ended, and every turn as it arrived.
 *
 * Like `WritingSubmission`, a persisted aggregate owned by its store and not a
 * `@palier/domain` type. Its parts are domain's (`OralTurn`, `OralEndReason`),
 * because the engine and the oral assessment share them.
 *
 * - **`endedAt` and `endReason` are null together**, while the session runs; once
 *   set, both are set, and every end carries its reason (Phase 5 exit criterion 5).
 * - **`turns` only grows.** Each is written as it arrives, so a disconnect keeps the
 *   transcript (architecture.md §14, Phase 6's criterion 2).
 */
export type OralSession = {
  readonly id: SessionId;
  readonly scenarioId: ScenarioId;
  readonly startedAt: ISO;
  readonly endedAt: ISO | null;
  readonly endReason: OralEndReason | null;
  readonly turns: readonly OralTurn[];
};

/** A stored recording, as the retention policy sees it: whose, how big, how old. */
export type OralAudioEntry = {
  readonly sessionId: SessionId;
  readonly bytes: number;
  readonly startedAt: ISO;
};

/**
 * The device ran out of room while storing a recording. The adapter translates the
 * browser's own error (`QuotaExceededError`, or what a browser reports instead) into
 * this at the edge, so no storage vendor's error crosses the port.
 */
export class StorageQuotaError extends Error {
  constructor() {
    super("The device has no room left to store this recording.");
    this.name = "StorageQuotaError";
  }
}

/**
 * Local persistence of spoken sessions and their recordings (progress.md D115),
 * the port §3.3 names and does not define. **Device-local: never synced and never
 * exported, under any setting** (architecture.md §9.4) [R12], like `WritingStore`.
 * No sync collector takes it and `exportData` does not; `wipeData` and
 * `deleteEverywhere` clear it.
 *
 * - `put` is a plain upsert by id; `all` is newest first by `startedAt`, which is a
 *   canonical UTC `toISOString()`, so string order is time order.
 * - **A recording belongs to a stored session.** `putAudio` rejects for an unknown
 *   id, replaces an earlier recording of the same session, and rejects with
 *   `StorageQuotaError` when the device is full, storing nothing.
 * - `audioIndex` lists every stored recording oldest first, with its size, so the
 *   retention policy (`saveOralAudio`) chooses what to evict without reading a blob.
 * - `deleteAudio` removes recordings only; a transcript is kept for good (§9.1).
 * - `clear` empties both sessions and recordings.
 *
 * The recording is a `Blob`, as §3.3's `transcribe(audio: Blob, …)` takes it: it is
 * what `MediaRecorder` produces, and IndexedDB stores one without copying it onto
 * the heap. It is a platform type, not a vendor's.
 */
export type OralStore = {
  put: (session: OralSession) => Promise<void>;
  get: (id: SessionId) => Promise<OralSession | null>;
  all: () => Promise<readonly OralSession[]>;
  putAudio: (id: SessionId, audio: Blob) => Promise<void>;
  audio: (id: SessionId) => Promise<Blob | null>;
  audioIndex: () => Promise<readonly OralAudioEntry[]>;
  deleteAudio: (ids: readonly SessionId[]) => Promise<void>;
  clear: () => Promise<void>;
};

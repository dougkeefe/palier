import type { OralAudioEntry, OralSession, OralStore } from "@palier/app";
import { StorageQuotaError } from "@palier/app";
import type { OralAssessment, OralEndReason, OralNote, OralTurn, SessionId } from "@palier/domain";
import { ORAL_END_REASONS, checkOralAssessment, oralAssessmentSchema, oralNoteSchema, oralTurnSchema } from "@palier/domain";

import type { OralAudioRow, PalierDb } from "./db.js";

const isText = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isInstant = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));
const isEndReason = (value: unknown): value is OralEndReason =>
  typeof value === "string" && (ORAL_END_REASONS as readonly string[]).includes(value);

/**
 * A report is usable only if its shape is whole and every error and word fits the turns it
 * points into (progress.md D126), as a writing assessment must fit its text (D106).
 */
const assessmentOf = (turns: readonly OralTurn[], raw: unknown): OralAssessment | null => {
  if (raw === undefined || raw === null) return null;
  const parsed = oralAssessmentSchema.safeParse(raw);
  if (!parsed.success) return null;
  const assessment = parsed.data as OralAssessment;
  return checkOralAssessment(turns, assessment) === null ? assessment : null;
};

/**
 * A studio examiner's notes (D168), each checked like a turn. A broken note is dropped and the
 * rest kept: a note is the examiner's aside, never the user's words, so losing one costs the
 * report a hint, where losing the session would cost the transcript. `undefined` when there are
 * none to keep, so a practice session reads as it was stored.
 */
const notesOf = (raw: unknown): readonly OralNote[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const notes = raw.filter((note) => oralNoteSchema.safeParse(note).success) as OralNote[];
  return notes.length === 0 ? undefined : notes;
};

/**
 * The structure check at the edge (D55's approach). A session reads only if it is whole:
 * its ids and start, an end and a reason that are both set or both null, and every turn
 * a whole `OralTurn`. Anything else reads as nothing, so a broken row never reaches the
 * report or the assessment.
 *
 * A session whose report is broken, or was stored before reports existed, **keeps its
 * transcript and reads as unassessed** (D126): the words are the user's, and the report can
 * be asked for again.
 */
const sessionOf = (raw: unknown): OralSession | null => {
  if (raw === undefined || raw === null) return null;
  const { id, scenarioId, startedAt, endedAt, endReason, turns, assessment, notes } = raw as Partial<
    Record<keyof OralSession, unknown>
  >;
  if (!isText(id) || !isText(scenarioId) || !isInstant(startedAt)) return null;
  const running = endedAt === null && endReason === null;
  const ended = isInstant(endedAt) && isEndReason(endReason);
  if (!running && !ended) return null;
  if (!Array.isArray(turns) || !turns.every((turn) => oralTurnSchema.safeParse(turn).success)) return null;
  const { notes: _stored, ...session } = raw as OralSession;
  const kept = notesOf(notes);
  return {
    ...session,
    assessment: assessmentOf(turns as OralTurn[], assessment),
    ...(kept === undefined ? {} : { notes: kept }),
  };
};

const audioOf = (raw: unknown): OralAudioRow | null => {
  if (raw === undefined || raw === null) return null;
  const { sessionId, blob, bytes, startedAt } = raw as Partial<Record<keyof OralAudioRow, unknown>>;
  if (!isText(sessionId) || !(blob instanceof Blob) || typeof bytes !== "number" || !isInstant(startedAt)) return null;
  return raw as OralAudioRow;
};

/**
 * Whether a failed write was the device running out of room. Dexie names the error after
 * the browser's own, and a wrapped one carries it as `inner`; matched by name, as the
 * attempt store matches `ConstraintError`, because the class differs across realms.
 */
export const isQuotaError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const inner = (error as { readonly inner?: unknown }).inner;
  return error.name === "QuotaExceededError" || (inner instanceof Error && inner.name === "QuotaExceededError");
};

/**
 * Spoken sessions and their recordings over v1's own `oralSessions` and `oralAudio`
 * tables (progress.md D115), with no version bump. Device-local: no sync collector reads
 * either table, and no export carries them.
 *
 * - A session is stored as the port's `OralSession`; `startedAt` and `scenarioId` are
 *   v1's indexes. `all` is newest first and `audioIndex` oldest first, by `startedAt`.
 * - A recording row keeps its session's `startedAt` and its size beside the blob, so the
 *   retention policy lists recordings without reading one.
 * - A full device becomes `StorageQuotaError` at this edge, and nothing is stored.
 */
export const dexieOralStore = (db: PalierDb): OralStore => ({
  put: async (session) => {
    await db.oralSessions.put(session);
  },
  get: async (id) => sessionOf(await db.oralSessions.get(id)),
  all: async () =>
    (await db.oralSessions.toArray())
      .map(sessionOf)
      .filter((session): session is OralSession => session !== null)
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)),
  putAudio: async (id: SessionId, audio: Blob) => {
    try {
      await db.transaction("rw", db.oralSessions, db.oralAudio, async () => {
        const session = sessionOf(await db.oralSessions.get(id));
        if (session === null) throw new Error(`No oral session ${id} holds this recording.`);
        await db.oralAudio.put({ sessionId: id, blob: audio, bytes: audio.size, startedAt: session.startedAt });
      });
    } catch (error) {
      if (isQuotaError(error)) throw new StorageQuotaError();
      throw error;
    }
  },
  audio: async (id) => audioOf(await db.oralAudio.get(id))?.blob ?? null,
  audioIndex: async () =>
    (await db.oralAudio.toArray())
      .map(audioOf)
      .filter((row): row is OralAudioRow => row !== null)
      .map(({ sessionId, bytes, startedAt }): OralAudioEntry => ({ sessionId, bytes, startedAt }))
      .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt)),
  deleteAudio: async (ids) => {
    await db.oralAudio.bulkDelete([...ids]);
  },
  clear: async () => {
    await db.transaction("rw", db.oralSessions, db.oralAudio, async () => {
      await db.oralSessions.clear();
      await db.oralAudio.clear();
    });
  },
});

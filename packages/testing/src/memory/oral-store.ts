import type { OralSession, OralStore } from "@palier/app";
import { StorageQuotaError } from "@palier/app";
import type { SessionId } from "@palier/domain";

type Recording = { readonly blob: Blob; readonly startedAt: string };

/**
 * Spoken sessions and their recordings, in memory (progress.md D115). `all` is newest
 * first by `startedAt`, `audioIndex` oldest first.
 *
 * `quotaBytes` bounds the recordings' total, so a test can fill the device and watch
 * the retention policy evict: a recording that would pass it is refused with
 * `StorageQuotaError`, storing nothing, as a full browser refuses a write.
 */
export const memoryOralStore = (options: { readonly quotaBytes?: number } = {}): OralStore => {
  const sessions = new Map<SessionId, OralSession>();
  const recordings = new Map<SessionId, Recording>();
  const usedWithout = (id: SessionId): number =>
    [...recordings.entries()].reduce((sum, [key, r]) => (key === id ? sum : sum + r.blob.size), 0);

  return {
    put: (session) => {
      sessions.set(session.id, session);
      return Promise.resolve();
    },
    get: (id) => Promise.resolve(sessions.get(id) ?? null),
    all: () =>
      Promise.resolve([...sessions.values()].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))),
    putAudio: (id, audio) => {
      const session = sessions.get(id);
      if (session === undefined) return Promise.reject(new Error(`No oral session ${id} holds this recording.`));
      if (options.quotaBytes !== undefined && usedWithout(id) + audio.size > options.quotaBytes) {
        return Promise.reject(new StorageQuotaError());
      }
      recordings.set(id, { blob: audio, startedAt: session.startedAt });
      return Promise.resolve();
    },
    audio: (id) => Promise.resolve(recordings.get(id)?.blob ?? null),
    audioIndex: () =>
      Promise.resolve(
        [...recordings.entries()]
          .map(([sessionId, r]) => ({ sessionId, bytes: r.blob.size, startedAt: r.startedAt }))
          .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt)),
      ),
    deleteAudio: (ids) => {
      for (const id of ids) recordings.delete(id);
      return Promise.resolve();
    },
    clear: () => {
      sessions.clear();
      recordings.clear();
      return Promise.resolve();
    },
  };
};

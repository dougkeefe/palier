import type { ExamRun, ExamRunStore } from "@palier/app";

import type { PalierDb } from "./db.js";

/**
 * The Dexie-backed `ExamRunStore` (architecture.md 9.1, indexed
 * `id, formId, startedAt, submittedAt`). The row is the port's `ExamRun` as it
 * stands, so there is nothing to translate.
 *
 * `put` is a plain upsert, as the port asks. `unsubmitted` cannot read the
 * `submittedAt` index, because IndexedDB leaves a null key out of an index, and an
 * in-progress run is exactly the null case. It walks `startedAt` newest first and
 * takes the first unsubmitted run instead. Like `dexieSessionStore.latest`, a
 * `startedAt` tie falls to the primary key.
 */
export const dexieExamRunStore = (db: PalierDb): ExamRunStore => ({
  put: async (run: ExamRun) => {
    await db.examRuns.put(run);
  },
  get: async (id) => (await db.examRuns.get(id)) ?? null,
  unsubmitted: async () =>
    (await db.examRuns
      .orderBy("startedAt")
      .reverse()
      .filter((run) => run.submittedAt === null)
      .first()) ?? null,
  all: () => db.examRuns.toArray(),
  clear: () => db.examRuns.clear(),
});

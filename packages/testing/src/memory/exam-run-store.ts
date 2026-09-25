import type { ExamRun, ExamRunStore } from "@palier/app";

/**
 * An in-memory `ExamRunStore` over a `Map`. `put` is a plain upsert, as the port
 * asks; the write-once rule for `submittedAt` belongs to the use cases and to
 * `mergeRecord`, not to the store. A `Map` keeps first-insertion order, which
 * breaks a `startedAt` tie in `unsubmitted()`.
 */
export const memoryExamRunStore = (): ExamRunStore => {
  const byId = new Map<string, ExamRun>();

  return {
    put: (run) => {
      byId.set(run.id, run);
      return Promise.resolve();
    },
    get: (id) => Promise.resolve(byId.get(id) ?? null),
    unsubmitted: () =>
      Promise.resolve(
        [...byId.values()]
          .filter((run) => run.submittedAt === null)
          .reduce<ExamRun | null>(
            // `>=` so a later-inserted run with an equal `startedAt` wins the tie.
            (best, run) =>
              best === null || Date.parse(run.startedAt) >= Date.parse(best.startedAt) ? run : best,
            null,
          ),
      ),
    all: () => Promise.resolve([...byId.values()]),
    clear: () => {
      byId.clear();
      return Promise.resolve();
    },
  };
};

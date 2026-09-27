import type { WritingStore, WritingSubmission } from "@palier/app";

/**
 * The writing workshop's submissions, in memory (progress.md D106). `all` is newest first
 * by `writtenAt`.
 */
export const memoryWritingStore = (): WritingStore => {
  const byId = new Map<string, WritingSubmission>();
  return {
    put: (submission) => {
      byId.set(submission.id, submission);
      return Promise.resolve();
    },
    get: (id) => Promise.resolve(byId.get(id) ?? null),
    all: () =>
      Promise.resolve(
        [...byId.values()].sort((a, b) => Date.parse(b.writtenAt) - Date.parse(a.writtenAt)),
      ),
    clear: () => {
      byId.clear();
      return Promise.resolve();
    },
  };
};

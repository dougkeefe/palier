import type { Attempt, AttemptStore, ISO, ItemId, Skill } from "../ports.stub.js";

/**
 * Attempts are append-only and keyed by a client-generated ULID
 * (architecture.md 9.4), which is why a duplicate id is a no-op rather than an
 * error: a retried sync push must not double-count.
 */
export const memoryAttemptStore = (): AttemptStore => {
  const attempts: Attempt[] = [];
  const seen = new Set<string>();

  return {
    append: (attempt) => {
      if (!seen.has(attempt.id)) {
        seen.add(attempt.id);
        attempts.push(attempt);
      }
      return Promise.resolve();
    },
    recent: (skill: Skill, n: number) =>
      Promise.resolve(attempts.filter((a) => a.skill === skill).slice(-n)),
    since: (t: ISO) =>
      Promise.resolve(attempts.filter((a) => Date.parse(a.ts) >= Date.parse(t))),
    forItem: (id: ItemId) =>
      Promise.resolve(attempts.filter((a) => a.itemId === id)),
  };
};

import type { AttemptStore, ISO } from "@palier/app";
import type { Attempt, ItemId, Skill } from "@palier/domain";

/**
 * Attempts are append-only and keyed by a client-generated ULID
 * (architecture.md 9.4), which is why a duplicate id is a no-op rather than an
 * error: a retried sync push must not double-count. `append` reports whether the
 * attempt was newly stored (`false` on the duplicate no-op) so a caller can make
 * its follow-on writes idempotent too — see progress.md D44.
 */
export const memoryAttemptStore = (): AttemptStore => {
  const attempts: Attempt[] = [];
  const seen = new Set<string>();

  return {
    append: (attempt) => {
      if (seen.has(attempt.id)) return Promise.resolve(false);
      seen.add(attempt.id);
      attempts.push(attempt);
      return Promise.resolve(true);
    },
    recent: (skill: Skill, n: number) =>
      Promise.resolve(
        n <= 0 ? [] : attempts.filter((a) => a.skill === skill).slice(-n),
      ),
    since: (t: ISO) =>
      Promise.resolve(attempts.filter((a) => Date.parse(a.ts) >= Date.parse(t))),
    forItem: (id: ItemId) =>
      Promise.resolve(attempts.filter((a) => a.itemId === id)),
  };
};

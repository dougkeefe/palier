import type { ISO, Session, SessionStore } from "@palier/app";
import type { SessionId } from "@palier/domain";

/**
 * An in-memory `SessionStore` over a `Map`, whose insertion order breaks a
 * `startedAt` tie in `latest()` — the same tie-break the real store gets from its
 * `startedAt` index plus a stable id ordering.
 *
 * `complete` is keep-first-write: closing an already-closed session returns the
 * original `completedAt` untouched, so a double-submit is idempotent and the port's
 * contract holds it to that.
 */
export const memorySessionStore = (): SessionStore => {
  const byId = new Map<string, Session>();

  return {
    create: (session) => {
      byId.set(session.id, session);
      return Promise.resolve();
    },
    complete: (id: SessionId, at: ISO) => {
      const session = byId.get(id);
      if (session === undefined) return Promise.resolve(null);
      // Keep the first completion instant, so re-completing is a no-op.
      const completed: Session =
        session.completedAt === null ? { ...session, completedAt: at } : session;
      byId.set(id, completed);
      return Promise.resolve(completed);
    },
    latest: () =>
      Promise.resolve(
        [...byId.values()].reduce<Session | null>(
          // `>=` so a later-inserted session with an equal `startedAt` wins the tie.
          (best, s) =>
            best === null || Date.parse(s.startedAt) >= Date.parse(best.startedAt) ? s : best,
          null,
        ),
      ),
  };
};

import type { OralLiveness } from "@palier/app";
import { type SessionId, sessionId } from "@palier/domain";

/** Every session's lock is named with this prefix, so no other lock on the origin is read as one. */
export const ORAL_LOCK_PREFIX = "palier:oral-session:";

/** The part of the Web Locks API this reads and writes, so a test can hand in its own. */
export type LockKit = Pick<LockManager, "request" | "query">;

/**
 * Which spoken sessions a page on this device is running (progress.md D144), over the Web
 * Locks API: the page running a session holds an exclusive lock named for it, and the browser
 * releases the lock itself when the page goes, closed, crashed or reloaded. So a session whose
 * lock nobody holds was abandoned, and one another tab holds is still running.
 *
 * Without Web Locks (an old browser, or the Node of a unit test), nothing is held and nothing
 * is live, which is what the app did before: a session left open is closed by the next start.
 */
export const webLocksLiveness = (locks: LockKit | undefined): OralLiveness => ({
  hold: (id) => {
    if (locks === undefined) return () => undefined;
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    // The lock is held for as long as the callback's promise is pending.
    void locks.request(`${ORAL_LOCK_PREFIX}${id}`, () => held).catch(() => undefined);
    return () => release();
  },
  live: async () => {
    if (locks === undefined) return new Set<SessionId>();
    const { held = [] } = await locks.query();
    return new Set(
      held.flatMap(({ name }) => (name?.startsWith(ORAL_LOCK_PREFIX) ? [sessionId(name.slice(ORAL_LOCK_PREFIX.length))] : [])),
    );
  },
});

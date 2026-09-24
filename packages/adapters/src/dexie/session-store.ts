import type { ISO, Session, SessionStore } from "@palier/app";
import type { SessionId } from "@palier/domain";

import type { PalierDb, SessionRow } from "./db.js";

/**
 * The Dexie-backed `SessionStore` (architecture.md 9.1, indexed `id, type, startedAt`).
 * The stored column is `type`; the port speaks `mode`, so the two are translated at the
 * edge — the store's whole reason to exist (§2.4). `complete` is keep-first-write on
 * `completedAt`, so a double-submit is idempotent, and returns null on an unknown id
 * (the signal `CompleteSession` turns into its error). `latest` is the most-recently
 * started session via the `startedAt` index.
 */
const toSession = (row: SessionRow): Session => ({
  id: row.id,
  mode: row.type,
  startedAt: row.startedAt,
  completedAt: row.completedAt,
});

const toRow = (session: Session): SessionRow => ({
  id: session.id,
  type: session.mode,
  startedAt: session.startedAt,
  completedAt: session.completedAt,
});

export const dexieSessionStore = (db: PalierDb): SessionStore => ({
  create: async (session: Session) => {
    await db.sessions.put(toRow(session));
  },
  complete: async (id: SessionId, at: ISO) => {
    const row = await db.sessions.get(id);
    if (row === undefined) return null;
    // Keep the first completion instant, so re-completing is a no-op.
    const completed: SessionRow = row.completedAt === null ? { ...row, completedAt: at } : row;
    await db.sessions.put(completed);
    return toSession(completed);
  },
  latest: async () => {
    // `orderBy("startedAt").last()` breaks a `startedAt` tie by the primary key `id` — which
    // is the "startedAt index plus a stable id ordering" the port documents for the real
    // store, and, since ids are monotonic ULIDs, agrees with the in-memory store's insertion
    // order in practice.
    const row = await db.sessions.orderBy("startedAt").last();
    return row === undefined ? null : toSession(row);
  },
  all: async () => (await db.sessions.toArray()).map(toSession),
  clear: () => db.sessions.clear(),
});

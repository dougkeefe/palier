import type {
  Clock,
  ISO,
  LedgerEntry,
  SyncDocument,
  SyncStateStore,
  SyncTransport,
} from "../ports/index.js";
import { SyncUnauthorizedError, SyncUnavailableError } from "../ports/index.js";
import { mergeRecord } from "../sync/merge.js";
import {
  type ProgressStores,
  type SyncRecord,
  collectRecords,
  decodeRecord,
  keyOf,
  liveRecords,
  recordHash,
  writeRecord,
} from "../sync/records.js";

/**
 * Sync this device with the service once (implementation-plan.md §3.2, `SyncNow`;
 * architecture.md §9.4): pull what changed elsewhere, merge, push what changed here.
 *
 * **How a change is found.** The device keeps a ledger of the revision and hash each
 * record had when it last agreed with the server (`SyncStateStore`). A record whose hash
 * differs from its ledger entry — or that has none — is dirty (progress.md D69).
 *
 * **How a conflict is settled.** A push names the revision each record was derived
 * from, and the server takes it only while that revision is current. So a write that
 * is causally *later* — the device saw the server's copy, then changed it — replaces
 * it outright, and a Leitner box can rise after it has synced. Only a *concurrent*
 * edit, where both sides changed the record since their shared revision, is merged, by
 * `mergeRecord`: the lower box wins (Gate B). Pull runs first, so most concurrent edits
 * are merged before anything is pushed, and a conflict the push still meets is merged
 * and re-pushed, up to `MAX_PUSH_ROUNDS` times.
 *
 * **Deferred registration** (architecture.md §9.3). A device with no identity does not
 * register until it has completed a session, so a visitor who lands and leaves creates
 * nothing on the server — unless a pairing is unconfirmed, which was a request to sync.
 *
 * **An unconfirmed pairing** (a redeem that failed in transit, progress.md D74) is settled
 * first: the device asks which account it is in, and starts over only if that moved.
 *
 * **Sync failure never interrupts study** (§11). An unreachable service is an outcome,
 * not a throw. A device the service no longer recognises — removed from the device
 * list, or its account deleted elsewhere — turns sync off and forgets its identity, so
 * it can never silently rejoin; turning sync back on starts a fresh account.
 */

export const PUSH_BATCH = 500;
export const MAX_PUSH_ROUNDS = 3;

export type SyncNowRequest = {
  /** The friendly name this device registers under (§8.11), e.g. "Firefox on Linux". */
  readonly label: string;
  /** Called with the running count of records written from the server, as they land (§14). */
  readonly onPulled?: (count: number) => void;
};

export type SyncNowDeps = ProgressStores & {
  readonly clock: Clock;
  readonly transport: SyncTransport;
  readonly syncState: SyncStateStore;
};

export type SyncOutcome =
  | { readonly status: "off" }
  | { readonly status: "waiting" }
  | {
      readonly status: "synced";
      /** Records written here from the server. */
      readonly pulled: number;
      /** Records the server accepted from here. */
      readonly pushed: number;
      /** Concurrent edits settled by `mergeRecord`. */
      readonly merged: number;
      readonly at: ISO;
    }
  | { readonly status: "unavailable"; readonly reason: string }
  | { readonly status: "removed" };

type Held = { record: SyncRecord; hash: string };

export const syncNow = async (request: SyncNowRequest, deps: SyncNowDeps): Promise<SyncOutcome> => {
  const state = await deps.syncState.state();
  if (!state.enabled) return { status: "off" };

  try {
    let from = state.watermark;
    if (state.identity === null) {
      // A pairing whose answer never came was a request to sync, so it does not wait.
      const sessions = await deps.sessions.all();
      if (!state.accountUnconfirmed && !sessions.some((s) => s.completedAt !== null)) return { status: "waiting" };
      const identity = await deps.transport.registerDevice(request.label);
      await deps.syncState.update({ identity, accountUnconfirmed: false });
    } else if (state.accountUnconfirmed) {
      // Registration is idempotent per secret, so it names the account this device is in.
      // Only if a lost pair redeem moved it does the ledger go, and the exchange start over.
      const identity = await deps.transport.registerDevice(request.label);
      if (identity.accountId !== state.identity.accountId) {
        await deps.syncState.resetLedger();
        from = 0;
      }
      await deps.syncState.update({ identity, accountUnconfirmed: false });
    }
    const counts = await exchange(request, deps, from);
    const at = deps.clock.now();
    await deps.syncState.update({ lastSyncedAt: at });
    return { status: "synced", ...counts, at };
  } catch (error) {
    if (error instanceof SyncUnavailableError) return { status: "unavailable", reason: error.reason };
    if (error instanceof SyncUnauthorizedError) {
      await deps.syncState.resetLedger();
      await deps.syncState.update({ identity: null, enabled: false });
      return { status: "removed" };
    }
    throw error;
  }
};

const exchange = async (request: SyncNowRequest, deps: SyncNowDeps, from: number) => {
  const local = new Map<string, Held>();
  for (const [key, record] of await collectRecords(deps)) local.set(key, { record, hash: recordHash(record.value) });
  const ledger = new Map((await deps.syncState.ledger()).map((e) => [keyOf(e.type, e.id), e]));
  const changed: LedgerEntry[] = [];
  let pulled = 0;
  let pushed = 0;
  let merged = 0;

  const agree = (entry: LedgerEntry) => {
    ledger.set(keyOf(entry.type, entry.id), entry);
    changed.push(entry);
  };
  const flush = async () => {
    if (changed.length > 0) await deps.syncState.record(changed.splice(0));
  };

  // Renewed for every page and every push batch, so what it caches is never staler than that.
  let readLive = liveRecords(deps);

  /** Bring one server copy into the device: take it, keep ours, or merge the two. */
  const settle = async (doc: SyncDocument) => {
    const remote = decodeRecord(doc.type, doc.id, doc.payload);
    if (remote === null) return;
    const key = keyOf(doc.type, doc.id);
    const base = ledger.get(key);
    // A revision this device already agreed on is not news — most often its own push
    // coming back on the next pull. Treating it as a concurrent edit would let the
    // server's older copy out-merge the device's newer one.
    if (base !== undefined && doc.revision <= base.revision) return;
    const remoteHash = recordHash(remote.value);
    // The snapshot is a round trip old, and study does not pause for sync: an answer
    // may have changed this record since. Settle against what the device holds now,
    // so that answer counts as a local edit and merges instead of being overwritten.
    let mine = local.get(key);
    const live = await readLive(doc.type, doc.id);
    if (live !== null && recordHash(live.value) !== mine?.hash) {
      mine = { record: live, hash: recordHash(live.value) };
      local.set(key, mine);
    }
    let next: Held = { record: remote, hash: remoteHash };
    if (mine !== undefined && mine.hash !== remoteHash) {
      const clean = base?.hash === mine.hash;
      if (!clean) {
        const record = mergeRecord(mine.record, remote);
        next = { record, hash: recordHash(record.value) };
        merged++;
      }
    }
    if (mine?.hash !== next.hash) {
      await writeRecord(next.record, deps);
      local.set(key, next);
      pulled++;
    }
    // The ledger records the *server's* copy, so a merge that differs from it stays dirty.
    agree({ type: doc.type, id: doc.id, revision: doc.revision, hash: remoteHash });
  };

  let watermark = from;
  for (;;) {
    const page = await deps.transport.pull(watermark);
    readLive = liveRecords(deps);
    for (const doc of page.docs) await settle(doc);
    watermark = page.watermark;
    await flush();
    await deps.syncState.update({ watermark });
    request.onPulled?.(pulled);
    if (!page.more) break;
  }

  for (let round = 0; round < MAX_PUSH_ROUNDS; round++) {
    const dirty = [...local.entries()].filter(([key, held]) => ledger.get(key)?.hash !== held.hash);
    if (dirty.length === 0) break;
    for (let i = 0; i < dirty.length; i += PUSH_BATCH) {
      const batch = dirty.slice(i, i + PUSH_BATCH);
      const result = await deps.transport.push(
        batch.map(([key, { record }]) => ({
          type: record.type,
          id: record.id,
          baseRevision: ledger.get(key)?.revision ?? null,
          payload: record.value,
        })),
      );
      for (const accepted of result.accepted) {
        const held = local.get(keyOf(accepted.type, accepted.id));
        if (held === undefined) continue;
        agree({ type: accepted.type, id: accepted.id, revision: accepted.revision, hash: held.hash });
        pushed++;
      }
      readLive = liveRecords(deps);
      for (const conflict of result.conflicts) await settle(conflict);
      await flush();
    }
  }

  return { pulled, pushed, merged };
};

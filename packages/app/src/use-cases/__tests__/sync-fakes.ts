import type { Attempt } from "@palier/domain";

import type {
  AttemptStore,
  DeviceIdentity,
  LedgerEntry,
  ScheduleEntry,
  ScheduleStore,
  Session,
  SessionStore,
  SettingsStore,
  SyncDocument,
  SyncState,
  SyncStateStore,
  SyncTransport,
} from "../../ports/index.js";
import { INITIAL_SYNC_STATE, PairCodeRejectedError, SyncUnauthorizedError, deviceId } from "../../ports/index.js";

/**
 * Local, stateful stand-ins for the sync tests (progress.md D37: `@palier/app` cannot
 * import `@palier/testing`). The server keeps the revision semantics `SyncTransport`
 * promises — per-account increasing revisions, accept-only-on-current-base — and
 * nothing else; `@palier/testing`'s `memorySyncServer` is the full one, held to the
 * contract suite.
 */

export const attemptStore = (): AttemptStore => {
  const rows = new Map<string, Attempt>();
  return {
    append: (a) => {
      if (rows.has(a.id)) return Promise.resolve(false);
      rows.set(a.id, a);
      return Promise.resolve(true);
    },
    recent: () => Promise.resolve([]),
    since: () => Promise.resolve([]),
    forItem: () => Promise.resolve([]),
    all: () => Promise.resolve([...rows.values()]),
    clear: () => {
      rows.clear();
      return Promise.resolve();
    },
  };
};

export const scheduleStore = (): ScheduleStore => {
  const rows = new Map<string, ScheduleEntry>();
  return {
    due: () => Promise.resolve([]),
    get: (id) => Promise.resolve(rows.get(id) ?? null),
    put: (e) => {
      rows.set(e.itemId, e);
      return Promise.resolve();
    },
    all: () => Promise.resolve([...rows.values()]),
    clear: () => {
      rows.clear();
      return Promise.resolve();
    },
  };
};

export const sessionStore = (): SessionStore => {
  const rows = new Map<string, Session>();
  return {
    create: (s) => {
      rows.set(s.id, s);
      return Promise.resolve();
    },
    complete: () => Promise.resolve(null),
    latest: () => Promise.resolve(null),
    all: () => Promise.resolve([...rows.values()]),
    clear: () => {
      rows.clear();
      return Promise.resolve();
    },
  };
};

export const settingsStore = (): SettingsStore => {
  const rows = new Map<string, unknown>();
  return {
    get: <T>(key: string) => Promise.resolve((rows.has(key) ? rows.get(key) : null) as T | null),
    set: (key, value) => {
      rows.set(key, value);
      return Promise.resolve();
    },
    all: () => Promise.resolve([...rows].map(([key, value]) => ({ key, value }))),
    clear: () => {
      rows.clear();
      return Promise.resolve();
    },
  };
};

export const syncStateStore = (initial: Partial<SyncState> = {}): SyncStateStore => {
  let state: SyncState = { ...INITIAL_SYNC_STATE, ...initial };
  const ledger = new Map<string, LedgerEntry>();
  return {
    state: () => Promise.resolve(state),
    update: (patch) => {
      state = { ...state, ...patch };
      return Promise.resolve(state);
    },
    ledger: () => Promise.resolve([...ledger.values()]),
    record: (entries) => {
      for (const e of entries) ledger.set(`${e.type}:${e.id}`, e);
      return Promise.resolve();
    },
    resetLedger: () => {
      ledger.clear();
      state = { ...state, watermark: 0 };
      return Promise.resolve();
    },
    clear: () => {
      ledger.clear();
      state = INITIAL_SYNC_STATE;
      return Promise.resolve();
    },
  };
};

type Account = { revision: number; docs: Map<string, SyncDocument> };

export type FakeServer = {
  readonly transport: (secret: string) => SyncTransport;
  readonly docs: (accountId: string) => readonly SyncDocument[];
  /** Write a document as another device would, bypassing any client. */
  readonly write: (accountId: string, doc: Omit<SyncDocument, "revision">) => SyncDocument;
  readonly accountOf: (secret: string) => string | undefined;
  pageSize: number;
};

export const fakeServer = (): FakeServer => {
  const accounts = new Map<string, Account>();
  const devices = new Map<string, { accountId: string; deviceId: string; label: string }>();
  const codes = new Map<string, string>();
  let nextId = 0;

  const bump = (account: Account, doc: Omit<SyncDocument, "revision">): SyncDocument => {
    account.revision++;
    const stored = { ...doc, revision: account.revision };
    account.docs.set(`${doc.type}:${doc.id}`, stored);
    return stored;
  };

  const server: FakeServer = {
    pageSize: 500,
    docs: (accountId) => [...(accounts.get(accountId)?.docs.values() ?? [])],
    write: (accountId, doc) => bump(accounts.get(accountId) as Account, doc),
    accountOf: (secret) => devices.get(secret)?.accountId,
    transport: (secret) => {
      const who = () => {
        const device = devices.get(secret);
        if (device === undefined) throw new SyncUnauthorizedError();
        return { device, account: accounts.get(device.accountId) as Account };
      };
      const join = (accountId: string, label: string): DeviceIdentity => {
        const id = deviceId(`device-${String(++nextId)}`);
        devices.set(secret, { accountId, deviceId: id, label });
        return { accountId, deviceId: id };
      };
      return {
        registerDevice: (label) => {
          const accountId = `account-${String(++nextId)}`;
          accounts.set(accountId, { revision: 0, docs: new Map() });
          return Promise.resolve(join(accountId, label));
        },
        requestPairCode: () => {
          const { device } = who();
          const code = `CODE${String(++nextId)}`;
          codes.set(code, device.accountId);
          return Promise.resolve({ code, expiresAt: "2026-09-24T12:10:00.000Z" });
        },
        redeemPairCode: (code, label) => {
          const accountId = codes.get(code);
          if (accountId === undefined) return Promise.reject(new PairCodeRejectedError());
          codes.delete(code);
          return Promise.resolve(join(accountId, label));
        },
        listDevices: () => {
          const { device } = who();
          return Promise.resolve(
            [...devices.values()]
              .filter((d) => d.accountId === device.accountId)
              .map((d) => ({
                id: deviceId(d.deviceId),
                label: d.label,
                lastSeenAt: "2026-09-24T12:00:00.000Z",
                current: d.deviceId === device.deviceId,
              })),
          );
        },
        revokeDevice: (id) => {
          who();
          for (const [s, d] of devices) if (d.deviceId === id) devices.delete(s);
          return Promise.resolve();
        },
        deleteAccount: () => {
          const { device } = who();
          accounts.delete(device.accountId);
          for (const [s, d] of devices) if (d.accountId === device.accountId) devices.delete(s);
          return Promise.resolve();
        },
        pull: (watermark) => {
          const { account } = who();
          const newer = [...account.docs.values()]
            .filter((d) => d.revision > watermark)
            .sort((a, b) => a.revision - b.revision);
          const docs = newer.slice(0, server.pageSize);
          return Promise.resolve({
            docs,
            watermark: docs.at(-1)?.revision ?? watermark,
            more: newer.length > docs.length,
          });
        },
        push: (items) => {
          const { account } = who();
          const accepted: { type: SyncDocument["type"]; id: string; revision: number }[] = [];
          const conflicts: SyncDocument[] = [];
          for (const item of items) {
            const current = account.docs.get(`${item.type}:${item.id}`);
            if (current !== undefined && current.revision !== item.baseRevision) {
              conflicts.push(current);
              continue;
            }
            const stored = bump(account, { type: item.type, id: item.id, payload: item.payload });
            accepted.push({ type: item.type, id: item.id, revision: stored.revision });
          }
          return Promise.resolve({ accepted, conflicts });
        },
      };
    },
  };
  return server;
};

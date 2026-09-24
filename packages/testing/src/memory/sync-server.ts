import type {
  Clock,
  DeviceIdentity,
  DeviceSummary,
  PullResult,
  PushItem,
  PushResult,
  SyncDocument,
  SyncTransport,
} from "@palier/app";
import {
  PAIR_CODE_ALPHABET,
  PAIR_CODE_LENGTH,
  PAIR_CODE_TTL_MS,
  PairCodeRejectedError,
  SyncUnauthorizedError,
  deviceId,
} from "@palier/app";

import { fakeClock } from "../clock/fake-clock.js";

/**
 * The sync service, in memory: every rule `SyncTransport` promises, held to
 * `syncTransportContract` exactly as the real route handlers are (progress.md D69).
 *
 * - Revisions are per account and strictly increasing; a pull pages at `pageSize`.
 * - A push is taken only while its `baseRevision` is the document's current revision
 *   (or the document is new); otherwise the current copy comes back as a conflict.
 * - Pairing codes are six characters from `PAIR_CODE_ALPHABET`, last ten minutes by the
 *   injected clock, and work once.
 * - A removed device's secret stops working at once; deleting the account removes
 *   every device on it.
 *
 * Deterministic: ids and codes come from counters, time from the clock, so a test
 * replays exactly. Secrets are held as given — hashing is the real server's concern.
 */

export type MemorySyncServerOptions = {
  readonly clock?: Clock;
  readonly pageSize?: number;
};

export type MemorySyncServer = {
  /** A transport presenting `secret`, as one device would. */
  readonly transport: (secret: string) => SyncTransport;
  /** The service calls behind the transport, keyed by the presented secret. */
  readonly service: SyncService;
  /** Every document an account holds, in revision order. */
  readonly documents: (accountId: string) => readonly SyncDocument[];
};

export type SyncService = {
  readonly register: (secret: string, label: string) => DeviceIdentity;
  readonly pairCode: (secret: string) => { code: string; expiresAt: string };
  readonly pair: (secret: string, code: string, label: string) => DeviceIdentity;
  readonly devices: (secret: string) => readonly DeviceSummary[];
  /** Revoke a device of the caller's account; false when the account holds no such live device. */
  readonly revoke: (secret: string, id: string) => boolean;
  readonly deleteAccount: (secret: string) => void;
  readonly pull: (secret: string, watermark: number) => PullResult;
  readonly push: (secret: string, items: readonly PushItem[]) => PushResult;
};

type Device = { id: string; accountId: string; label: string; lastSeenAt: string; revoked: boolean };
type Account = { revision: number; docs: Map<string, SyncDocument> };

export const memorySyncServer = (options: MemorySyncServerOptions = {}): MemorySyncServer => {
  const clock = options.clock ?? fakeClock();
  const pageSize = options.pageSize ?? 500;
  const accounts = new Map<string, Account>();
  const bySecret = new Map<string, Device>();
  const codes = new Map<string, { accountId: string; expiresAt: number }>();
  let counter = 0;
  const next = () => ++counter;

  const newAccount = (): string => {
    const id = `account-${String(next())}`;
    accounts.set(id, { revision: 0, docs: new Map() });
    return id;
  };

  const attach = (secret: string, accountId: string, label: string): DeviceIdentity => {
    const device: Device = {
      id: `device-${String(next())}`,
      accountId,
      label,
      lastSeenAt: clock.now(),
      revoked: false,
    };
    bySecret.set(secret, device);
    return { accountId, deviceId: deviceId(device.id) };
  };

  /** An account with no live device left is unreachable forever, so it goes too. */
  const dropIfOrphaned = (accountId: string) => {
    if (![...bySecret.values()].some((d) => d.accountId === accountId && !d.revoked)) accounts.delete(accountId);
  };

  const authorised = (secret: string): { device: Device; account: Account } => {
    const device = bySecret.get(secret);
    const account = device === undefined ? undefined : accounts.get(device.accountId);
    if (device === undefined || device.revoked || account === undefined) throw new SyncUnauthorizedError();
    device.lastSeenAt = clock.now();
    return { device, account };
  };

  const codeFrom = (n: number): string => {
    let code = "";
    let rest = n;
    for (let i = 0; i < PAIR_CODE_LENGTH; i++) {
      code += PAIR_CODE_ALPHABET[rest % PAIR_CODE_ALPHABET.length];
      rest = Math.floor(rest / PAIR_CODE_ALPHABET.length);
    }
    return code;
  };

  const service: SyncService = {
    register: (secret, label) => {
      const existing = bySecret.get(secret);
      if (existing !== undefined && !existing.revoked && accounts.has(existing.accountId)) {
        return { accountId: existing.accountId, deviceId: deviceId(existing.id) };
      }
      return attach(secret, newAccount(), label);
    },
    pairCode: (secret) => {
      const { device } = authorised(secret);
      const code = codeFrom(next() * 7919);
      const expiresAt = Date.parse(clock.now()) + PAIR_CODE_TTL_MS;
      codes.set(code, { accountId: device.accountId, expiresAt });
      return { code, expiresAt: new Date(expiresAt).toISOString() };
    },
    pair: (secret, code, label) => {
      const offer = codes.get(code);
      if (offer === undefined || Date.parse(clock.now()) >= offer.expiresAt || !accounts.has(offer.accountId)) {
        throw new PairCodeRejectedError();
      }
      codes.delete(code);
      const previous = bySecret.get(secret);
      const identity = attach(secret, offer.accountId, label);
      if (previous !== undefined && previous.accountId !== offer.accountId) dropIfOrphaned(previous.accountId);
      return identity;
    },
    devices: (secret) => {
      const { device } = authorised(secret);
      return [...bySecret.values()]
        .filter((d) => d.accountId === device.accountId && !d.revoked)
        .map((d) => ({ id: deviceId(d.id), label: d.label, lastSeenAt: d.lastSeenAt, current: d.id === device.id }));
    },
    revoke: (secret, id) => {
      const { device } = authorised(secret);
      const target = [...bySecret.values()].find((d) => d.id === id && d.accountId === device.accountId && !d.revoked);
      if (target === undefined) return false;
      target.revoked = true;
      return true;
    },
    deleteAccount: (secret) => {
      const { device } = authorised(secret);
      accounts.delete(device.accountId);
      for (const d of bySecret.values()) if (d.accountId === device.accountId) d.revoked = true;
    },
    pull: (secret, watermark) => {
      const { account } = authorised(secret);
      const newer = [...account.docs.values()].filter((d) => d.revision > watermark).sort((a, b) => a.revision - b.revision);
      const docs = newer.slice(0, pageSize);
      return { docs, watermark: docs.at(-1)?.revision ?? watermark, more: newer.length > docs.length };
    },
    push: (secret, items) => {
      const { account } = authorised(secret);
      const accepted: PushResult["accepted"][number][] = [];
      const conflicts: SyncDocument[] = [];
      for (const item of items) {
        const key = `${item.type}:${item.id}`;
        const current = account.docs.get(key);
        if (current !== undefined && current.revision !== item.baseRevision) {
          conflicts.push(current);
          continue;
        }
        account.revision++;
        account.docs.set(key, { type: item.type, id: item.id, revision: account.revision, payload: item.payload });
        accepted.push({ type: item.type, id: item.id, revision: account.revision });
      }
      return { accepted, conflicts };
    },
  };

  /** Run a service call as a promise, so a thrown port error becomes a rejection. */
  const call = async <T>(fn: () => T): Promise<T> => fn();

  return {
    service,
    documents: (accountId) => [...(accounts.get(accountId)?.docs.values() ?? [])].sort((a, b) => a.revision - b.revision),
    transport: (secret) => ({
      registerDevice: (label) => call(() => service.register(secret, label)),
      requestPairCode: () => call(() => service.pairCode(secret)),
      redeemPairCode: (code, label) => call(() => service.pair(secret, code, label)),
      listDevices: () => call(() => service.devices(secret)),
      revokeDevice: (id) =>
        call(() => {
          service.revoke(secret, id);
        }),
      deleteAccount: () => call(() => service.deleteAccount(secret)),
      pull: (watermark) => call(() => service.pull(secret, watermark)),
      push: (items) => call(() => service.push(secret, items)),
    }),
  };
};

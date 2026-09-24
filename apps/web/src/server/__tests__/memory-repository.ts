import type { PushResult, SyncDocument } from "@palier/app";

import type { DeviceRecord, SyncRepository } from "../repository";

/**
 * `SyncRepository` in memory, for the fast lane's handler tests. It is held to the same
 * `syncRepositoryContract` as the Drizzle repository, which runs on PGlite in the
 * integration lane (implementation-plan.md §6.5), so the two cannot quietly disagree.
 * Test-only, so it lives under `__tests__`, outside the build and coverage.
 */
export const memorySyncRepository = (): SyncRepository & { readonly rateRows: () => number } => {
  type Account = { revision: number; docs: Map<string, SyncDocument> };
  const accounts = new Map<string, Account>();
  const devices = new Map<string, DeviceRecord & { hash: string }>();
  const codes = new Map<string, { accountId: string; expiresAt: string; usedAt: string | null }>();
  const rates = new Map<string, { windowStart: string; count: number }>();
  let n = 0;
  const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

  const byHash = (hash: string) => [...devices.values()].find((d) => d.hash === hash);
  const insertDevice = (accountId: string, device: { hash: string; label: string; at: string }) => {
    const id = uuid();
    devices.set(id, { id, accountId, label: device.label, lastSeenAt: device.at, revokedAt: null, hash: device.hash });
    return id;
  };
  const deleteByHash = (hash: string) => {
    const old = byHash(hash);
    if (old !== undefined) devices.delete(old.id);
    return old;
  };
  const deleteAccount = (accountId: string) => {
    accounts.delete(accountId);
    for (const [id, d] of devices) if (d.accountId === accountId) devices.delete(id);
    for (const [code, c] of codes) if (c.accountId === accountId) codes.delete(code);
  };
  const strip = ({ hash: _hash, ...device }: DeviceRecord & { hash: string }): DeviceRecord => device;

  return {
    rateRows: () => rates.size,
    deviceBySecretHash: (hash) => {
      const device = byHash(hash);
      return Promise.resolve(device === undefined ? null : strip(device));
    },
    touchDevice: (deviceId, at) => {
      const device = devices.get(deviceId);
      if (device !== undefined) devices.set(deviceId, { ...device, lastSeenAt: at });
      return Promise.resolve();
    },
    createAccount: (device) => {
      deleteByHash(device.hash);
      const accountId = uuid();
      accounts.set(accountId, { revision: 0, docs: new Map() });
      return Promise.resolve({ accountId, deviceId: insertDevice(accountId, device) });
    },
    attachDevice: (accountId, device) => {
      const previous = deleteByHash(device.hash);
      const deviceId = insertDevice(accountId, device);
      if (
        previous !== undefined &&
        previous.accountId !== accountId &&
        ![...devices.values()].some((d) => d.accountId === previous.accountId && d.revokedAt === null)
      ) {
        deleteAccount(previous.accountId);
      }
      return Promise.resolve({ deviceId });
    },
    createPairCode: (accountId, code) => {
      codes.set(code.hash, { accountId, expiresAt: code.expiresAt, usedAt: null });
      return Promise.resolve();
    },
    redeemPairCode: (code) => {
      const offer = codes.get(code.hash);
      if (offer === undefined || offer.usedAt !== null || Date.parse(offer.expiresAt) <= Date.parse(code.at)) {
        return Promise.resolve(null);
      }
      codes.set(code.hash, { ...offer, usedAt: code.at });
      return Promise.resolve(offer.accountId);
    },
    listDevices: (accountId) =>
      Promise.resolve([...devices.values()].filter((d) => d.accountId === accountId && d.revokedAt === null).map(strip)),
    revokeDevice: (accountId, deviceId, at) => {
      const device = devices.get(deviceId);
      if (device === undefined || device.accountId !== accountId || device.revokedAt !== null) return Promise.resolve(false);
      devices.set(deviceId, { ...device, revokedAt: at });
      return Promise.resolve(true);
    },
    deleteAccount: (accountId) => {
      deleteAccount(accountId);
      return Promise.resolve();
    },
    pull: (accountId, watermark, limit) => {
      const newer = [...(accounts.get(accountId)?.docs.values() ?? [])]
        .filter((d) => d.revision > watermark)
        .sort((a, b) => a.revision - b.revision);
      return Promise.resolve({ docs: newer.slice(0, limit), more: newer.length > limit });
    },
    push: (accountId, _deviceId, items) => {
      const account = accounts.get(accountId);
      const accepted: PushResult["accepted"][number][] = [];
      const conflicts: SyncDocument[] = [];
      if (account === undefined) return Promise.resolve({ accepted, conflicts });
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
      return Promise.resolve({ accepted, conflicts });
    },
    hit: (key, windowStart) => {
      const row = rates.get(key);
      const count = row !== undefined && row.windowStart === windowStart ? row.count + 1 : 1;
      rates.set(key, { windowStart, count });
      return Promise.resolve(count);
    },
  };
};

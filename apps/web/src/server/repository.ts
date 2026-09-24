import type { PushItem, PushResult, SyncDocument } from "@palier/app";

/**
 * The sync backend's one door to its database (architecture.md §9.2): **every method
 * that reads or writes progress takes the account id**, and there is no method that
 * lists across accounts. That is the audit the §9.2 text asks for in place of
 * row-level security. There is simply no cross-account read path to misuse.
 *
 * Two implementations, held to one contract (`__tests__/repository.contract.ts`):
 * `drizzleSyncRepository` over Postgres or PGlite, and the in-memory one the fast lane's
 * handler tests use.
 */

export type DeviceRecord = {
  readonly id: string;
  readonly accountId: string;
  readonly label: string;
  readonly lastSeenAt: string;
  readonly revokedAt: string | null;
};

export type SyncRepository = {
  /** The device a secret hash names, live or revoked, or null. */
  deviceBySecretHash: (hash: string) => Promise<DeviceRecord | null>;
  /** Stamp a device's last-seen time (§8.11 "last-seen time"). */
  touchDevice: (deviceId: string, at: string) => Promise<void>;
  /**
   * A new account with this one device on it. Any earlier device row with the same
   * hash — a removed device registering afresh — is replaced.
   */
  createAccount: (device: { hash: string; label: string; at: string }) => Promise<{ accountId: string; deviceId: string }>;
  /**
   * Put the device this hash names on `accountId`, replacing any row it had. An
   * account left with no live device is deleted with it: nothing could ever reach it.
   */
  attachDevice: (accountId: string, device: { hash: string; label: string; at: string }) => Promise<{ deviceId: string }>;
  createPairCode: (accountId: string, code: { hash: string; expiresAt: string }) => Promise<void>;
  /** Spend a code: the account it names, if it exists, is unused and unexpired at `at`; else null. */
  redeemPairCode: (code: { hash: string; at: string }) => Promise<string | null>;
  /** The account's live devices. */
  listDevices: (accountId: string) => Promise<readonly DeviceRecord[]>;
  /** Revoke a device **of this account**; false when the account holds no such live device. */
  revokeDevice: (accountId: string, deviceId: string, at: string) => Promise<boolean>;
  /** Delete the account and, by cascade, its devices, documents and codes. */
  deleteAccount: (accountId: string) => Promise<void>;
  /** Up to `limit` documents newer than `watermark`, in revision order. */
  pull: (accountId: string, watermark: number, limit: number) => Promise<{ docs: readonly SyncDocument[]; more: boolean }>;
  /**
   * Take each item whose base is the current revision (or which is new), stamping the
   * next revision; return the current copy of each that is stale. One transaction, so
   * two devices pushing at once cannot interleave revisions (D69).
   */
  push: (accountId: string, deviceId: string, items: readonly PushItem[], at: string) => Promise<PushResult>;
  /**
   * Count one request against `key` in the window starting `windowStart`, and return
   * the count so far in that window.
   */
  hit: (key: string, windowStart: string) => Promise<number>;
};

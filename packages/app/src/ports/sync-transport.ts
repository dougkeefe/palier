/**
 * The four progress aggregates a sync document can carry (architecture.md §9.4,
 * product-requirements.md §8.11 "what syncs"). Everything else — the API key, audio,
 * transcripts, submissions, the cost ledger — never leaves the device, and has no
 * document type to leave in.
 */
export const SYNC_DOC_TYPES = ["attempt", "schedule", "session", "setting"] as const;
export type SyncDocType = (typeof SYNC_DOC_TYPES)[number];

/** A server-assigned device identifier (architecture.md §9.2 `devices.id`). */
export type DeviceId = string & { readonly __brand: "DeviceId" };
export const deviceId = (value: string): DeviceId => value as DeviceId;

/**
 * One record as the server holds it: the client's own record shape, opaque to the
 * server (§9.2), plus the **revision** the server stamped on its last accepted write.
 * Revisions are per account and strictly increasing, so they double as the pull
 * watermark (progress.md D69, ADR 21).
 */
export type SyncDocument = {
  readonly type: SyncDocType;
  readonly id: string;
  readonly revision: number;
  readonly payload: unknown;
};

/**
 * One record a device offers the server. `baseRevision` is the revision this copy was
 * derived from — the last one the device saw for this document — or null for a record
 * the device has never synced. The server accepts the write only while that revision
 * is still current; otherwise it answers with its own copy, and the *device* merges
 * (D69). That is what lets a box rise after it has synced and still lets the lower box
 * win a genuinely concurrent edit.
 */
export type PushItem = {
  readonly type: SyncDocType;
  readonly id: string;
  readonly baseRevision: number | null;
  readonly payload: unknown;
};

export type PushResult = {
  /** The writes the server took, each with the revision it now carries. */
  readonly accepted: readonly { readonly type: SyncDocType; readonly id: string; readonly revision: number }[];
  /** The server's current copy of every document whose `baseRevision` was stale. */
  readonly conflicts: readonly SyncDocument[];
};

export type PullResult = {
  /** Documents with a revision above the requested watermark, in revision order. */
  readonly docs: readonly SyncDocument[];
  /** The watermark to ask from next time: the last revision returned, or the input. */
  readonly watermark: number;
  /** Whether the server holds more than this page (the §9.4 continuation). */
  readonly more: boolean;
};

/** Who this device is to the sync service, once it has registered (§9.3). */
export type DeviceIdentity = {
  readonly accountId: string;
  readonly deviceId: DeviceId;
};

export type DeviceSummary = {
  readonly id: DeviceId;
  readonly label: string;
  readonly lastSeenAt: string;
  /** True for the device making the request. */
  readonly current: boolean;
};

/**
 * A pairing code (architecture.md §9.3): six characters from an alphabet with no
 * 0/O, 1/I/L look-alikes, so it can be read off one screen and typed into another.
 * Valid for ten minutes and once.
 */
export const PAIR_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const PAIR_CODE_LENGTH = 6;
export const PAIR_CODE_TTL_MS = 10 * 60 * 1000;

/**
 * What a person typed, as a code: upper-cased, spaces and dashes dropped. Null when
 * the result cannot be a code, so a typo is caught before a request is spent on it.
 */
export const normalizePairCode = (typed: string): string | null => {
  const code = typed.toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== PAIR_CODE_LENGTH) return null;
  return [...code].every((c) => PAIR_CODE_ALPHABET.includes(c)) ? code : null;
};

/** The sync service cannot be reached, or declined to answer. Never interrupts study (§11). */
export class SyncUnavailableError extends Error {
  constructor(readonly reason: string) {
    super(`Sync is unavailable: ${reason}.`);
    this.name = "SyncUnavailableError";
  }
}

/** The device secret was not accepted: unknown, or the device was removed (§9.3 revocation). */
export class SyncUnauthorizedError extends Error {
  constructor() {
    super("This device is not recognised by the sync service.");
    this.name = "SyncUnauthorizedError";
  }
}

/** A pairing code that is wrong, expired or already used (§9.3: single use, ten minutes). */
export class PairCodeRejectedError extends Error {
  constructor() {
    super("That pairing code is not valid. Codes last ten minutes and work once.");
    this.name = "PairCodeRejectedError";
  }
}

/**
 * The client side of sync (implementation-plan.md §3.3), behind which the HTTP adapter
 * and the in-memory fake sit. Amended from the §3.3 sketch (progress.md D69):
 *
 * - `push` takes `PushItem`s carrying a `baseRevision` each, not documents plus one
 *   watermark, because conflict detection is per document.
 * - `pull` takes a numeric revision watermark, not an ISO instant, so clock skew
 *   between devices cannot hide a write; the watermark is its own cursor.
 * - `registerDevice` and `redeemPairCode` take a friendly `label` (§8.11 "a friendly
 *   label per device"), and the credential is the device's own secret, supplied to the
 *   adapter by the composition root — the server never generates one (D70).
 *
 * Every call presents the device secret. `registerDevice` presents it to create the
 * identity it then names, and is idempotent: the same live secret gets the same identity
 * back, so a retried registration never makes a second account. A secret whose device
 * was removed registers afresh. `redeemPairCode` presents it to join the code's account,
 * moving the device there if it belonged to another. Revoking a device the account does
 * not hold is a no-op: another account's devices are not even visible (tier 11).
 */
export type SyncTransport = {
  push: (items: readonly PushItem[]) => Promise<PushResult>;
  pull: (watermark: number) => Promise<PullResult>;
  registerDevice: (label: string) => Promise<DeviceIdentity>;
  requestPairCode: () => Promise<{ readonly code: string; readonly expiresAt: string }>;
  redeemPairCode: (code: string, label: string) => Promise<DeviceIdentity>;
  listDevices: () => Promise<readonly DeviceSummary[]>;
  revokeDevice: (id: DeviceId) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

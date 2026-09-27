import type {
  CostLedger,
  DeviceId,
  DeviceIdentity,
  DeviceSummary,
  KeyVault,
  SyncStateStore,
  SyncTransport,
  TelemetryStore,
  WritingStore,
  GeneratedItemStore,
} from "../ports/index.js";
import { SyncUnavailableError } from "../ports/index.js";
import type { ProgressStores } from "../sync/records.js";
import { type SyncNowDeps, type SyncNowRequest, type SyncOutcome, syncNow } from "./sync-now.js";
import { wipeData } from "./wipe-data.js";

/**
 * The account half of sync: pairing by code, the device list, the switch, and deleting
 * everything everywhere (product-requirements.md §8.11, architecture.md §9.3, ADR 5).
 * Each is thin orchestration over `SyncTransport` and `SyncStateStore`; the merge and
 * the exchange are `syncNow`'s.
 */

export type SyncAccountDeps = {
  readonly transport: SyncTransport;
  readonly syncState: SyncStateStore;
};

/**
 * Show a pairing code on this device (§9.3: six characters, ten minutes, single use).
 * Asking for one is an explicit request to sync, so a device that has not yet
 * registered — deferred until its first completed session — registers now.
 */
export const requestPairCode = async (
  request: { readonly label: string },
  deps: SyncAccountDeps,
): Promise<{ readonly code: string; readonly expiresAt: string }> => {
  const state = await deps.syncState.state();
  if (state.identity === null) {
    await deps.syncState.update({ identity: await deps.transport.registerDevice(request.label) });
  }
  return deps.transport.requestPairCode();
};

/**
 * Join the account another device's code names, then sync (§9.3 "adding a second
 * device"). The ledger is forgotten first: nothing this device agreed with its old
 * account holds in the new one, so its whole local set is offered and merged with
 * what the account already has. Local progress is never discarded by pairing.
 *
 * **A redeem that fails in transit may still have happened** — the server moved this
 * device to the new account and only its answer was lost — or may never have reached the
 * server at all, which is far more common (offline, rate-limited, a 5xx). The device
 * cannot tell which, so it changes nothing but a flag, `accountUnconfirmed`, and its next
 * sync asks the server: registration is idempotent per secret, so the answer is the
 * account the device is really in, and the ledger resets only if that changed (progress.md
 * D74, found by the sync simulator). Resetting on every failure would roll back other
 * devices' newer work, since every record would then merge as a concurrent edit.
 */
export const pairDevice = async (
  request: SyncNowRequest & { readonly code: string },
  deps: SyncNowDeps,
): Promise<SyncOutcome> => {
  let identity: DeviceIdentity;
  try {
    identity = await deps.transport.redeemPairCode(request.code, request.label);
  } catch (error) {
    if (error instanceof SyncUnavailableError) await deps.syncState.update({ accountUnconfirmed: true });
    throw error;
  }
  await deps.syncState.resetLedger();
  await deps.syncState.update({ identity, enabled: true, accountUnconfirmed: false });
  return syncNow(request, deps);
};

/** The account's devices, or none for a device that has not registered. */
export const listDevices = async (deps: SyncAccountDeps): Promise<readonly DeviceSummary[]> => {
  const state = await deps.syncState.state();
  return state.identity === null ? [] : deps.transport.listDevices();
};

/**
 * Remove a device from the account (§9.3 revocation: its secret stops working on the
 * next request). Removing *this* device means leaving the account, so it forgets its
 * identity and ledger and turns sync off rather than re-registering on its own.
 */
export const removeDevice = async (request: { readonly id: DeviceId }, deps: SyncAccountDeps): Promise<void> => {
  const state = await deps.syncState.state();
  await deps.transport.revokeDevice(request.id);
  if (state.identity?.deviceId === request.id) {
    await deps.syncState.resetLedger();
    await deps.syncState.update({ identity: null, enabled: false });
  }
};

/**
 * The sync switch (§8.11, architecture.md §9.4). Off stops sync at once and, if asked,
 * deletes what the server holds — every device's copy — and forgets the identity. On
 * forgets the ledger, so the next sync pushes the full local set.
 */
export const setSyncEnabled = async (
  request: { readonly enabled: boolean; readonly deleteFromServer?: boolean },
  deps: SyncAccountDeps,
): Promise<void> => {
  if (request.enabled) {
    await deps.syncState.resetLedger();
    await deps.syncState.update({ enabled: true });
    return;
  }
  await deps.syncState.update({ enabled: false });
  if (request.deleteFromServer === true && (await deps.syncState.state()).identity !== null) {
    await deps.transport.deleteAccount();
    await deps.syncState.resetLedger();
    await deps.syncState.update({ identity: null });
  }
};

export type DeleteEverywhereDeps = ProgressStores &
  SyncAccountDeps & {
    readonly vault: KeyVault;
    readonly telemetry: TelemetryStore;
    readonly ledger: CostLedger;
    readonly writing: WritingStore;
    readonly generated: GeneratedItemStore;
  };

/**
 * Delete everything, on the server and here, in one action [R11] (§8.11 danger zone).
 * The server goes first: if it cannot be reached this throws before anything local is
 * touched, so the user is never told "deleted everywhere" while a copy survives. Then
 * `wipeData` (which keeps the device secret, D50) and the sync bookkeeping.
 */
export const deleteEverywhere = async (deps: DeleteEverywhereDeps): Promise<void> => {
  if ((await deps.syncState.state()).identity !== null) await deps.transport.deleteAccount();
  await wipeData(deps);
  await deps.syncState.clear();
};

import type { SyncOutcome, SyncState } from "@palier/app";

/**
 * What the sync UI shows (product-requirements.md §8.11, §14): the header's quiet
 * indicator, and the settings page's status line with the reason sync is not running.
 * Pure, so the runner component holds only effects.
 *
 * The header's four states are §8.11's — synced, syncing, offline, off — plus `on`: sync
 * is switched on but this device has nothing on the server yet, because registration
 * waits for the first completed session (architecture.md §9.3). Calling that "synced"
 * would claim a copy that does not exist.
 */
export type SyncIndicator = "off" | "on" | "syncing" | "synced" | "offline";

/** Why sync is not running, for the status line. */
export type SyncReason = "offline" | "unavailable" | "removed" | null;

export type SyncView = {
  readonly indicator: SyncIndicator;
  readonly reason: SyncReason;
  readonly lastSyncedAt: string | null;
  readonly paired: boolean;
};

export const INITIAL_VIEW: SyncView = { indicator: "on", reason: null, lastSyncedAt: null, paired: false };

/** The view a stored state implies, before anything has run this page load. */
export const viewFromState = (state: SyncState, online: boolean): SyncView => {
  const base = { lastSyncedAt: state.lastSyncedAt, paired: state.identity !== null };
  if (!state.enabled) return { ...base, indicator: "off", reason: null };
  if (!online) return { ...base, indicator: "offline", reason: "offline" };
  return { ...base, indicator: state.lastSyncedAt === null ? "on" : "synced", reason: null };
};

export const viewSyncing = (view: SyncView): SyncView => ({ ...view, indicator: "syncing", reason: null });

/** The view after one exchange. An unreachable service reads as offline in the header (§14). */
export const viewFromOutcome = (outcome: SyncOutcome, before: SyncView, online: boolean): SyncView => {
  switch (outcome.status) {
    case "synced":
      return { indicator: "synced", reason: null, lastSyncedAt: outcome.at, paired: true };
    case "waiting":
      return { ...before, indicator: "on", reason: null };
    case "off":
      return { ...before, indicator: "off", reason: null };
    case "removed":
      return { ...before, indicator: "off", reason: "removed", paired: false };
    case "unavailable":
      return { ...before, indicator: "offline", reason: online ? "unavailable" : "offline" };
  }
};

/** Which status-line message the settings page shows (§8.11: "the reason it is not syncing"). */
export type StatusLine = "statusOff" | "statusRemoved" | "statusOffline" | "statusUnavailable" | "statusSyncing" | "statusSynced" | "statusNever";

export const statusLine = (view: SyncView): StatusLine => {
  if (view.reason === "removed") return "statusRemoved";
  if (view.indicator === "off") return "statusOff";
  if (view.reason === "offline") return "statusOffline";
  if (view.reason === "unavailable") return "statusUnavailable";
  if (view.indicator === "syncing") return "statusSyncing";
  return view.lastSyncedAt === null ? "statusNever" : "statusSynced";
};

/**
 * Why linking this device failed, from the thrown error. The names are the port's error
 * classes; they are compared by name, as the data pane does, because the error crossed
 * the lazily-loaded container's chunk boundary.
 */
export const joinFailure = (error: unknown): "joinRejected" | "unavailable" =>
  error instanceof Error && error.name === "PairCodeRejectedError" ? "joinRejected" : "unavailable";

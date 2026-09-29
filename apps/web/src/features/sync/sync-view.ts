import { PAIR_CODE_TTL_MS, type SyncOutcome, type SyncState } from "@palier/app";

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

/**
 * When a code that has just arrived lapses, by this device's clock: its ten minutes counted from
 * now. Not the server's `expiresAt`, which is on the server's clock: a device a few minutes out
 * would count down the wrong ten minutes, and the screen and the server would disagree on when
 * it lapsed. Counting from arrival is out only by the request's own time, and in the safe
 * direction, since the server started its ten minutes first.
 */
export const codeLapsesAt = (arrivedAt: string, ttlMs: number = PAIR_CODE_TTL_MS): string =>
  new Date(Date.parse(arrivedAt) + ttlMs).toISOString();

/**
 * A shown pair code, against the time (product-requirements.md §8.11: "valid ten minutes").
 * `live` with the whole minutes left, rounded up, so the last minute reads "1 minute" and
 * never "0"; `expired` from the moment it lapses, when the screen takes the code away,
 * since the server would refuse it (architecture.md §9.3), and offers a new one.
 */
export type PairCodeView = { readonly status: "live"; readonly minutesLeft: number } | { readonly status: "expired" };

const MINUTE_MS = 60_000;

export const pairCodeView = (expiresAt: string, now: string): PairCodeView => {
  const leftMs = Date.parse(expiresAt) - Date.parse(now);
  return leftMs > 0 ? { status: "live", minutesLeft: Math.ceil(leftMs / MINUTE_MS) } : { status: "expired" };
};

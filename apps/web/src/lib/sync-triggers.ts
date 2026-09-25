/**
 * When the app syncs (architecture.md §9.4): "on app focus if more than 5 minutes have
 * elapsed, debounced 30 seconds after a session completes, on demand from settings, and
 * on reconnect after offline". App load counts as a focus. The decision is pure, so the
 * component that listens for the events holds only the wiring.
 */
export type SyncTrigger = "load" | "focus" | "session-complete" | "reconnect" | "demand";

export const FOCUS_INTERVAL_MS = 5 * 60 * 1000;
export const AFTER_SESSION_DELAY_MS = 30 * 1000;

/** Whether a trigger should start a sync, given when the last one started (null: never). */
export const shouldSync = (trigger: SyncTrigger, now: number, lastStartedAt: number | null): boolean => {
  if (trigger === "load" || trigger === "focus") return lastStartedAt === null || now - lastStartedAt > FOCUS_INTERVAL_MS;
  return true;
};

/** How long to wait before syncing: a completed session is debounced, everything else is at once. */
export const delayFor = (trigger: SyncTrigger): number => (trigger === "session-complete" ? AFTER_SESSION_DELAY_MS : 0);

/**
 * Whether a trigger that arrives while a sync is already running earns one more run
 * once it ends. Only a demand does: the person asked for their other devices' latest,
 * and the running exchange may have pulled before that existed. The rest are dropped,
 * because the running exchange already does what they would.
 */
export const runsAgainAfterCurrent = (trigger: SyncTrigger): boolean => trigger === "demand";

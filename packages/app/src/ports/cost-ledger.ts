import type { AiFeature, SessionId } from "@palier/domain";

import type { ISO } from "./time.js";

/**
 * One AI call's cost, as the ledger records it (architecture.md §8.6, progress.md D101):
 * the tokens the provider reported and, when `pricing.json` prices the model, the dollars.
 * `costUsd` is `null` when the model is unpriced, so the meter can say its total is a floor.
 * `sessionId` names the spoken session a call was made for (progress.md D125), so a session's
 * cost is its own rows, exactly, rather than a guess from a time window. Absent for a call
 * that belongs to no session, and on every row written before Phase 5 Slice 3.
 */
export type CostEntry = {
  readonly ts: ISO;
  readonly feature: AiFeature;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costUsd: number | null;
  readonly sessionId?: SessionId | undefined;
};

/**
 * The local cost ledger, a port §3.3 did not name (D101). **Device-local: never synced
 * and never exported, under any setting** (architecture.md §9.4), like `TelemetryStore`,
 * so no sync collector reads it and `exportData` does not take it. `wipeData` and
 * `deleteEverywhere` clear it.
 *
 * - `append` adds one entry. The ledger is append-only: nothing edits an entry.
 * - `since` returns every entry at or after `from`, oldest first, for the meter's month
 *   and week. It has no upper bound, because money spent is spent.
 * - `clear` empties it.
 *
 * It has no `all()`: D61 added that for export, and the ledger is never exported.
 */
export type CostLedger = {
  append: (entry: CostEntry) => Promise<void>;
  since: (from: ISO) => Promise<readonly CostEntry[]>;
  clear: () => Promise<void>;
};

import type { CostEntry, CostLedger } from "@palier/app";
import { AI_FEATURES } from "@palier/domain";

import type { CostLedgerRow, PalierDb } from "./db.js";

const isCount = (value: unknown): boolean => typeof value === "number" && Number.isFinite(value) && value >= 0;

/**
 * The structure check at the edge (D55's approach): a row that is not a whole entry, such as
 * the placeholder a v1 device may hold (`{ ts, feature: "none" }`), reads as nothing rather
 * than as a spend the meter would add up.
 */
const isEntry = (row: CostLedgerRow): boolean =>
  typeof row.ts === "string" &&
  !Number.isNaN(Date.parse(row.ts)) &&
  (AI_FEATURES as readonly unknown[]).includes(row.feature) &&
  typeof row.model === "string" &&
  isCount(row.inputTokens) &&
  isCount(row.outputTokens) &&
  (row.costUsd === null || isCount(row.costUsd));

const entryOf = ({ ts, feature, model, inputTokens, outputTokens, costUsd }: CostLedgerRow): CostEntry => ({
  ts,
  feature,
  model,
  inputTokens,
  outputTokens,
  costUsd,
});

/**
 * The cost ledger over v1's `costLedger` table (progress.md D101). Device-local: no sync
 * collector reads this table, and no export carries it.
 *
 * `since` walks the `ts` index, which orders by the ISO string and then by the `++id` key,
 * so entries come back oldest first and two at the same instant in the order they were
 * appended. Every `ts` is a UTC `toISOString()` from the clock, so string order is time order.
 */
export const dexieCostLedger = (db: PalierDb): CostLedger => ({
  append: async (entry) => {
    await db.costLedger.add(entryOf(entry));
  },
  since: async (from) => (await db.costLedger.where("ts").aboveOrEqual(from).toArray()).filter(isEntry).map(entryOf),
  clear: () => db.costLedger.clear(),
});

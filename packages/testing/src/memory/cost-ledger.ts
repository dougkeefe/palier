import type { CostEntry, CostLedger } from "@palier/app";

/**
 * The device-local cost ledger, in memory (progress.md D101). Entries come back oldest
 * first; two at the same instant keep the order they were appended in, as Dexie's `++id`
 * does.
 */
export const memoryCostLedger = (): CostLedger => {
  let rows: CostEntry[] = [];
  return {
    append: (entry) => {
      rows.push(entry);
      return Promise.resolve();
    },
    since: (from) => {
      const start = Date.parse(from);
      return Promise.resolve(
        rows.filter((row) => Date.parse(row.ts) >= start).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts)),
      );
    },
    clear: () => {
      rows = [];
      return Promise.resolve();
    },
  };
};

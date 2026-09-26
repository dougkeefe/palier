import type { CostEntry, CostLedger } from "../../ports/index.js";

/**
 * A local cost ledger for the use-case tests (progress.md D37). `since` keeps the port's
 * rules: at or after `from`, oldest first.
 */
export const costLedger = (
  seed: readonly CostEntry[] = [],
): CostLedger & { readonly entries: () => readonly CostEntry[] } => {
  let rows = [...seed];
  return {
    append: (entry) => {
      rows.push(entry);
      return Promise.resolve();
    },
    since: (from) =>
      Promise.resolve(
        rows
          .filter((row) => Date.parse(row.ts) >= Date.parse(from))
          .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts)),
      ),
    clear: () => {
      rows = [];
      return Promise.resolve();
    },
    entries: () => rows,
  };
};

export const aCostEntry = (over: Partial<CostEntry> = {}): CostEntry => ({
  ts: "2026-09-26T10:00:00.000Z",
  feature: "writing-feedback",
  model: "m",
  inputTokens: 100,
  outputTokens: 100,
  costUsd: 0.01,
  ...over,
});

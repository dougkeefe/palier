import type { Item, ItemStatisticsReport } from "@palier/domain";

import type { CarriedBank } from "./run.js";

/**
 * Apply the item-statistics report to the bank being carried forward (progress.md
 * D94). This is where a retirement takes effect: the monthly job's report, once its
 * pull request is merged, is read by the next bank build.
 *
 * - **Every item the report judged gains its `stats`**, observed and never authored
 *   (architecture.md 5.1), stamped with the report's date. That is what the readiness
 *   card's "trusted statistics" disclosure counts.
 * - **An item with a reason is retired.** It stays in the bank, because users hold
 *   attempts and schedule entries on its id (architecture.md 5.5), but the selector
 *   serves only published items and the form stage skips a retired one.
 * - **Retirement is one way.** The report gives no verdict for an item already
 *   retired, so nothing here ever publishes one again.
 *
 * A published bank version is immutable, so the effect lands at the next version.
 */
export const applyStatistics = (carried: CarriedBank, report: ItemStatisticsReport | null): CarriedBank => {
  if (report === null) return carried;
  const verdicts = new Map(report.verdicts.map((verdict) => [verdict.itemId, verdict]));
  return {
    ...carried,
    items: carried.items.map((item): Item => {
      const verdict = verdicts.get(item.id);
      if (verdict === undefined) return item;
      return {
        ...item,
        stats: {
          responses: verdict.responses,
          proportionCorrect: verdict.proportionCorrect,
          pointBiserial: verdict.pointBiserial,
          updatedAt: report.generatedAt,
        },
        ...(verdict.reasons.length > 0 ? { status: "retired" as const } : {}),
      };
    }),
  };
};

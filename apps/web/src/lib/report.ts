/**
 * Item reporting (product-requirements.md §13.0): "a flag control ... offers four
 * reasons ... and files a GitHub issue with the item id." The zero-backend path is a
 * prefilled new-issue URL: nothing is sent anywhere until the user submits the issue
 * themselves, on GitHub, as themselves.
 */
export const REPOSITORY_URL = "https://github.com/dougkeefe/palier";

/** §13.0's four reasons, in its order. */
export const REPORT_REASONS = ["key-wrong", "multiple-answers", "french-off", "unclear"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ItemReport = {
  readonly itemId: string;
  readonly reason: ReportReason;
  /** The reason as the user read it, so the issue is readable without a lookup table. */
  readonly reasonLabel: string;
  /** The bank version the item came from, so a fixed item is traceable. */
  readonly bankVersion: number | null;
};

/**
 * The prefilled issue. The title carries the reason code and the item id, which is
 * what §13.0's retirement rule counts ("three user reports on the same reason code");
 * the `item-report` label lets the queue be filtered.
 */
export const reportIssueUrl = (report: ItemReport): string => {
  const title = `Item report: ${report.reason} (${report.itemId})`;
  const body = [
    `**Item:** \`${report.itemId}\``,
    `**Reason:** ${report.reasonLabel} (\`${report.reason}\`)`,
    `**Bank version:** ${report.bankVersion === null ? "unknown" : String(report.bankVersion)}`,
    "",
    "**What looks wrong (optional):**",
    "",
  ].join("\n");
  const params = new URLSearchParams({ title, body, labels: `item-report,reason:${report.reason}` });
  return `${REPOSITORY_URL}/issues/new?${params.toString()}`;
};

/** `palier-export-YYYY-MM-DD.json`, dated by the export's own timestamp. */
export const exportFileName = (exportedAt: string): string => `palier-export-${exportedAt.slice(0, 10)}.json`;

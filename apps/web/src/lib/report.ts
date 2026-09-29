import type { Item } from "@palier/domain";

/**
 * Item reporting (product-requirements.md §13.0): "a flag control ... offers four
 * reasons ... and files a GitHub issue with the item id." The zero-backend path is a
 * prefilled new-issue URL: nothing is sent anywhere until the user submits the issue
 * themselves, on GitHub, as themselves.
 */
export const REPOSITORY_URL = "https://github.com/dougkeefe/palier";

/** The contribution guide, linked from the about page (progress.md D145). */
export const CONTRIBUTING_URL = `${REPOSITORY_URL}/blob/main/CONTRIBUTING.md`;

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

/**
 * A prefilled issue for an error screen (architecture.md §16, progress.md D141). It carries
 * the diagnostic bundle exactly as the screen showed it, which holds no free text by
 * construction (`lib/diagnostic.ts`), and asks the user what they were doing, which they
 * write themselves on GitHub. Nothing leaves the device until they submit it.
 */
export const errorIssueUrl = (report: { readonly errorName: string; readonly bundle: string }): string => {
  const title = `Error report: ${report.errorName}`;
  const body = ["```", report.bundle, "```", "", "**What were you doing when it happened (optional):**", ""].join("\n");
  const params = new URLSearchParams({ title, body, labels: "error-report" });
  return `${REPOSITORY_URL}/issues/new?${params.toString()}`;
};

/**
 * The one-tap contribution for a runtime-generated item (architecture.md §8.3, progress.md
 * D111): a prefilled GitHub issue carrying the whole item, so a maintainer can put it through
 * the factory's gates. It has no bank version, because it never came from the bank, and it says
 * what the item is: generated just now, reviewed by one automated check, not calibrated.
 * Nothing leaves the device until the user submits the issue themselves.
 */
export const contributeIssueUrl = (item: Item): string => {
  const title = `Item contribution: ${item.subSkill}, band ${item.targetBand} (${item.type})`;
  const contribution = {
    type: item.type,
    lang: item.lang,
    stem: item.stem,
    ...(item.blankIndex === undefined ? {} : { blankIndex: item.blankIndex }),
    options: item.options,
    key: item.key,
    explanation: item.explanation,
    subSkill: item.subSkill,
    targetBand: item.targetBand,
    topic: item.topic,
    provenance: item.provenance,
  };
  const body = [
    "Generated in Palier on the contributor's own key, and reviewed by one automated check. Not reviewed by a person, not calibrated.",
    "",
    "```json",
    JSON.stringify(contribution, null, 2),
    "```",
    "",
    "**Why it is worth adding (optional):**",
    "",
  ].join("\n");
  const params = new URLSearchParams({ title, body, labels: "item-contribution" });
  return `${REPOSITORY_URL}/issues/new?${params.toString()}`;
};

/** `palier-export-YYYY-MM-DD.json`, dated by the export's own timestamp. */
export const exportFileName = (exportedAt: string): string => `palier-export-${exportedAt.slice(0, 10)}.json`;

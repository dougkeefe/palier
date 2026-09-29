import { planBytesFrom, queryWithPostgres, reportText, runRetention } from "../src/server/retention-job.ts";

/**
 * The daily retention job (architecture.md §9.4, progress.md D138–D139): delete accounts
 * inactive for 180 days, tombstones over 90 days old, expired pair codes and stale
 * rate-limit rows, then read the database's size against `PLAN_STORAGE_MB`.
 *
 * `--dry-run` counts and deletes nothing. The run exits 1 at 60% of the plan's storage or
 * over, which fails the workflow, and a failed scheduled run is what notifies.
 *
 * Runs under Node's type stripping, as `item-statistics.mjs` does, so no build step.
 */
const url = process.env.DATABASE_URL;
if (url === undefined || url === "") {
  console.error("retention: DATABASE_URL is not set, so there is nothing to retain.");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const planBytes = planBytesFrom(process.env.PLAN_STORAGE_MB);
const { query, end } = await queryWithPostgres(url);
let report;
try {
  report = await runRetention({ query, now: new Date(), planBytes, dryRun });
} finally {
  await end();
}

console.log(reportText(report));
if (report.verdict === "aggregate" || report.verdict === "upgrade") {
  console.error(`::error::Database storage needs attention (${report.verdict}); see docs/deploy.md, "The retention job".`);
  process.exit(1);
}

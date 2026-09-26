import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseExamProfileOrThrow } from "@palier/domain";

import { readEventsWithPostgres, reportText, runItemStatistics } from "../src/server/item-statistics-job.ts";
import { bankVersionFrom } from "./prepare-public.mjs";

/**
 * The monthly item-statistics job (progress.md D94): read every telemetry event from
 * `DATABASE_URL`, judge each item against the profile's retirement rules over the bank
 * this build reads, and write `content/factory/item-statistics.json`. The workflow opens
 * the change as a pull request; nothing here retires anything by itself.
 *
 * Runs under Node's type stripping, as `db-migrate.mjs` does, so no build step.
 */
const url = process.env.DATABASE_URL;
if (url === undefined || url === "") {
  console.error("item-statistics: DATABASE_URL is not set, so there are no events to read.");
  process.exit(1);
}

const WEB_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
// Resolve content/ through @palier/content's exports map (ADR 18), not a relative path.
const profilePath = require.resolve("@palier/content/profiles/psc-sle.json");
const contentDir = dirname(dirname(profilePath));
const profile = parseExamProfileOrThrow(JSON.parse(await readFile(profilePath, "utf8")));
const bankVersion = bankVersionFrom(await readFile(join(WEB_ROOT, "src/lib/container.ts"), "utf8"));

const report = await runItemStatistics({
  readEvents: () => readEventsWithPostgres(url),
  contentDir,
  bankVersion,
  profile,
  now: () => new Date(),
});

const out = join(contentDir, "factory", "item-statistics.json");
await writeFile(out, reportText(report));
const retired = report.verdicts.filter((verdict) => verdict.reasons.length > 0);
console.log(
  `item-statistics: ${String(report.events)} events, ${String(report.verdicts.length)} items judged, ` +
    `${String(retired.length)} to retire → ${out}`,
);

#!/usr/bin/env node
// Bundle-size budget gate (architecture.md §13: "Initial JS gzipped < 180 KB").
//
// Measures the shared first-load JavaScript every route pays: the App Router
// runtime (`rootMainFiles`) plus polyfills, read from `.next/build-manifest.json`
// and gzipped. For this RSC-first shell the per-route chunks are negligible, so
// this shared baseline is the dominant term of "initial JS"; when a future
// route ships a large client island, extend this to add that route's own chunks
// (they land in `.next/app-build-manifest.json` under the webpack builder).
//
// Zero dependencies: Node's own zlib does the gzip, matching what a CDN serves.

import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// 180 KB is the budget (architecture.md §13). PALIER_BUNDLE_BUDGET_KB overrides
// it, which is how the gate is proven to bite without a real regression.
const BUDGET_BYTES = (Number(process.env.PALIER_BUNDLE_BUDGET_KB) || 180) * 1024;

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = join(webRoot, ".next");

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(nextDir, "build-manifest.json"), "utf8"));
} catch {
  console.error(
    "check-bundle-size: .next/build-manifest.json not found. Run `pnpm --filter @palier/web build` first.",
  );
  process.exit(1);
}

const files = [
  ...(manifest.rootMainFiles ?? []),
  ...(manifest.polyfillFiles ?? []),
];

if (files.length === 0) {
  console.error("check-bundle-size: no rootMainFiles in the manifest — the measurement would be vacuous.");
  process.exit(1);
}

let total = 0;
const rows = files.map((rel) => {
  const bytes = gzipSync(readFileSync(join(nextDir, rel))).length;
  total += bytes;
  return { rel, bytes };
});

for (const { rel, bytes } of rows.sort((a, b) => b.bytes - a.bytes)) {
  console.log(`  ${(bytes / 1024).toFixed(1).padStart(7)} KB  ${rel}`);
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`  ${"-".repeat(30)}`);
console.log(`  shared first-load JS (gzipped): ${kb(total)} of ${kb(BUDGET_BYTES)}`);

if (total > BUDGET_BYTES) {
  console.error(
    `\ncheck-bundle-size: over budget by ${kb(total - BUDGET_BYTES)} (architecture.md §13). ` +
      `Trim the client bundle rather than raising the number.`,
  );
  process.exit(1);
}

console.log("check-bundle-size: within budget.");

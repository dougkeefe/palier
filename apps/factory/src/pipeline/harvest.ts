import type { Licence } from "@palier/domain";

import type { HarvestResult, SourceCandidate, SourceRecord, SourceRejection } from "../lib/types.js";

/**
 * Stage 1 — harvest (content-factory.md §4.1). Applies the licence gate to a
 * committed seed of public GC sources: anything whose terms are unclear is
 * rejected rather than used cautiously, because the cost of rejection is one
 * more search and the cost of being wrong is a takedown. The output queue is
 * committed and reviewable.
 *
 * Live discovery/scraping is deliberately out of Phase-1 scope (D-log): the seed
 * is curated by a maintainer, which keeps the queue deterministic and the whole
 * pipeline CI-reproducible. `retrievedAt` is supplied (not read from the clock)
 * for the same reason.
 */

/** Licences whose terms clearly permit derivative use. `other` is "unclear". */
const PERMITTED_LICENCES: ReadonlySet<Licence> = new Set<Licence>([
  "OGL-Canada-2.0",
  "canada.ca-non-commercial",
  "public-domain",
]);

export const harvest = (
  candidates: readonly SourceCandidate[],
  retrievedAt: string,
): HarvestResult => {
  const queue: SourceRecord[] = [];
  const rejected: SourceRejection[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (seen.has(candidate.url)) {
      rejected.push({ url: candidate.url, reason: "duplicate source url" });
      continue;
    }
    seen.add(candidate.url);

    if (!PERMITTED_LICENCES.has(candidate.licence)) {
      rejected.push({
        url: candidate.url,
        reason: `licence "${candidate.licence}" does not clearly permit derivative use`,
      });
      continue;
    }
    queue.push({ ...candidate, retrievedAt });
  }

  return { queue, rejected };
};

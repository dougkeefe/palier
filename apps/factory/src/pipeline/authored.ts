import type { ExamProfile, Item, Passage } from "@palier/domain";

import { canonicalStringify } from "../lib/json.js";
import { readability, wordCount } from "../lib/text.js";
import type { OralSessionPlan } from "../lib/types.js";
import { checkPassage } from "./passages.js";
import { withAuthoredScenarios } from "./run.js";
import { perItemReasons, validateBank } from "./validate.js";
import type { AuthoredContent, CarriedBank } from "./run.js";

/**
 * The checks a contribution under `content/authored/` must pass before it merges
 * (content-factory.md §5), so a contributor hears about a problem from `pnpm verify`, or
 * from `palier-factory check-authored`, rather than finding the item missing from the next
 * bank. They run the same per-item rules stage 5 does, the domain's `validate()` among
 * them, hold a passage to the drafted passages' rules and its numbers to the body (D203),
 * hold a scenario to the scenario stage's, flag two stems stage 5 would call near-duplicates,
 * and add what only an intake can see: the origin, the passage credit, and ids that collide. Passing them is not acceptance: the review at
 * the next bank build still decides.
 */

/**
 * What a published record may have gained in the bank since it was contributed: a
 * retirement and its statistics (D94). Anything else differing means a different item.
 */
const asContributed = (record: Item | Passage): string => {
  const { status: _status, ...rest } = record as Item;
  const { stats: _stats, ...contributed } = rest;
  return canonicalStringify(contributed);
};

export const authoredIssues = (
  authored: AuthoredContent,
  bank: Pick<CarriedBank, "items" | "passages">,
  profile: ExamProfile,
  oralPlan?: OralSessionPlan,
): string[] => {
  const issues: string[] = [];
  const inBank = new Map<string, Item | Passage>([
    ...bank.items.map((i) => [i.id, i] as const),
    ...bank.passages.map((p) => [p.id, p] as const),
  ]);
  const seen = new Set<string>();
  const passageIds = new Set<string>([...bank.passages.map((p) => p.id), ...authored.passages.map((p) => p.id)]);

  // A contribution stays in content/authored/ once published, as the source the bank is
  // rebuilt from (D207), so the bank holding its id is expected. Holding a *different*
  // record under it is a collision.
  const claim = (kind: string, record: Item | Passage): void => {
    const published = inBank.get(record.id);
    if (published !== undefined && asContributed(published) !== asContributed(record)) {
      issues.push(`${kind} ${record.id}: the id is already in the committed bank; choose another`);
    }
    if (seen.has(record.id)) issues.push(`${kind} ${record.id}: two contributions use the same id`);
    seen.add(record.id);
  };

  for (const item of authored.items) {
    claim("item", item);
    if (item.provenance.origin !== "authored") {
      issues.push(`item ${item.id}: provenance.origin is "${item.provenance.origin}", and a contribution is "authored"`);
    }
    for (const reason of perItemReasons(item, profile)) issues.push(`item ${item.id}: ${reason}`);
    if (item.passageId !== undefined && !passageIds.has(item.passageId)) {
      issues.push(`item ${item.id}: passage ${item.passageId} is neither in the contribution nor in the bank`);
    }
  }

  // Stage 5 keeps the first of two near-identical stems and drops the second; better that the
  // contributor hears it now, while the second can still be rewritten rather than lost.
  for (const { a, b, similarity } of validateBank(authored.items, [], profile).nearDuplicates) {
    issues.push(`item ${a}: near-duplicate of ${b} (similarity ${similarity.toFixed(2)}); reword its stem`);
  }

  for (const passage of authored.passages) {
    claim("passage", passage);
    if (passage.source.contributor === undefined) {
      issues.push(`passage ${passage.id}: names no contributor in source.contributor`);
    }
    for (const reason of checkPassage(passage)) issues.push(`passage ${passage.id}: ${reason}`);
    const counted = wordCount(passage.body);
    if (passage.wordCount !== counted) {
      issues.push(`passage ${passage.id}: wordCount is ${String(passage.wordCount)}, and the body has ${String(counted)}`);
    }
    const measured = readability(passage.body);
    if (canonicalStringify(passage.readability) !== canonicalStringify(measured)) {
      issues.push(`passage ${passage.id}: readability should be ${JSON.stringify(measured)}`);
    }
  }

  const scenarios = authored.scenarios ?? [];
  if (scenarios.length > 0) {
    const checked = withAuthoredScenarios({ scenarios: [], rejected: [], failedCalls: 0 }, scenarios, oralPlan);
    for (const { id, reasons } of checked.rejected) issues.push(`scenario ${id}: ${reasons.join("; ")}`);
  }

  return issues;
};

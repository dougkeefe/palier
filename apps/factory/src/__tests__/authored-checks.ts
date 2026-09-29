import type { ExamProfile } from "@palier/domain";

import { perItemReasons } from "../pipeline/validate.js";
import type { AuthoredContent, CarriedBank } from "../pipeline/run.js";

/**
 * The checks a contribution under `content/authored/` must pass before it merges
 * (content-factory.md §5), so a contributor hears about a problem from `pnpm verify` rather
 * than finding the item missing from the next bank. They run the same per-item rules stage 5
 * does, the domain's `validate()` among them, and add what only an intake can see: the
 * origin, the passage credit, and ids that collide. Passing them is not acceptance: the
 * model review at the next bank build still decides.
 */
export const authoredIssues = (
  authored: AuthoredContent,
  bank: Pick<CarriedBank, "items" | "passages">,
  profile: ExamProfile,
): string[] => {
  const issues: string[] = [];
  const bankIds = new Set<string>([...bank.items.map((i) => i.id), ...bank.passages.map((p) => p.id)]);
  const seen = new Set<string>();
  const passageIds = new Set<string>([...bank.passages.map((p) => p.id), ...authored.passages.map((p) => p.id)]);

  const claim = (kind: string, id: string): void => {
    if (bankIds.has(id)) issues.push(`${kind} ${id}: the id is already in the committed bank; choose another`);
    if (seen.has(id)) issues.push(`${kind} ${id}: two contributions use the same id`);
    seen.add(id);
  };

  for (const item of authored.items) {
    claim("item", item.id);
    if (item.provenance.origin !== "authored") {
      issues.push(`item ${item.id}: provenance.origin is "${item.provenance.origin}", and a contribution is "authored"`);
    }
    for (const reason of perItemReasons(item, profile)) issues.push(`item ${item.id}: ${reason}`);
    if (item.passageId !== undefined && !passageIds.has(item.passageId)) {
      issues.push(`item ${item.id}: passage ${item.passageId} is neither in the contribution nor in the bank`);
    }
  }

  for (const passage of authored.passages) {
    claim("passage", passage.id);
    if (passage.source.contributor === undefined) {
      issues.push(`passage ${passage.id}: names no contributor in source.contributor`);
    }
  }

  return issues;
};

import type { ReviewRequest, ReviewVerdict } from "./ai.js";
import { bandRank } from "./bands.js";
import type { PassageId } from "./ids.js";
import type { Item } from "./item.js";
import type { Passage } from "./passage.js";

/**
 * The adversarial-review gate (content-factory.md §4.4), shared by the factory's
 * stage 4 and the browser's runtime generation (architecture.md §8.3; moved here
 * from `apps/factory` in progress.md D109, because the factory may import only
 * domain and the openai adapter). Pure over an item and a verdict.
 *
 * An item passes only on all four judgements: the reviewer picks the intended key
 * with high confidence, names no defensible distractor, raises no register flag,
 * and lands within one band of the tag. **Failures are discarded, never
 * repaired** — a repair prompt produces items that satisfy the gate while staying
 * subtly wrong.
 *
 * The reason strings are load-bearing: the factory's metrics classify a discard
 * by each string's opening words (`apps/factory/src/pipeline/metrics.ts`).
 */

/**
 * The reviewer's minimum confidence. A content-quality bar, not a §5 exam rule,
 * so it is not profile data (ADR 9).
 */
export const CONFIDENCE_THRESHOLD = 0.7;

/** Why `item` fails review under `verdict`; empty when it passes. */
export const gateReasons = (item: Item, verdict: ReviewVerdict): string[] => {
  const reasons: string[] = [];
  if (verdict.chosenKey !== item.key) {
    reasons.push(`reviewer chose "${verdict.chosenKey}", intended "${item.key}"`);
  }
  if (verdict.confidence < CONFIDENCE_THRESHOLD) {
    reasons.push(`confidence ${String(verdict.confidence)} below ${String(CONFIDENCE_THRESHOLD)}`);
  }
  if (verdict.defensibleDistractors.length > 0) {
    reasons.push(`defensible distractor(s): ${verdict.defensibleDistractors.join(", ")}`);
  }
  if (verdict.registerFlag.flagged) {
    reasons.push(`register flag${verdict.registerFlag.note ? `: ${verdict.registerFlag.note}` : ""}`);
  }
  if (Math.abs(bandRank(verdict.estimatedBand) - bandRank(item.targetBand)) > 1) {
    reasons.push(`estimated band ${verdict.estimatedBand} is more than one band from ${item.targetBand}`);
  }
  return reasons;
};

/**
 * The review request for `item`, **blind to its key**: no key, no rationales and
 * no explanation reach the reviewer. A passage item carries its passage when
 * `passages` holds it.
 */
export const reviewRequestFor = (
  item: Item,
  passages: ReadonlyMap<PassageId, Passage> = new Map(),
): ReviewRequest => {
  const passage = item.passageId ? passages.get(item.passageId) : undefined;
  return {
    itemType: item.type,
    stem: item.stem,
    options: item.options.map((o) => ({ id: o.id, text: o.text })),
    ...(passage ? { passage: { title: passage.title, body: passage.body } } : {}),
    subSkill: item.subSkill,
    targetBand: item.targetBand,
    lang: item.lang,
  };
};

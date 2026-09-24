import type { AiProvider } from "@palier/adapters/openai";
import { bandRank } from "@palier/domain";
import type { Item, Passage, PassageId, ReviewRequest, ReviewVerdict } from "@palier/domain";

import type { Discard, ReviewResult } from "../lib/types.js";

/**
 * Stage 4 — adversarial review (content-factory.md §4.4). Each item goes to the
 * provider **blind to its key** (no key, no rationales, no explanation reach the
 * reviewer). An item passes only on all four judgements: the reviewer picks the
 * intended key with high confidence, names no defensible distractor, raises no
 * register flag, and lands within one band of the tag. **Failures are discarded,
 * never repaired** — a repair prompt produces items that satisfy the gate while
 * staying subtly wrong.
 */

export const CONFIDENCE_THRESHOLD = 0.7;

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

export const reviewItems = async (
  items: readonly Item[],
  provider: AiProvider,
  passages: ReadonlyMap<PassageId, Passage> = new Map(),
): Promise<ReviewResult<Item>> => {
  const passed: Item[] = [];
  const discarded: Discard[] = [];

  for (const item of items) {
    const verdict = await provider.reviewItem(reviewRequestFor(item, passages));
    const reasons = gateReasons(item, verdict);
    if (reasons.length > 0) discarded.push({ stemFr: item.stem.fr, reasons });
    else passed.push(item);
  }

  return { passed, discarded };
};

import type { AiProvider } from "@palier/adapters/openai";
import { gateReasons, reviewRequestFor } from "@palier/domain";
import type { Item, Passage, PassageId } from "@palier/domain";

import type { Discard, ReviewResult } from "../lib/types.js";

/**
 * Stage 4 — adversarial review (content-factory.md §4.4). Each item goes to the
 * provider blind to its key, one call at a time, and is discarded — never
 * repaired — on any gate reason. The gate itself, `gateReasons` with
 * `CONFIDENCE_THRESHOLD` and the blind `reviewRequestFor`, lives in
 * `@palier/domain` since progress.md D109, shared with the browser's runtime
 * generation.
 */

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

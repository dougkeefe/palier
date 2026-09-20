import type { ItemType } from "@palier/domain";

import { McqItem, type ItemRenderer } from "./McqItem.js";

/**
 * The `render` half of the item type registry (ADR 17), parallel to
 * `ITEM_TYPE_DEFINITIONS` in `@palier/domain`. A `Record<ItemType, …>` keyed on
 * the union, so a type added without a renderer is a compile error here; the
 * composition root asserts this map and the domain definitions cover the same
 * union.
 *
 * All four entries share `McqItem` today because every current item type is
 * multiple-choice; per-type components arrive with Phase-2 presentation.
 */
export const itemRenderers: Record<ItemType, ItemRenderer> = {
  cloze: McqItem,
  comprehension: McqItem,
  "error-id": McqItem,
  "best-completion": McqItem,
};

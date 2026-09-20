import type { Item } from "../item.js";
import type { ItemResponse, Outcome } from "./definition.js";

/**
 * Multiple-choice scoring: the response is correct when it names the key. Every
 * current item type is single-key MCQ, so this one function is registered for
 * all four (architecture.md §5.1, §7.5). A future non-MCQ type registers its own.
 */
export const scoreMcq = (item: Item, response: ItemResponse): Outcome => ({
  correct: response === item.key,
});

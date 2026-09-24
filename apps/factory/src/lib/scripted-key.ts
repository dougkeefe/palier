import type { OptionId } from "@palier/domain";

/**
 * How the scripted provider marks and finds the correct answer. The drafter
 * writes the marker into the correct option's text; the reviewer, blind to the
 * key, finds the option carrying it. Keying off the *text* (not the option id)
 * is what lets assembly shuffle option positions — to de-bias key placement —
 * without the scripted reviewer and the shuffled key falling out of agreement.
 */
export const CORRECT_MARKER = "bonne réponse";

export const findMarkedKey = (
  options: readonly { readonly id: OptionId; readonly text: string }[],
): OptionId | undefined => options.find((o) => o.text.startsWith(CORRECT_MARKER))?.id;

export const hashNum = (s: string): number => {
  let sum = 0;
  for (const c of s) sum = (sum * 31 + c.charCodeAt(0)) >>> 0;
  return sum;
};

/** Where the eval builder places a defect item's key. */
export const correctIndex = (stemFr: string): number => hashNum(stemFr) % 4;

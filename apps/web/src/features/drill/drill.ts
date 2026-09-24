import type { Item, OptionId } from "@palier/domain";
import { OPTION_IDS } from "@palier/domain";

/**
 * The drill session as a pure state machine (product-requirements.md §8.3), so the
 * timing capture, the answer-changed signal and the keyboard map are unit-tested
 * here instead of being buried in a component. The component owns only the effects:
 * it calls `answerItem` with `pendingAnswer(...)` and dispatches `answered` with the
 * result.
 *
 * Select and confirm are separate actions (§8.3: "prevents mis-taps and lets us
 * capture hesitation time"): selecting starts nothing irreversible, confirming
 * records the answer.
 */

export type Outcome = "correct" | "incorrect";

export type DrillState = {
  readonly items: readonly Item[];
  readonly index: number;
  readonly phase: "answering" | "recording" | "feedback" | "complete";
  readonly selected: OptionId | null;
  /** When the current item was shown, and when an option was first chosen (epoch ms). */
  readonly shownAt: number;
  readonly firstSelectAt: number | null;
  /** True once the user picked one option and then another, for this item. */
  readonly changedAnswer: boolean;
  /** The outcome of every answered item, in order. */
  readonly outcomes: readonly Outcome[];
};

export type DrillEvent =
  | { readonly type: "select"; readonly option: OptionId; readonly at: number }
  | { readonly type: "confirm" }
  | { readonly type: "answered"; readonly correct: boolean }
  | { readonly type: "failed" }
  | { readonly type: "next"; readonly at: number };

export const startDrill = (items: readonly Item[], at: number): DrillState => ({
  items,
  index: 0,
  phase: items.length === 0 ? "complete" : "answering",
  selected: null,
  shownAt: at,
  firstSelectAt: null,
  changedAnswer: false,
  outcomes: [],
});

export const currentItem = (state: DrillState): Item | null => state.items[state.index] ?? null;

export const drillReducer = (state: DrillState, event: DrillEvent): DrillState => {
  switch (event.type) {
    case "select":
      if (state.phase !== "answering") return state;
      return {
        ...state,
        selected: event.option,
        firstSelectAt: state.firstSelectAt ?? event.at,
        changedAnswer:
          state.changedAnswer || (state.selected !== null && state.selected !== event.option),
      };
    case "confirm":
      if (state.phase !== "answering" || state.selected === null) return state;
      return { ...state, phase: "recording" };
    case "answered":
      if (state.phase !== "recording") return state;
      return {
        ...state,
        phase: "feedback",
        outcomes: [...state.outcomes, event.correct ? "correct" : "incorrect"],
      };
    case "failed":
      // Recording failed (storage full, say): back to answering with the choice
      // kept, so nothing the user did is lost and they can confirm again.
      return state.phase === "recording" ? { ...state, phase: "answering" } : state;
    case "next": {
      if (state.phase !== "feedback") return state;
      const index = state.index + 1;
      if (index >= state.items.length) return { ...state, phase: "complete" };
      return {
        ...state,
        index,
        phase: "answering",
        selected: null,
        shownAt: event.at,
        firstSelectAt: null,
        changedAnswer: false,
      };
    }
  }
};

/** The timings and answer to record for the current item, once confirmed. */
export type PendingAnswer = {
  readonly item: Item;
  readonly response: OptionId;
  readonly msToFirstSelect: number;
  readonly msToConfirm: number;
  readonly changedAnswer: boolean;
};

export const pendingAnswer = (state: DrillState, at: number): PendingAnswer | null => {
  const item = currentItem(state);
  if (item === null || state.selected === null || state.phase !== "recording") return null;
  const firstSelectAt = state.firstSelectAt ?? at;
  return {
    item,
    response: state.selected,
    msToFirstSelect: Math.max(0, Math.round(firstSelectAt - state.shownAt)),
    msToConfirm: Math.max(0, Math.round(at - state.shownAt)),
    changedAnswer: state.changedAnswer,
  };
};

export type DrillSummary = { readonly answered: number; readonly correct: number };

export const summaryOf = (state: DrillState): DrillSummary => ({
  answered: state.outcomes.length,
  correct: state.outcomes.filter((o) => o === "correct").length,
});

/** What a key press means in the current phase (§8.3: "1 to 4 to select, Enter to confirm"). */
export type KeyIntent =
  | { readonly type: "select"; readonly option: OptionId }
  | { readonly type: "confirm" }
  | { readonly type: "next" }
  | null;

export const keyIntent = (key: string, state: DrillState): KeyIntent => {
  if (state.phase === "answering") {
    const n = Number.parseInt(key, 10);
    const item = currentItem(state);
    if (item !== null && String(n) === key && n >= 1 && n <= item.options.length) {
      const option = item.options[n - 1]?.id;
      return option === undefined || !OPTION_IDS.includes(option) ? null : { type: "select", option };
    }
    if (key === "Enter" && state.selected !== null) return { type: "confirm" };
    return null;
  }
  if (state.phase === "feedback" && key === "Enter") return { type: "next" };
  return null;
};

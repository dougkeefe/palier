import type { ExamRun } from "@palier/app";
import type { ExamForm, Item, ItemId, OptionId } from "@palier/domain";

/**
 * The mock-exam runner as a pure state machine (product-requirements.md §8.4,
 * progress.md D84), so the keyboard map, the timing capture and the rules for
 * what gets written are tested here and not buried in a component.
 *
 * - **Selecting is answering** (ruling 4). There is no confirm step, and an answer
 *   can change freely, from the item or by coming back to it through the navigator.
 * - **Every answer and flag is written at once.** The reducer does not await
 *   anything: it appends the write to `outbox`, and the island drains the outbox
 *   in order, adding the elapsed exam time, and dispatches `sent`. A write is never
 *   lost to a re-render, and the order the candidate acted in is the order stored.
 * - **No per-item feedback** (§8.4). Nothing here knows which option is right.
 * - **Nothing marks a pilot** (ruling 9). The runner never reads `pilotItemIds`.
 */

export type ExamWrite =
  | {
      readonly kind: "answer";
      readonly itemId: ItemId;
      readonly response: OptionId;
      readonly msToFirstSelect: number;
      readonly msToConfirm: number;
      readonly changedAnswer: boolean;
    }
  | { readonly kind: "flag"; readonly itemId: ItemId; readonly flagged: boolean };

export type RunnerPanel = "none" | "navigator" | "submit";

export type RunnerState = {
  readonly form: ExamForm;
  /** The form's items, in form order. */
  readonly items: readonly Item[];
  readonly index: number;
  readonly answers: ReadonlyMap<ItemId, OptionId>;
  readonly flagged: ReadonlySet<ItemId>;
  /** This visit to the current item: when it was shown, first chosen, and the last choice made. */
  readonly shownAt: number;
  readonly firstSelectAt: number | null;
  readonly changedThisVisit: boolean;
  readonly panel: RunnerPanel;
  /** `running`, then `submitting` once the candidate submits or time runs out, then `submitted`. */
  readonly phase: "running" | "submitting" | "submitted";
  /** Set when time ran out, so the screen can say the exam was submitted for them. */
  readonly timedOut: boolean;
  readonly outbox: readonly ExamWrite[];
};

export type RunnerEvent =
  | { readonly type: "select"; readonly option: OptionId; readonly at: number }
  | { readonly type: "goTo"; readonly index: number; readonly at: number }
  | { readonly type: "next"; readonly at: number }
  | { readonly type: "previous"; readonly at: number }
  | { readonly type: "toggleFlag" }
  | { readonly type: "openNavigator" }
  | { readonly type: "openSubmit" }
  | { readonly type: "closePanel" }
  | { readonly type: "submit" }
  | { readonly type: "expire" }
  | { readonly type: "submitted" }
  | { readonly type: "submitFailed" }
  | { readonly type: "sent"; readonly count: number }
  /**
   * A raw key press, resolved against the state the reducer holds now, so a fast
   * "2" then Enter can never be read against a stale render (progress.md D67).
   */
  | { readonly type: "key"; readonly key: string; readonly at: number };

/**
 * Open the runner on a run as stored. It starts on the first unanswered item, or
 * the first item when every one is answered, so a resume lands where the candidate
 * has work left.
 */
export const startRunner = (run: ExamRun, form: ExamForm, items: readonly Item[], at: number): RunnerState => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = form.itemIds.map((id) => byId.get(id)).filter((item): item is Item => item !== undefined);
  const answers = new Map(run.answers.map((a) => [a.itemId, a.response]));
  const firstOpen = ordered.findIndex((item) => !answers.has(item.id));
  return {
    form,
    items: ordered,
    index: firstOpen === -1 ? 0 : firstOpen,
    answers,
    flagged: new Set(run.flagged),
    shownAt: at,
    firstSelectAt: null,
    changedThisVisit: false,
    panel: "none",
    phase: run.submittedAt === null ? "running" : "submitted",
    timedOut: false,
    outbox: [],
  };
};

export const currentItem = (state: RunnerState): Item | null => state.items[state.index] ?? null;

const visit = (state: RunnerState, index: number, at: number): RunnerState => {
  if (index < 0 || index >= state.items.length || index === state.index) {
    return { ...state, panel: "none" };
  }
  return { ...state, index, shownAt: at, firstSelectAt: null, changedThisVisit: false, panel: "none" };
};

const select = (state: RunnerState, option: OptionId, at: number): RunnerState => {
  const item = currentItem(state);
  if (item === null) return state;
  const previous = state.answers.get(item.id);
  if (previous === option) return state;

  const firstSelectAt = state.firstSelectAt ?? at;
  const changed = state.changedThisVisit || previous !== undefined;
  const answers = new Map(state.answers);
  answers.set(item.id, option);
  return {
    ...state,
    answers,
    firstSelectAt,
    changedThisVisit: changed,
    outbox: [
      ...state.outbox,
      {
        kind: "answer",
        itemId: item.id,
        response: option,
        msToFirstSelect: Math.max(0, Math.round(firstSelectAt - state.shownAt)),
        msToConfirm: Math.max(0, Math.round(at - state.shownAt)),
        changedAnswer: changed,
      },
    ],
  };
};

const toggleFlag = (state: RunnerState): RunnerState => {
  const item = currentItem(state);
  if (item === null) return state;
  const flagged = new Set(state.flagged);
  const on = !flagged.has(item.id);
  if (on) flagged.add(item.id);
  else flagged.delete(item.id);
  return { ...state, flagged, outbox: [...state.outbox, { kind: "flag", itemId: item.id, flagged: on }] };
};

export const runnerReducer = (state: RunnerState, event: RunnerEvent): RunnerState => {
  // Bookkeeping and the submission's own outcome are the only events that can
  // change a run once it has stopped running.
  if (event.type === "sent") return { ...state, outbox: state.outbox.slice(event.count) };
  if (event.type === "submitted") return { ...state, phase: "submitted", panel: "none" };
  if (event.type === "submitFailed") {
    return state.phase === "submitting" ? { ...state, phase: "running", timedOut: false } : state;
  }
  if (state.phase !== "running") return state;

  switch (event.type) {
    case "select":
      return select(state, event.option, event.at);
    case "goTo":
      return visit(state, event.index, event.at);
    case "next":
      return visit(state, state.index + 1, event.at);
    case "previous":
      return visit(state, state.index - 1, event.at);
    case "toggleFlag":
      return toggleFlag(state);
    case "openNavigator":
      return { ...state, panel: "navigator" };
    case "openSubmit":
      return { ...state, panel: "submit" };
    case "closePanel":
      return { ...state, panel: "none" };
    case "submit":
      return { ...state, phase: "submitting", panel: "none" };
    case "expire":
      return { ...state, phase: "submitting", panel: "none", timedOut: true };
    case "key":
      return keyed(state, event.key, event.at);
  }
};

/**
 * The runner's keys, while no dialog is open (a dialog owns its own keys):
 * 1 to 4 choose an option, which answers the item; Enter goes to the next item;
 * F flags or unflags the current one.
 */
const keyed = (state: RunnerState, key: string, at: number): RunnerState => {
  if (state.panel !== "none") return state;
  const item = currentItem(state);
  if (item === null) return state;

  // "1" is the first option; a digit with no option of its own falls through.
  const n = Number.parseInt(key, 10);
  const option = String(n) === key ? item.options[n - 1] : undefined;
  if (option !== undefined) return select(state, option.id, at);
  if (key === "Enter") return visit(state, state.index + 1, at);
  if (key === "f" || key === "F") return toggleFlag(state);
  return state;
};

export type SubmitCounts = { readonly unanswered: number; readonly flagged: number };

/** What the submit dialog tells the candidate before they commit (D84, ruling 5). */
export const submitCounts = (state: RunnerState): SubmitCounts => ({
  unanswered: state.items.filter((item) => !state.answers.has(item.id)).length,
  flagged: state.items.filter((item) => state.flagged.has(item.id)).length,
});

export const answeredCount = (state: RunnerState): number =>
  state.items.filter((item) => state.answers.has(item.id)).length;

export type NavigatorEntry = {
  readonly index: number;
  readonly itemId: ItemId;
  readonly answered: boolean;
  readonly flagged: boolean;
  readonly current: boolean;
};

/** One entry per item for the navigator drawer, in form order. */
export const navigatorEntries = (state: RunnerState): readonly NavigatorEntry[] =>
  state.items.map((item, index) => ({
    index,
    itemId: item.id,
    answered: state.answers.has(item.id),
    flagged: state.flagged.has(item.id),
    current: index === state.index,
  }));

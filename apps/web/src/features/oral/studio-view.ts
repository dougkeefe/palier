import type { OralSessionChoice, OralSessionCost } from "@palier/app";

import { moneyText } from "../key/spend-view";

/**
 * Studio mode's decisions (product-requirements.md §8.6 studio mode, progress.md D185), kept out of the `.tsx`
 * so each is tested. The session's end is the practice screen's end card, so this holds only the conversation.
 */

/** What a studio session has cost so far: the dollars priced, and whether a call could not be priced. */
export type Spent = { readonly usd: number; readonly floor: boolean };

export type StudioState =
  | { readonly phase: "idle" }
  | {
      readonly phase: "live";
      readonly choice: OralSessionChoice;
      /** Whether the conversation is open: false while the secret is minted and the call dialled. */
      readonly connected: boolean;
      readonly startedAtMs: number;
      /** The scenario phase, counted from zero. */
      readonly phaseIndex: number;
      /** `null` until the first billed response is in the ledger. */
      readonly spent: Spent | null;
      /** Whether a repeat request is being sent, so the control is not pressed twice at once. */
      readonly repeating: boolean;
      readonly ending: boolean;
    };

export type StudioAction =
  | { readonly type: "started"; readonly choice: OralSessionChoice; readonly nowMs: number }
  | { readonly type: "connected" }
  | { readonly type: "progress"; readonly phaseIndex: number; readonly spent: Spent | null }
  | { readonly type: "repeating"; readonly on: boolean }
  | { readonly type: "ending" }
  | { readonly type: "reset" };

export const INITIAL_STUDIO: StudioState = { phase: "idle" };

/**
 * The conversation's steps: dialling, open, ending, then back to idle once the end card has it. A late
 * event, a tick after the end for example, never moves an idle screen.
 */
export const studio = (state: StudioState, action: StudioAction): StudioState => {
  if (action.type === "reset") return INITIAL_STUDIO;
  if (action.type === "started") {
    return {
      phase: "live",
      choice: action.choice,
      connected: false,
      startedAtMs: action.nowMs,
      phaseIndex: 0,
      spent: null,
      repeating: false,
      ending: false,
    };
  }
  if (state.phase === "idle") return state;
  switch (action.type) {
    case "connected":
      return { ...state, connected: true };
    case "progress":
      return { ...state, phaseIndex: action.phaseIndex, spent: action.spent ?? state.spent };
    case "repeating":
      return { ...state, repeating: action.on };
    case "ending":
      return { ...state, ending: true };
  }
};

/** The session's cost so far, from its own ledger rows (D182): the conversation's line, or none before any row. */
export const spentOf = (cost: OralSessionCost | null): Spent | null =>
  cost === null || cost.studio.calls === 0 ? null : { usd: cost.studio.usd, floor: cost.studio.unpriced > 0 };

/** The running meter in words: a message key in the `oral` namespace and its values. */
export const meterWords = (
  spent: Spent | null,
  locale: string,
): { readonly key: string; readonly values?: { readonly amount: string } } => {
  if (spent === null) return { key: "meterNothing" };
  const shown = moneyText(spent.usd, locale);
  return { key: spent.floor ? "meterFloor" : "meterSoFar", values: { amount: shown.text } };
};

/** The words that say what the conversation is doing, since the voice form says it only in motion. */
export const studioStatus = (state: Extract<StudioState, { phase: "live" }>): "studioConnecting" | "studioLive" | "studioEnding" => {
  if (state.ending) return "studioEnding";
  return state.connected ? "studioLive" : "studioConnecting";
};

/** Which part of the scenario the conversation is in, counted from one, for the phase indicator. */
export const studioProgress = (state: Extract<StudioState, { phase: "live" }>) => ({
  part: Math.min(state.phaseIndex, state.choice.scenario.phases.length - 1) + 1,
  of: state.choice.scenario.phases.length,
});

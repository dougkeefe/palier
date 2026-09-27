import type { GeneratePracticeSetResult, GeneratedSet } from "@palier/app";
import type { SubSkill } from "@palier/domain";
import type { Preflight } from "@palier/engine";

import { checkFailure } from "../key/key-view";

/**
 * The fresh-set screen's decisions (architecture.md §8.3, product-requirements.md §13.0, §14;
 * progress.md D110–D111), kept out of the `.tsx` so each is tested.
 */

/** Why generation failed, from the thrown error, as the key screen reads a failed check. */
export type GenerateFailure = "invalid-key" | "out-of-credit" | "timeout" | "unreachable" | "unexpected" | "no-key" | "failed";

export const generateFailure = (error: unknown): GenerateFailure => {
  const result = checkFailure(error);
  return result.kind === "valid" ? "failed" : result.kind;
};

/** The message key for a failure, in the `generate` namespace. */
export const failureMessage = (failure: GenerateFailure): string =>
  ({
    "invalid-key": "failInvalidKey",
    "out-of-credit": "failOutOfCredit",
    timeout: "failTimeout",
    unreachable: "failUnreachable",
    unexpected: "failUnexpected",
    "no-key": "failNoKey",
    failed: "failFailed",
  })[failure];

export type RequestState =
  | { readonly kind: "idle" }
  | { readonly kind: "confirming"; readonly preflight: Preflight }
  | { readonly kind: "sending" }
  | { readonly kind: "failed"; readonly failure: GenerateFailure };

export type GeneratorState =
  | { readonly phase: "choosing"; readonly subSkill: SubSkill; readonly request: RequestState }
  | { readonly phase: "result"; readonly subSkill: SubSkill; readonly result: GeneratePracticeSetResult }
  | { readonly phase: "practising"; readonly subSkill: SubSkill; readonly set: GeneratedSet };

export type GeneratorAction =
  | { readonly type: "choose-sub-skill"; readonly subSkill: SubSkill }
  | { readonly type: "preflighted"; readonly preflight: Preflight }
  | { readonly type: "cancel" }
  | { readonly type: "sending" }
  | { readonly type: "generated"; readonly result: GeneratePracticeSetResult }
  | { readonly type: "failed"; readonly failure: GenerateFailure }
  | { readonly type: "practise"; readonly set: GeneratedSet }
  | { readonly type: "back" };

const IDLE: RequestState = { kind: "idle" };

export const initialGenerator = (subSkill: SubSkill): GeneratorState => ({ phase: "choosing", subSkill, request: IDLE });

/** Whether the screen may take a new request: choosing, and nothing being generated. */
const idleChoosing = (state: GeneratorState): state is Extract<GeneratorState, { phase: "choosing" }> =>
  state.phase === "choosing" && state.request.kind !== "sending";

/**
 * The screen's one reducer. Nothing that starts or changes a request is taken while a set is
 * being generated: a pre-flight that lands late (a double click on Generate) or a cancel would
 * otherwise bring Send back mid-request, and a second paid run with it. A failure keeps the
 * chosen sub-skill so "Try again" asks for the same thing.
 */
export const generator = (state: GeneratorState, action: GeneratorAction): GeneratorState => {
  switch (action.type) {
    case "choose-sub-skill":
      return idleChoosing(state) ? { phase: "choosing", subSkill: action.subSkill, request: IDLE } : state;
    case "preflighted":
      return idleChoosing(state) ? { ...state, request: { kind: "confirming", preflight: action.preflight } } : state;
    case "cancel":
      return idleChoosing(state) ? { ...state, request: IDLE } : state;
    case "sending":
      return state.phase === "choosing" ? { ...state, request: { kind: "sending" } } : state;
    case "failed":
      return state.phase === "choosing" ? { ...state, request: { kind: "failed", failure: action.failure } } : state;
    case "generated":
      return { phase: "result", subSkill: state.subSkill, result: action.result };
    case "practise":
      return { phase: "practising", subSkill: state.subSkill, set: action.set };
    case "back":
      return initialGenerator(state.subSkill);
  }
};

/** What the result says: how many of the drafts passed the automated check, or that none did. */
export const resultSummary = (
  result: GeneratePracticeSetResult,
): { readonly key: "resultNone" | "resultSome"; readonly kept: number; readonly drafted: number } =>
  result.set === null
    ? { key: "resultNone", kept: 0, drafted: result.drafted }
    : { key: "resultSome", kept: result.set.items.length, drafted: result.drafted };

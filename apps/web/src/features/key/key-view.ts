import type { ApiKeyStatus } from "@palier/app";

/**
 * The key screen's decisions (product-requirements.md §8.10, §14; progress.md D100), kept
 * out of the `.tsx` so each is tested.
 *
 * A key check ends in one of these, each shown as a plain sentence, never the raw error
 * (§14: "the actual API error in plain language and the exact fix").
 */
export type CheckResult =
  | { readonly kind: "valid" }
  | { readonly kind: "invalid-key" }
  | { readonly kind: "out-of-credit" }
  | { readonly kind: "timeout" }
  | { readonly kind: "unreachable" }
  | { readonly kind: "unexpected" }
  | { readonly kind: "no-key" }
  | { readonly kind: "failed"; readonly status: number | null };

/**
 * Why a check failed, from the thrown error. The names are the openai adapter's and the
 * key use cases' error classes, compared by name as `sync-view.ts` does, because the error
 * crossed the lazily loaded container's chunk boundary.
 */
export const checkFailure = (error: unknown): CheckResult => {
  const name = error instanceof Error ? error.name : "";
  switch (name) {
    case "InvalidApiKeyError":
      return { kind: "invalid-key" };
    case "RateLimitError":
      return { kind: "out-of-credit" };
    case "ProviderTimeoutError":
      return { kind: "timeout" };
    case "ProviderUnavailableError":
      return { kind: "unreachable" };
    case "InvalidResponseError":
      return { kind: "unexpected" };
    case "NoApiKeyError":
      return { kind: "no-key" };
    default: {
      const status = (error as { status?: unknown } | null)?.status;
      return { kind: "failed", status: typeof status === "number" ? status : null };
    }
  }
};

/** The message key for a check's result, in the `key` namespace. */
export const checkMessage = (result: CheckResult): string => {
  switch (result.kind) {
    case "valid":
      return "resultValid";
    case "invalid-key":
      return "resultInvalidKey";
    case "out-of-credit":
      return "resultOutOfCredit";
    case "timeout":
      return "resultTimeout";
    case "unreachable":
      return "resultUnreachable";
    case "unexpected":
      return "resultUnexpected";
    case "no-key":
      return "resultNoKey";
    case "failed":
      return result.status === null ? "resultFailed" : "resultFailedStatus";
  }
};

/** A result the user can act on is good news or a warning; only "valid" is the former. */
export const checkTone = (result: CheckResult): "correct" | "incorrect" =>
  result.kind === "valid" ? "correct" : "incorrect";

/** What the screen shows, driven by {@link keyScreen}. */
export type KeyScreenState =
  | { readonly phase: "loading" }
  | { readonly phase: "empty"; readonly notice: EmptyNotice | null }
  | { readonly phase: "saved"; readonly status: ApiKeyStatus; readonly check: CheckState };

/** A line under the empty form: why it is empty again, or why a save did not happen. */
export type EmptyNotice = "removed" | "blank" | "saveFailed";

export type CheckState =
  | { readonly kind: "idle" }
  | { readonly kind: "checking" }
  | { readonly kind: "done"; readonly result: CheckResult };

export type KeyScreenAction =
  | { readonly type: "loaded"; readonly status: ApiKeyStatus | null }
  | { readonly type: "saved"; readonly status: ApiKeyStatus }
  | { readonly type: "saveRefused"; readonly notice: "blank" | "saveFailed" }
  | { readonly type: "checking" }
  | { readonly type: "checked"; readonly result: CheckResult }
  | { readonly type: "removed" };

export const INITIAL_KEY_SCREEN: KeyScreenState = { phase: "loading" };

export const keyScreen = (state: KeyScreenState, action: KeyScreenAction): KeyScreenState => {
  switch (action.type) {
    case "loaded":
      return action.status === null
        ? { phase: "empty", notice: null }
        : { phase: "saved", status: action.status, check: { kind: "idle" } };
    case "saved":
      return { phase: "saved", status: action.status, check: { kind: "idle" } };
    case "saveRefused":
      return { phase: "empty", notice: action.notice };
    case "checking":
      return state.phase === "saved" ? { ...state, check: { kind: "checking" } } : state;
    case "checked":
      // A key the check found missing (another tab removed it) is shown as gone.
      if (action.result.kind === "no-key") return { phase: "empty", notice: null };
      return state.phase === "saved" ? { ...state, check: { kind: "done", result: action.result } } : state;
    case "removed":
      return { phase: "empty", notice: "removed" };
  }
};

/** Why saving failed, from the thrown error: a blank entry, or anything else. */
export const saveFailure = (error: unknown): "blank" | "saveFailed" =>
  error instanceof Error && error.name === "EmptyApiKeyError" ? "blank" : "saveFailed";

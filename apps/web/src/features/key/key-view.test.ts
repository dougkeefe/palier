import { describe, expect, it } from "vitest";

import {
  type CheckResult,
  INITIAL_KEY_SCREEN,
  type KeyScreenState,
  checkFailure,
  checkMessage,
  checkTone,
  keyScreen,
  returnAfterKey,
  saveFailure,
} from "./key-view";

const named = (name: string, extra: Record<string, unknown> = {}) => Object.assign(new Error("x"), { name }, extra);

describe("checkFailure — each error a key check can end in, as a plain state", () => {
  it.each([
    ["InvalidApiKeyError", "invalid-key"],
    ["RateLimitError", "out-of-credit"],
    ["ProviderTimeoutError", "timeout"],
    ["ProviderUnavailableError", "unreachable"],
    ["InvalidResponseError", "unexpected"],
    ["NoApiKeyError", "no-key"],
  ])("reads a %s as %s", (name, kind) => {
    expect(checkFailure(named(name))).toEqual({ kind });
  });

  it("keeps the status of any other refusal, for the message", () => {
    expect(checkFailure(named("ProviderRequestError", { status: 503 }))).toEqual({ kind: "failed", status: 503 });
  });

  it("reads anything else, even a non-error, as a failure with no status", () => {
    expect(checkFailure(new TypeError("boom"))).toEqual({ kind: "failed", status: null });
    expect(checkFailure("a string")).toEqual({ kind: "failed", status: null });
    expect(checkFailure(null)).toEqual({ kind: "failed", status: null });
    expect(checkFailure(named("ProviderRequestError", { status: "503" }))).toEqual({ kind: "failed", status: null });
  });
});

describe("checkMessage and checkTone", () => {
  it.each([
    [{ kind: "valid" }, "resultValid", "correct"],
    [{ kind: "invalid-key" }, "resultInvalidKey", "incorrect"],
    [{ kind: "out-of-credit" }, "resultOutOfCredit", "incorrect"],
    [{ kind: "timeout" }, "resultTimeout", "incorrect"],
    [{ kind: "unreachable" }, "resultUnreachable", "incorrect"],
    [{ kind: "unexpected" }, "resultUnexpected", "incorrect"],
    [{ kind: "no-key" }, "resultNoKey", "incorrect"],
    [{ kind: "failed", status: 500 }, "resultFailedStatus", "incorrect"],
    [{ kind: "failed", status: null }, "resultFailed", "incorrect"],
  ] as [CheckResult, string, string][])("names %j with %s, in the %s tone", (result, message, tone) => {
    expect(checkMessage(result)).toBe(message);
    expect(checkTone(result)).toBe(tone);
  });
});

describe("keyScreen", () => {
  const device = { storage: "device", lastFour: "abcd" } as const;
  const saved: KeyScreenState = { phase: "saved", status: device, check: { kind: "idle" } };

  it("starts loading, then shows the form with no key or the key's summary with one", () => {
    expect(INITIAL_KEY_SCREEN).toEqual({ phase: "loading" });
    expect(keyScreen(INITIAL_KEY_SCREEN, { type: "loaded", status: null })).toEqual({ phase: "empty", notice: null });
    expect(keyScreen(INITIAL_KEY_SCREEN, { type: "loaded", status: device })).toEqual(saved);
  });

  it("shows the summary once saved, with no stale check result", () => {
    const checked: KeyScreenState = { ...saved, check: { kind: "done", result: { kind: "valid" } } };
    const tab = { storage: "tab", lastFour: "wxyz" } as const;
    expect(keyScreen(checked, { type: "saved", status: tab })).toEqual({ phase: "saved", status: tab, check: { kind: "idle" } });
  });

  it("stays on the form and says why when a save is refused", () => {
    const empty: KeyScreenState = { phase: "empty", notice: null };
    expect(keyScreen(empty, { type: "saveRefused", notice: "blank" })).toEqual({ phase: "empty", notice: "blank" });
    expect(keyScreen(empty, { type: "saveRefused", notice: "saveFailed" })).toEqual({ phase: "empty", notice: "saveFailed" });
  });

  it("shows a check in flight, then its result", () => {
    const checking = keyScreen(saved, { type: "checking" });
    expect(checking).toEqual({ ...saved, check: { kind: "checking" } });
    expect(keyScreen(checking, { type: "checked", result: { kind: "timeout" } })).toEqual({
      ...saved,
      check: { kind: "done", result: { kind: "timeout" } },
    });
  });

  it("shows the form again when the check finds the key gone", () => {
    expect(keyScreen(saved, { type: "checked", result: { kind: "no-key" } })).toEqual({ phase: "empty", notice: null });
  });

  it("ignores a check event when no key is shown", () => {
    const empty: KeyScreenState = { phase: "empty", notice: null };
    expect(keyScreen(empty, { type: "checking" })).toBe(empty);
    expect(keyScreen(empty, { type: "checked", result: { kind: "valid" } })).toBe(empty);
  });

  it("says the key is removed once it is", () => {
    expect(keyScreen(saved, { type: "removed" })).toEqual({ phase: "empty", notice: "removed" });
  });
});

describe("saveFailure", () => {
  it("reads a blank entry as blank, and anything else as a failed save", () => {
    expect(saveFailure(named("EmptyApiKeyError"))).toBe("blank");
    expect(saveFailure(new Error("quota"))).toBe("saveFailed");
    expect(saveFailure(undefined)).toBe("saveFailed");
  });
});

describe("returnAfterKey (ADR 25)", () => {
  it("offers the way back to the diagnostic, whose gate sent the user here", () => {
    expect(returnAfterKey("diagnostic")).toBe("/diagnostic");
  });

  it("offers nothing for no next, or for any other, so the query can never point the link elsewhere", () => {
    expect(returnAfterKey(null)).toBeNull();
    expect(returnAfterKey("")).toBeNull();
    expect(returnAfterKey("https://evil.example")).toBeNull();
    expect(returnAfterKey("/diagnostic")).toBeNull();
  });
});

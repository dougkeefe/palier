import type { DiagnosticResult } from "@palier/app";
import { sessionId } from "@palier/domain";
import type { DiagnosticSummary } from "@palier/engine";
import { describe, expect, it } from "vitest";

import {
  canRetry,
  failureMessage,
  focusText,
  initialInterpretation,
  atLineStart,
  interpretationFailure,
  interpretationFor,
  isShortRun,
  listOf,
  placementOf,
  scoreOf,
  skillFromQuery,
} from "./result-view";

const summary = (over: Partial<DiagnosticSummary> = {}): DiagnosticSummary => ({
  skill: "writing",
  sessionId: sessionId("diag-1"),
  takenAt: "2026-10-06T10:00:00.000Z",
  total: { correct: 18, attempted: 30 },
  bands: [
    { band: "B", correct: 11, attempted: 15 },
    { band: "C", correct: 7, attempted: 15 },
  ],
  subSkills: [],
  strengths: [],
  focusSubSkills: ["agreement", "pronouns"],
  targetBand: "C",
  startBand: "B",
  ...over,
});

const interpretation = {
  headline: "h",
  summary: "s",
  strengths: [],
  priorities: [{ subSkill: "agreement" as const, what: "w", why: "y" }],
  planNote: "p",
};

const named = (name: string) => Object.assign(new Error("x"), { name });

describe("scoreOf", () => {
  it("says the score plainly: right, wrong, and out of how many", () => {
    expect(scoreOf(summary())).toEqual({ correct: 18, wrong: 12, attempted: 30 });
  });
});

describe("placementOf", () => {
  it("says the plan works up to the target when it starts below it", () => {
    expect(placementOf(summary())).toEqual({ key: "placementBelow", values: { start: "B", target: "C" } });
  });

  it("says the plan starts at the target when it does", () => {
    expect(placementOf(summary({ startBand: "C" })).key).toBe("placementAt");
  });
});

describe("atLineStart", () => {
  it("capitalises a sub-skill's name where it opens a line, in either language", () => {
    expect(atLineStart("agreement", "en")).toBe("Agreement");
    expect(atLineStart("économie de mots", "fr")).toBe("Économie de mots");
    expect(atLineStart("", "en")).toBe("");
  });
});

describe("listOf and focusText", () => {
  it("joins names in the interface's language", () => {
    expect(listOf(["agreement", "pronouns"], "en")).toBe("agreement and pronouns");
    expect(listOf(["l’accord", "les pronoms", "la ponctuation"], "fr")).toBe("l’accord, les pronoms et la ponctuation");
  });

  it("names the run's focus, translated, or nothing when the run left none", () => {
    expect(focusText(["agreement", "pronouns"], (s) => s.toUpperCase(), "en")).toBe("AGREEMENT and PRONOUNS");
    expect(focusText([], (s) => s, "en")).toBeNull();
  });
});

describe("interpretationFailure", () => {
  it("names a run that is gone apart from a failed call", () => {
    expect(interpretationFailure(named("NoDiagnosticRunError"))).toBe("no-run");
  });

  it.each([
    ["InvalidApiKeyError", "invalid-key"],
    ["RateLimitError", "out-of-credit"],
    ["ProviderTimeoutError", "timeout"],
    ["ProviderUnavailableError", "unreachable"],
    ["InvalidResponseError", "unexpected"],
    ["NoApiKeyError", "no-key"],
    ["Error", "failed"],
  ])("reads %s as %s", (name, failure) => {
    expect(interpretationFailure(named(name))).toBe(failure);
  });

  it("reads something that is not an error as a plain failure", () => {
    expect(interpretationFailure("boom")).toBe("failed");
  });
});

describe("failureMessage and canRetry", () => {
  it("keys each failure in the diagnostic namespace", () => {
    expect(failureMessage("timeout")).toBe("fail_timeout");
    expect(failureMessage("no-run")).toBe("fail_no-run");
  });

  it("offers to ask again unless there is no key or no run to ask about", () => {
    expect(canRetry("timeout")).toBe(true);
    expect(canRetry("unexpected")).toBe(true);
    expect(canRetry("no-key")).toBe(false);
    expect(canRetry("no-run")).toBe(false);
  });
});

describe("initialInterpretation", () => {
  const result = (over: Partial<DiagnosticResult> = {}): DiagnosticResult => ({
    summary: summary(),
    interpretation: null,
    interpretationLang: null,
    retakeDue: false,
    ...over,
  });
  const kept = result({ interpretation, interpretationLang: "en" });

  it("shows a kept interpretation at once in the screen's language, key or no key", () => {
    expect(initialInterpretation(kept, false, false, "en")).toEqual({ kind: "ready", interpretation });
    expect(initialInterpretation(kept, true, true, "en")).toEqual({ kind: "ready", interpretation });
  });

  it("asks at the run's own end when a key is held, since starting was the consent", () => {
    expect(initialInterpretation(result(), true, true, "en")).toEqual({ kind: "asking" });
  });

  it("only offers, never spends, when the result is opened anywhere else (a synced or older run)", () => {
    expect(initialInterpretation(result(), true, false, "en")).toEqual({ kind: "offer", existing: null });
  });

  it("offers to write it again in the screen's language, showing the kept one meanwhile", () => {
    expect(initialInterpretation(kept, true, true, "fr")).toEqual({ kind: "offer", existing: interpretation });
  });

  it("without a key shows what is kept in either language, or asks for nothing", () => {
    expect(initialInterpretation(kept, false, false, "fr")).toEqual({ kind: "ready", interpretation });
    expect(initialInterpretation(result(), false, true, "en")).toEqual({ kind: "no-key" });
  });

  it("quotes the interpretation on Today only in the screen's language", () => {
    expect(interpretationFor(kept, "en")).toEqual(interpretation);
    expect(interpretationFor(kept, "fr")).toBeNull();
    expect(interpretationFor(result(), "en")).toBeNull();
  });
});

describe("isShortRun", () => {
  it("is short below the profile's size, and whole at or above it", () => {
    expect(isShortRun(24, 30)).toBe(true);
    expect(isShortRun(0, 30)).toBe(true);
    expect(isShortRun(30, 30)).toBe(false);
  });
});

describe("skillFromQuery", () => {
  it("reads either scored skill, and falls back to reading for anything else", () => {
    expect(skillFromQuery("writing")).toBe("writing");
    expect(skillFromQuery("reading")).toBe("reading");
    expect(skillFromQuery("oral")).toBe("reading");
    expect(skillFromQuery(null)).toBe("reading");
  });
});

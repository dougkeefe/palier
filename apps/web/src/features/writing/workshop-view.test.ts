import type { WritingSubmission } from "@palier/app";
import type { Preflight } from "@palier/engine";
import { describe, expect, it } from "vitest";

import {
  INITIAL_WORKSHOP,
  type WorkshopState,
  announcedCount,
  countWords,
  criterionLabel,
  elapsedText,
  failureMessage,
  feedbackFailure,
  preflightNotice,
  reusableSubmission,
  wordTone,
  workshop,
} from "./workshop-view";

const named = (name: string): Error => Object.assign(new Error("x"), { name });

const criterion = { band: "B" as const, evidence: "e" };
const aSubmission = (over: Partial<WritingSubmission> = {}): WritingSubmission => ({
  id: "sub-1",
  promptId: "wp-reply-01",
  text: "Madame, merci.",
  writtenAt: "2026-09-26T10:00:00.000Z",
  assessment: {
    criteria: { register: criterion, structure: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
    errors: [],
    modelAnswer: "Madame, je vous remercie.",
  },
  ...over,
});

const preflight = (after: Preflight["after"]): Preflight => ({ estimateUsd: 0.02, before: "under", after });

const writingState = (): WorkshopState => workshop(INITIAL_WORKSHOP, { type: "pick", promptId: "wp-reply-01", nowMs: 1_000 });

describe("countWords", () => {
  it("counts runs of anything but whitespace, so an elided or hyphenated word is one", () => {
    expect(countWords("  C'est-à-dire, l'équipe  est\nprête.  ")).toBe(4);
  });

  it("is zero for an empty or blank text", () => {
    expect(countWords("")).toBe(0);
    expect(countWords(" \n\t ")).toBe(0);
  });
});

describe("elapsedText", () => {
  it("shows minutes and two-digit seconds, counting up", () => {
    expect(elapsedText(0)).toBe("0:00");
    expect(elapsedText(65_900)).toBe("1:05");
    expect(elapsedText(20 * 60_000)).toBe("20:00");
  });

  it("never shows a negative time, whatever the clock did", () => {
    expect(elapsedText(-5_000)).toBe("0:00");
  });
});

describe("wordTone", () => {
  it("is short below nine tenths of the target, near within a tenth, over past eleven tenths", () => {
    expect(wordTone(134, 150)).toBe("short");
    expect(wordTone(135, 150)).toBe("near");
    expect(wordTone(165, 150)).toBe("near");
    expect(wordTone(166, 150)).toBe("over");
  });
});

describe("announcedCount", () => {
  it("moves in tens below the target, so a screen reader is not told every keystroke", () => {
    expect(announcedCount(7, 150)).toBe(0);
    expect(announcedCount(43, 150)).toBe(40);
  });

  it("is exact from the target on", () => {
    expect(announcedCount(150, 150)).toBe(150);
    expect(announcedCount(163, 150)).toBe(163);
  });
});

describe("feedbackFailure", () => {
  it.each([
    ["InvalidApiKeyError", "invalid-key"],
    ["RateLimitError", "out-of-credit"],
    ["ProviderTimeoutError", "timeout"],
    ["ProviderUnavailableError", "unreachable"],
    ["InvalidResponseError", "unexpected"],
    ["NoApiKeyError", "no-key"],
    ["EmptyWritingError", "empty"],
    ["SomethingElse", "failed"],
  ] as const)("reads %s as %s, by name, since the error crossed a chunk boundary", (name, failure) => {
    expect(feedbackFailure(named(name))).toBe(failure);
  });

  it("reads a thrown value that is not an error as a plain failure", () => {
    expect(feedbackFailure("boom")).toBe("failed");
  });
});

describe("failureMessage", () => {
  it("gives every failure its own sentence", () => {
    const failures = ["invalid-key", "out-of-credit", "timeout", "unreachable", "unexpected", "no-key", "empty", "failed"] as const;
    const keys = failures.map(failureMessage);
    expect(new Set(keys).size).toBe(failures.length);
    expect(keys.every((key) => key.startsWith("fail"))).toBe(true);
  });
});

describe("preflightNotice", () => {
  it("warns when this call would bring the month near the cap, and more strongly past it", () => {
    expect(preflightNotice(preflight("near"))).toEqual({ key: "preflightNear", tone: "info" });
    expect(preflightNotice(preflight("over"))).toEqual({ key: "preflightOver", tone: "incorrect" });
  });

  it("says nothing under the cap or with no cap", () => {
    expect(preflightNotice(preflight("under"))).toBeNull();
    expect(preflightNotice(preflight("none"))).toBeNull();
  });
});

describe("criterionLabel", () => {
  it("names each criterion's message key", () => {
    expect(criterionLabel("grammar")).toBe("criterion_grammar");
  });
});

describe("workshop", () => {
  it("starts by choosing a prompt, and picking one opens an empty draft timed from now", () => {
    expect(INITIAL_WORKSHOP).toEqual({ phase: "choosing" });
    expect(writingState()).toEqual({
      phase: "writing",
      draft: { promptId: "wp-reply-01", text: "", startedAtMs: 1_000, saved: null },
      request: { kind: "idle" },
    });
  });

  it("goes from writing through the pre-flight and sending to feedback", () => {
    let state = workshop(writingState(), { type: "edit", text: "Madame, merci." });
    state = workshop(state, { type: "preflighted", preflight: preflight("under") });
    expect(state).toMatchObject({ request: { kind: "confirming", preflight: preflight("under") } });
    state = workshop(state, { type: "sending" });
    state = workshop(state, { type: "saved", id: "sub-1", text: "Madame, merci." });
    expect(state).toMatchObject({ request: { kind: "sending" }, draft: { saved: { id: "sub-1", text: "Madame, merci." } } });
    state = workshop(state, { type: "assessed", submission: aSubmission() });
    expect(state).toMatchObject({ phase: "feedback", submission: aSubmission(), draft: { text: "Madame, merci." } });
  });

  it("goes back to the draft when the pre-flight is cancelled", () => {
    const confirming = workshop(writingState(), { type: "preflighted", preflight: preflight("near") });
    expect(workshop(confirming, { type: "cancel" })).toMatchObject({ phase: "writing", request: { kind: "idle" } });
  });

  it("keeps the text through a failure, and editing clears the failure", () => {
    let state = workshop(writingState(), { type: "edit", text: "Du texte." });
    state = workshop(state, { type: "failed", failure: "out-of-credit" });
    expect(state).toMatchObject({ draft: { text: "Du texte." }, request: { kind: "failed", failure: "out-of-credit" } });
    state = workshop(state, { type: "edit", text: "Du texte revu." });
    expect(state).toMatchObject({ draft: { text: "Du texte revu." }, request: { kind: "idle" } });
  });

  it("revises from the feedback with the same draft, and chooses another prompt from anywhere", () => {
    const feedback = workshop(workshop(writingState(), { type: "sending" }), { type: "assessed", submission: aSubmission() });
    expect(workshop(feedback, { type: "revise" })).toMatchObject({ phase: "writing", draft: { promptId: "wp-reply-01" } });
    expect(workshop(feedback, { type: "choose" })).toEqual(INITIAL_WORKSHOP);
  });

  it("reopens an assessed submission at its feedback, and an unassessed one in the editor, ready to ask again", () => {
    expect(workshop(INITIAL_WORKSHOP, { type: "reopen", submission: aSubmission(), nowMs: 5 })).toMatchObject({
      phase: "feedback",
      submission: aSubmission(),
      draft: { saved: { id: "sub-1", text: "Madame, merci." } },
    });
    const unassessed = aSubmission({ assessment: null });
    expect(workshop(INITIAL_WORKSHOP, { type: "reopen", submission: unassessed, nowMs: 5 })).toEqual({
      phase: "writing",
      draft: { promptId: "wp-reply-01", text: "Madame, merci.", startedAtMs: 5, saved: { id: "sub-1", text: "Madame, merci." } },
      request: { kind: "idle" },
    });
  });

  it("resumes feedback asked for before the screen opened as sending, so it is followed and not asked again (D143)", () => {
    const unassessed = aSubmission({ assessment: null });
    const resumed = workshop(INITIAL_WORKSHOP, { type: "resume", submission: unassessed, nowMs: 5 });

    expect(resumed).toEqual({
      phase: "writing",
      draft: { promptId: "wp-reply-01", text: "Madame, merci.", startedAtMs: 5, saved: { id: "sub-1", text: "Madame, merci." } },
      request: { kind: "sending" },
    });
    expect(workshop(resumed, { type: "assessed", submission: aSubmission() })).toMatchObject({ phase: "feedback" });
  });

  it("keeps the text fixed while its feedback is being made, so Get feedback cannot come back mid-call (D143)", () => {
    const sending = workshop(writingState(), { type: "sending" });

    expect(workshop(sending, { type: "edit", text: "autre chose" })).toBe(sending);
  });

  it("ignores an action that does not belong to the phase it arrives in", () => {
    expect(workshop(INITIAL_WORKSHOP, { type: "edit", text: "x" })).toEqual(INITIAL_WORKSHOP);
    expect(workshop(INITIAL_WORKSHOP, { type: "revise" })).toEqual(INITIAL_WORKSHOP);
    expect(workshop(INITIAL_WORKSHOP, { type: "assessed", submission: aSubmission() })).toEqual(INITIAL_WORKSHOP);
  });
});

describe("reusableSubmission", () => {
  it("reuses the last save while the text is unchanged, so a retry asks about the same submission", () => {
    const draft = { promptId: "p", text: "Même texte.", startedAtMs: 0, saved: { id: "sub-1", text: "Même texte." } };
    expect(reusableSubmission(draft)).toBe("sub-1");
  });

  it("saves anew once the text has changed, or when nothing was saved", () => {
    expect(reusableSubmission({ promptId: "p", text: "Revu.", startedAtMs: 0, saved: { id: "sub-1", text: "Avant." } })).toBeNull();
    expect(reusableSubmission({ promptId: "p", text: "Neuf.", startedAtMs: 0, saved: null })).toBeNull();
  });
});

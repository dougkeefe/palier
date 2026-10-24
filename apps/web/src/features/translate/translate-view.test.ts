import { EmptyTranslationError, MAX_TRANSLATION_CHARS, TranslationTooLongError } from "@palier/app";
import type { StudyResource, Translation } from "@palier/domain";
import { describe, expect, it } from "vitest";

import {
  type Answered,
  answerKind,
  charactersLeft,
  correctionRows,
  correctionSegments,
  editorLang,
  failureMessage,
  initialTranslator,
  isStale,
  resourceInOtherLanguage,
  resourceTitle,
  resumedTranslator,
  sourceOf,
  studyFocus,
  textProblem,
  translateFailure,
  translateRequest,
  translator,
  translatorFeedbackLang,
} from "./translate-view";

const named = (name: string) => Object.assign(new Error(name), { name });

const MINE = "Je suis allé au réunion, et les notes que j’ai rédigé sont jointes.";
const at = (words: string) => ({ start: MINE.indexOf(words), end: MINE.indexOf(words) + words.length });

const CORRECTED: Translation = {
  source: "fr",
  target: "fr",
  output: "Je suis allé à la réunion, et les notes que j’ai rédigées sont jointes.",
  strengths: ["Je suis allé"],
  corrections: [
    { ...at("rédigé"), correction: "rédigées", why: "The object comes first.", subSkill: "agreement" },
    { ...at("au réunion"), correction: "à la réunion", why: "Feminine.", subSkill: "prepositions-and-government" },
    { ...at("jointes"), correction: "ci-jointes", why: "Usage.", subSkill: "agreement" },
  ],
  notes: [],
};

const TRANSLATED: Translation = { source: "en", target: "fr", output: "Le rapport est joint.", strengths: [], corrections: [], notes: [] };

const resource = (id: string, subSkill: StudyResource["subSkill"]): StudyResource => ({
  id,
  subSkill,
  source: "oqlf",
  lang: "fr",
  title: { en: id, fr: id },
  url: `https://vitrinelinguistique.oqlf.gouv.qc.ca/${id}`,
});

describe("the request (D250)", () => {
  it("lets the translator tell the language, or names it, and always asks for French", () => {
    expect(sourceOf("detect")).toBeNull();
    expect(sourceOf("en")).toBe("en");
    expect(editorLang("detect")).toBeUndefined();
    expect(editorLang("fr")).toBe("fr");
    expect(translateRequest("  Bonjour ", "detect", "en")).toEqual({ text: "  Bonjour ", source: null, target: "fr", feedbackLang: "en" });
  });

  it("offers the button only for a text with words in it and within the limit", () => {
    expect(textProblem(" \n")).toBe("empty");
    expect(textProblem("a".repeat(MAX_TRANSLATION_CHARS))).toBeNull();
    expect(textProblem("a".repeat(MAX_TRANSLATION_CHARS + 1))).toBe("too-long");
    expect(charactersLeft("abc")).toBe(MAX_TRANSLATION_CHARS - 3);
  });
});

describe("translateFailure", () => {
  it.each([
    ["InvalidApiKeyError", "invalid-key"],
    ["RateLimitError", "out-of-credit"],
    ["ProviderTimeoutError", "timeout"],
    ["ProviderUnavailableError", "unreachable"],
    ["InvalidResponseError", "unexpected"],
    ["NoApiKeyError", "no-key"],
    ["SomethingElse", "failed"],
  ])("reads %s as %s", (name, failure) => {
    expect(translateFailure(named(name))).toBe(failure);
  });

  it("reads the use case's own refusals by name, so a minified build still says why", () => {
    expect(translateFailure(new TranslationTooLongError(MAX_TRANSLATION_CHARS + 1))).toBe("too-long");
    expect(translateFailure(new EmptyTranslationError())).toBe("empty");
    expect(translateFailure({ name: "TranslationTooLongError" })).toBe("too-long");
    expect(translateFailure("not an error")).toBe("failed");
  });

  it("has a message for every failure", () => {
    const failures = ["invalid-key", "out-of-credit", "timeout", "unreachable", "unexpected", "no-key", "too-long", "empty", "failed"] as const;
    expect(new Set(failures.map(failureMessage)).size).toBe(failures.length);
  });
});

describe("translator", () => {
  const answered: Answered = { request: translateRequest(MINE, "detect", "en"), translation: CORRECTED };
  const sending = translator(translator(initialTranslator(), { type: "edit", text: MINE }), { type: "sending" });

  it("takes an answer only while a request is out", () => {
    expect(translator(sending, { type: "answered", answered })).toEqual({ text: MINE, choice: "detect", request: { kind: "idle" }, answered });
    expect(translator(initialTranslator(), { type: "answered", answered }).answered).toBeNull();
    expect(translator(initialTranslator(), { type: "failed", failure: "timeout" }).request).toEqual({ kind: "idle" });
  });

  it("holds the text, the language and the button while a request is out, so one press pays once", () => {
    expect(translator(sending, { type: "edit", text: "autre" }).text).toBe(MINE);
    expect(translator(sending, { type: "choose", choice: "en" }).choice).toBe("detect");
    expect(translator(sending, { type: "sending" })).toBe(sending);
    expect(translator(sending, { type: "clear" })).toBe(sending);
  });

  it("keeps an answer through an edit and reads it as made for an earlier text", () => {
    const shown = translator(sending, { type: "answered", answered });
    expect(isStale(shown)).toBe(false);
    const edited = translator(shown, { type: "edit", text: `${MINE} Merci.` });
    expect(edited.answered).toBe(answered);
    expect(isStale(edited)).toBe(true);
    expect(isStale(translator(shown, { type: "choose", choice: "en" }))).toBe(true);
    expect(isStale(initialTranslator())).toBe(false);
  });

  it("clears a failure once the text changes, and clears everything on clear", () => {
    const failed = translator(sending, { type: "failed", failure: "timeout" });
    expect(failed.request).toEqual({ kind: "failed", failure: "timeout" });
    expect(translator(failed, { type: "edit", text: "x" }).request).toEqual({ kind: "idle" });
    expect(translator(failed, { type: "clear" })).toEqual(initialTranslator());
  });

  it("resumes a request still out as sending, with its own text and language", () => {
    const resumed = resumedTranslator(translateRequest("Hello.", "en", "fr"));
    expect(resumed).toEqual({ text: "Hello.", choice: "en", request: { kind: "sending" }, answered: null });
    expect(resumedTranslator(translateRequest("Bonjour.", "detect", "fr")).choice).toBe("detect");
  });
});

describe("the explanation", () => {
  it("tells a correction from a translation", () => {
    expect(answerKind(CORRECTED)).toBe("corrected");
    expect(answerKind(TRANSLATED)).toBe("translated");
  });

  it("numbers the marks over the text and the rows below alike, in reading order", () => {
    const marks = correctionSegments(MINE, CORRECTED).flatMap((s) => (s.kind === "error" ? [[s.number, s.text]] : []));
    expect(marks).toEqual([
      [1, "au réunion"],
      [2, "rédigé"],
      [3, "jointes"],
    ]);
    const rows = correctionRows(MINE, CORRECTED, []);
    expect(rows.map((r) => [r.number, r.original, r.correction.correction])).toEqual([
      [1, "au réunion", "à la réunion"],
      [2, "rédigé", "rédigées"],
      [3, "jointes", "ci-jointes"],
    ]);
  });

  it("gives each row only its own sub-skill's resources, in the file's order", () => {
    const resources = [resource("a1", "agreement"), resource("p1", "prepositions-and-government"), resource("a2", "agreement")];
    const rows = correctionRows(MINE, CORRECTED, resources);
    expect(rows.map((r) => r.resources.map((x) => x.id))).toEqual([["p1"], ["a1", "a2"], ["a1", "a2"]]);
  });

  it("lists what to study, the sub-skill with most corrections first, then by first appearance", () => {
    expect(studyFocus(CORRECTED)).toEqual(["agreement", "prepositions-and-government"]);
    expect(studyFocus(TRANSLATED)).toEqual([]);
  });
});

describe("the interface's language", () => {
  it("writes the explanations in the interface's language, French or English", () => {
    expect(translatorFeedbackLang("fr")).toBe("fr");
    expect(translatorFeedbackLang("en")).toBe("en");
  });

  it("titles a resource in the interface's language", () => {
    const page: StudyResource = { ...resource("r", "agreement"), title: { en: "Agreement", fr: "L’accord" } };
    expect(resourceTitle(page, "fr")).toBe("L’accord");
    expect(resourceTitle(page, "en")).toBe("Agreement");
  });

  it("says a resource is in the other language only when it is not the interface's", () => {
    const french = resource("r", "agreement");
    expect(resourceInOtherLanguage(french, "fr")).toBe(false);
    expect(resourceInOtherLanguage(french, "en")).toBe(true);
    expect(resourceInOtherLanguage({ ...french, lang: "en" }, "en")).toBe(false);
  });
});

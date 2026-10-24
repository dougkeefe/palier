import type { TranslateRequest } from "@palier/app";
import { MAX_TRANSLATION_CHARS } from "@palier/app";
import type { Lang, StudyResource, Translation, TranslationCorrection, WritingSubSkill } from "@palier/domain";
import type { CapState } from "@palier/engine";

import { checkFailure } from "../key/key-view";
import { feedbackLangFor } from "../oral/report-view";
import { segmentText, type TextSegment } from "../writing/inline-errors";

/**
 * The translator's decisions (progress.md D250, D251), kept out of the `.tsx` so each is tested. The left
 * text is English or French, the right is always French: English is translated for the federal public
 * service, and the user's own French comes back corrected, with what it did well and why each
 * correction was made, each linked to where to study it. It translates on a pause in typing, as Google
 * Translate does, with no button to press (D251).
 */

/**
 * How long the text must rest before it is sent (D251): the end of a burst of typing, short of a
 * mid-sentence think. Each send is a paid call on the `assess` model, whose own latency dwarfs this, so a
 * shorter pause would mostly buy calls for half-written sentences. A product rule, not an exam rule.
 */
export const TRANSLATE_PAUSE_MS = 1_500;

/** What the user says the left text is in: let the translator tell, or name it. */
export const SOURCE_CHOICES = ["detect", "en", "fr"] as const;
export type SourceChoice = (typeof SOURCE_CHOICES)[number];

/** The language practised, which the right side is always in, until the English mirror (Phase 8). */
export const TARGET_LANG: Lang = "fr";

export const sourceOf = (choice: SourceChoice): Lang | null => (choice === "detect" ? null : choice);

/** The editor's `lang`, so a screen reader and the spell checker read it right; none when unknown. */
export const editorLang = (choice: SourceChoice): Lang | undefined => sourceOf(choice) ?? undefined;

/** The request a pause makes. The text goes as typed, since corrections point into exactly it. */
export const translateRequest = (text: string, choice: SourceChoice, feedbackLang: Lang): TranslateRequest => ({
  text,
  source: sourceOf(choice),
  target: TARGET_LANG,
  feedbackLang,
});

/** The explanations' language: the interface's, French or English, as the oral report's is. */
export const translatorFeedbackLang = (locale: string): Lang => feedbackLangFor(locale);

/** A study resource's title in the interface's language. */
export const resourceTitle = (resource: StudyResource, locale: string): string =>
  feedbackLangFor(locale) === "fr" ? resource.title.fr : resource.title.en;

/** Whether a study resource is written in another language than the interface's, which its link then says. */
export const resourceInOtherLanguage = (resource: StudyResource, locale: string): boolean =>
  resource.lang !== feedbackLangFor(locale);

/** How many characters are left before the limit; negative once over it. */
export const charactersLeft = (text: string): number => MAX_TRANSLATION_CHARS - text.length;

/** Why the text is not sent yet: nothing to send, or too much. `null` when it can be. */
export const textProblem = (text: string): "empty" | "too-long" | null => {
  if (text.trim() === "") return "empty";
  return charactersLeft(text) < 0 ? "too-long" : null;
};

/** Why a translation failed, from the thrown error, as the key screen reads a failed check. */
export type TranslateFailure =
  | "invalid-key"
  | "out-of-credit"
  | "timeout"
  | "unreachable"
  | "unexpected"
  | "no-key"
  | "too-long"
  | "empty"
  | "failed";

const isNamed = (error: unknown, name: string): boolean =>
  typeof error === "object" && error !== null && (error as { name?: unknown }).name === name;

export const translateFailure = (error: unknown): TranslateFailure => {
  // The use case's own refusals, matched by name, since a production build minifies classes (D158).
  if (isNamed(error, "TranslationTooLongError")) return "too-long";
  if (isNamed(error, "EmptyTranslationError")) return "empty";
  const result = checkFailure(error);
  return result.kind === "valid" ? "failed" : result.kind;
};

/** The message key for a failure, in the `translate` namespace. */
export const failureMessage = (failure: TranslateFailure): string =>
  ({
    "invalid-key": "failInvalidKey",
    "out-of-credit": "failOutOfCredit",
    timeout: "failTimeout",
    unreachable: "failUnreachable",
    unexpected: "failUnexpected",
    "no-key": "failNoKey",
    "too-long": "failTooLong",
    empty: "failEmpty",
    failed: "failFailed",
  })[failure];

/** A translation together with the request it answered, since its offsets point into that text. */
export type Answered = { readonly request: TranslateRequest; readonly translation: Translation };

export type RequestState =
  | { readonly kind: "idle" }
  | { readonly kind: "sending" }
  | { readonly kind: "failed"; readonly failure: TranslateFailure };

export type TranslatorState = {
  readonly text: string;
  readonly choice: SourceChoice;
  readonly request: RequestState;
  readonly answered: Answered | null;
};

export type TranslatorAction =
  | { readonly type: "edit"; readonly text: string }
  | { readonly type: "choose"; readonly choice: SourceChoice }
  | { readonly type: "sending" }
  | { readonly type: "answered"; readonly answered: Answered }
  | { readonly type: "failed"; readonly failure: TranslateFailure };

const IDLE: RequestState = { kind: "idle" };

export const initialTranslator = (): TranslatorState => ({ text: "", choice: "detect", request: IDLE, answered: null });

/**
 * The screen opened while a translation it asked for earlier is still being made (D143's rule): it
 * shows that request's text as sending, and follows it rather than sending it again.
 */
export const resumedTranslator = (request: TranslateRequest): TranslatorState => ({
  text: request.text,
  choice: request.source ?? "detect",
  request: { kind: "sending" },
  answered: null,
});

/**
 * The screen's one reducer. Typing never stops (D251): the text and the language can change while a
 * request is out, and its answer still lands, carrying the request it answered, so its marks point into
 * the text that was sent. It then reads as made for an earlier text (`isStale`), and the next pause sends
 * the new one. Only one request is out at a time. An answer arriving when nothing was sent is ignored.
 * Emptying the text empties the French, as clearing Google Translate's does; that replaced D250's
 * "Start again".
 */
export const translator = (state: TranslatorState, action: TranslatorAction): TranslatorState => {
  const sending = state.request.kind === "sending";
  switch (action.type) {
    case "edit": {
      const request = state.request.kind === "failed" ? IDLE : state.request;
      return { ...state, text: action.text, request, answered: isBlank(action.text) ? null : state.answered };
    }
    case "choose":
      return { ...state, choice: action.choice };
    case "sending":
      return sending ? state : { ...state, request: { kind: "sending" } };
    case "answered":
      return sending ? { ...state, request: IDLE, answered: isBlank(state.text) ? null : action.answered } : state;
    case "failed":
      return sending ? { ...state, request: { kind: "failed", failure: action.failure } } : state;
  }
};

const isBlank = (text: string): boolean => text.trim() === "";

/**
 * Whether the answer on screen was made for a different text or language than the one now shown. Space
 * typed at the end is no change: the answer's marks still point into the same words, and the space before
 * the next word should not buy a call (D251).
 */
export const isStale = (state: TranslatorState): boolean =>
  state.answered !== null &&
  (state.answered.request.text.trimEnd() !== state.text.trimEnd() || state.answered.request.source !== sourceOf(state.choice));

/**
 * Whether a pause should send the text now (D251): it has words and is within the limit, nothing is out
 * or failed, and the French on screen is not already for it. A failure waits for the text to change, or
 * for "Try again", so a failing call is never repeated on its own.
 */
export const shouldTranslate = (state: TranslatorState): boolean =>
  textProblem(state.text) === null && state.request.kind === "idle" && (state.answered === null || isStale(state));

/**
 * Whether the screen translates on a pause (D251), from where this month would stand once one more text is
 * sent. Past the soft cap it stops and offers one press instead, D237's way: the cap never blocks, but a
 * call on every pause must not quietly run past it.
 */
export const autoTranslates = (after: CapState): boolean => after !== "over";

/** Which of the two jobs the answer did. */
export const answerKind = (translation: Translation): "corrected" | "translated" =>
  translation.source === translation.target ? "corrected" : "translated";

/** The user's text cut at each correction, numbered in reading order, as the workshop draws errors. */
export const correctionSegments = (text: string, translation: Translation): readonly TextSegment[] =>
  segmentText(
    text,
    translation.corrections.map(({ start, end, correction, why }) => ({ start, end, correction, rule: why })),
  );

/** One correction as the explanation lists it, with where to study it. */
export type CorrectionRow = {
  readonly number: number;
  readonly original: string;
  readonly correction: TranslationCorrection;
  readonly resources: readonly StudyResource[];
};

/**
 * Each correction, numbered as the marks over the text are, with its words as written and the
 * curated resources for its sub-skill, in the file's order. The library article is linked beside
 * them by sub-skill, so it is not listed here.
 */
export const correctionRows = (
  text: string,
  translation: Translation,
  resources: readonly StudyResource[],
): readonly CorrectionRow[] =>
  [...translation.corrections]
    .sort((a, b) => a.start - b.start)
    .map((correction, index) => ({
      number: index + 1,
      original: text.slice(correction.start, correction.end),
      correction,
      resources: resources.filter((resource) => resource.subSkill === correction.subSkill),
    }));

/**
 * The sub-skills the corrections touched, most corrections first, then in the order they first
 * appear: a short "what to study" summary above the details.
 */
export const studyFocus = (translation: Translation): readonly WritingSubSkill[] => {
  const counts = new Map<WritingSubSkill, number>();
  for (const correction of [...translation.corrections].sort((a, b) => a.start - b.start)) {
    counts.set(correction.subSkill, (counts.get(correction.subSkill) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([subSkill]) => subSkill);
};
